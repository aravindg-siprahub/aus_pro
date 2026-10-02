import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { ADMIN_COOKIE, SESSION_SECONDS, adminAccess, checkPassword, createSessionToken, safeNextPath, verifySessionToken } from "@/lib/admin/session";
import { POST as login } from "@/app/api/admin/login/route";
import { POST as logout } from "@/app/api/admin/logout/route";
import { middleware } from "@/middleware";
import { ADMIN_PASSWORD, setTestEnv } from "./_mock";

beforeEach(() => setTestEnv());

const loginReq = (password: unknown, ip = "1.2.3.4") =>
  new Request("http://localhost/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ password }),
  });

test("access: needs a password of at least 12 characters", () => {
  assert.equal(adminAccess({}), "not_configured");
  assert.equal(adminAccess({ ADMIN_PASSWORD: "short" }), "weak_password");
  assert.equal(adminAccess({ ADMIN_PASSWORD }), "ready");
});

test("password check: right and wrong, including non-string input", async () => {
  assert.equal(await checkPassword(ADMIN_PASSWORD), true);
  assert.equal(await checkPassword(ADMIN_PASSWORD + "x"), false);
  assert.equal(await checkPassword(""), false);
  assert.equal(await checkPassword(undefined as unknown as string), false);
  assert.equal(await checkPassword("x".repeat(5000)), false);
  assert.equal(await checkPassword(ADMIN_PASSWORD, {}), false, "no password configured → nobody gets in");
});

test("session token: valid, expired, tampered, forged and password-change", async () => {
  const now = Date.now();
  const token = (await createSessionToken(process.env, now))!;
  assert.equal(await verifySessionToken(token, process.env, now + 1000), true);
  assert.equal(await verifySessionToken(token, process.env, now + (SESSION_SECONDS + 5) * 1000), false, "expires");

  const [exp, sig] = token.split(".");
  assert.equal(await verifySessionToken(`${Number(exp) + 99999}.${sig}`, process.env, now), false, "extending the expiry invalidates the signature");
  // Flip the first character to something guaranteed to differ (the last base64url char carries few bits, so avoid it).
  const flipped = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
  assert.notEqual(flipped, sig);
  assert.equal(await verifySessionToken(`${exp}.${flipped}`, process.env, now), false);
  assert.equal(await verifySessionToken("garbage", process.env, now), false);
  assert.equal(await verifySessionToken(undefined, process.env, now), false);
  assert.equal(await verifySessionToken(token, { ADMIN_PASSWORD: "a-completely-different-password" }, now), false, "changing the password signs everyone out");
  assert.equal(await verifySessionToken(token, {}, now), false);
});

test("safeNextPath only allows paths inside /admin", () => {
  assert.equal(safeNextPath("/admin/orders?x=1"), "/admin/orders?x=1");
  for (const bad of ["https://evil.com", "//evil.com", "/admin//evil.com", "/other", "/admin@evil.com", "javascript:alert(1)", null, undefined]) {
    assert.equal(safeNextPath(bad as string), "/admin", String(bad));
  }
});

test("login: correct password sets an HttpOnly, SameSite=Strict cookie that the middleware accepts", async () => {
  const res = await login(loginReq(ADMIN_PASSWORD));
  assert.equal(res.status, 200);
  const cookie = res.headers.get("set-cookie") ?? "";
  assert.ok(cookie.startsWith(`${ADMIN_COOKIE}=`));
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=strict/i);
  assert.ok(!cookie.includes(ADMIN_PASSWORD), "the cookie never contains the password");
  assert.ok(!(await res.text()).includes(ADMIN_PASSWORD));

  const value = /atelier_admin=([^;]+)/.exec(cookie)![1];
  const out = await middleware(new NextRequest("http://localhost/admin/orders", { headers: { cookie: `${ADMIN_COOKIE}=${value}` } }));
  assert.equal(out.status, 200);
  assert.equal(out.headers.get("cache-control"), "no-store");
  assert.match(out.headers.get("x-robots-tag") ?? "", /noindex/);
});

test("login: wrong password is a 401 with no hint, and repeated failures lock the client out", async () => {
  for (let i = 0; i < 5; i++) {
    const res = await login(loginReq("wrong-password-" + i));
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error, "Incorrect password.");
  }
  assert.equal((await login(loginReq("wrong-again"))).status, 429);
  assert.equal((await login(loginReq(ADMIN_PASSWORD))).status, 429, "even the right password waits out the lockout");
  assert.equal((await login(loginReq(ADMIN_PASSWORD, "9.9.9.9"))).status, 200, "other clients are unaffected");
});

test("login: unconfigured or weak admin password disables login", async () => {
  setTestEnv({ ADMIN_PASSWORD: undefined });
  assert.equal((await login(loginReq("anything-at-all-123"))).status, 503);
  setTestEnv({ ADMIN_PASSWORD: "short" });
  assert.equal((await login(loginReq("short"))).status, 503);
});

test("login: malformed bodies are rejected", async () => {
  const bad = (body: string, type = "application/json") =>
    login(new Request("http://localhost/api/admin/login", { method: "POST", headers: { "content-type": type }, body }));
  assert.equal((await bad("not json")).status, 400);
  assert.equal((await bad("{}", "text/plain")).status, 400);
  assert.equal((await bad(JSON.stringify({ password: 123 }))).status, 401);
});

test("middleware: no cookie → pages redirect to login, API returns 401", async () => {
  const page = await middleware(new NextRequest("http://localhost/admin/orders?q=1"));
  assert.equal(page.status, 307);
  const location = new URL(page.headers.get("location")!);
  assert.equal(location.pathname, "/admin/login");
  assert.equal(location.searchParams.get("next"), "/admin/orders?q=1");

  const api = await middleware(new NextRequest("http://localhost/api/admin/anything"));
  assert.equal(api.status, 401);
});

test("middleware: forged or expired cookies are refused; login and logout stay reachable", async () => {
  const forged = await middleware(new NextRequest("http://localhost/admin", { headers: { cookie: `${ADMIN_COOKIE}=9999999999.${"A".repeat(43)}` } }));
  assert.equal(forged.status, 307);
  const expired = (await createSessionToken(process.env, Date.now() - (SESSION_SECONDS + 60) * 1000))!;
  assert.equal((await middleware(new NextRequest("http://localhost/admin", { headers: { cookie: `${ADMIN_COOKIE}=${expired}` } }))).status, 307);
  assert.equal((await middleware(new NextRequest("http://localhost/admin/login"))).status, 200);
  assert.equal((await middleware(new NextRequest("http://localhost/api/admin/login", { method: "POST" }))).status, 200);
});

test("logout clears the cookie", async () => {
  const res = await logout();
  assert.match(res.headers.get("set-cookie") ?? "", /atelier_admin=;.*Max-Age=0/i);
});
