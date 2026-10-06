import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { POST as postVerify } from "@/app/api/authenticity/verify/route";
import { checkMatches, issueSerial, parseSerial, serialCheck } from "@/lib/authenticity/serial";
import { resetVerifyRateLimit, VERIFY_MAX_ATTEMPTS } from "@/lib/authenticity/rate-limit";
import { demoSerial, splitVariantTitle, verifySerial } from "@/lib/authenticity/service";
import { authenticityKeyOrNull } from "@/lib/authenticity/key";
import { FAKE, captureLogs, gql, isGraphQL, isTokenCall, json, mockFetch, setTestEnv, tokenResponse } from "./_mock";

/** A test fixture, not a real key. */
const SECRET = "authenticity-test-secret-do-not-use-000000";
const PRIVATE = ["Sam Rivera", "sam@example.com", "1 Test Lane", "+1 555 0100", "4321.00", "gid://shopify/Order/", "Austin"];

let restore: () => void = () => {};
let logs: ReturnType<typeof captureLogs>;
let ip = 0;

beforeEach(() => {
  setTestEnv({ AUTHENTICITY_SECRET: SECRET });
  resetVerifyRateLimit();
  logs = captureLogs();
});
afterEach(() => {
  restore();
  restore = () => {};
  logs.restore();
  delete process.env.AUTHENTICITY_SECRET;
});

const post = (body: unknown, opts: { ip?: string; contentType?: string } = {}) =>
  new Request("http://localhost/api/authenticity/verify", {
    method: "POST",
    headers: { "content-type": opts.contentType ?? "application/json", "x-forwarded-for": opts.ip ?? `10.0.0.${++ip}` },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

/** An order as the Admin API returns it, including fields we must never echo (in case Shopify over-returns). */
const rawOrder = (over: Record<string, unknown> = {}) => ({
  name: "#1001",
  createdAt: "2026-05-02T10:11:12Z",
  cancelledAt: null,
  id: "gid://shopify/Order/555",
  email: "sam@example.com",
  customer: { displayName: "Sam Rivera" },
  shippingAddress: { address1: "1 Test Lane", city: "Austin", phone: "+1 555 0100" },
  currentTotalPriceSet: { shopMoney: { amount: "4321.00", currencyCode: "INR" } },
  lineItems: {
    nodes: [
      {
        title: "Classic Premium T-Shirt",
        variantTitle: "Black / M",
        quantity: 2,
        product: { handle: "classic-premium-t-shirt" },
        image: { url: "https://cdn.shopify.com/s/files/1/tee.jpg", altText: "Classic tee in Black" },
        customAttributes: [
          { key: "Custom text", value: "Since day one" },
          { key: "Font", value: "Editorial" },
          { key: "Text colour", value: "White (#ffffff)" },
          { key: "Print size", value: "Medium" },
          { key: "Placement", value: "Front" },
          { key: "_customization", value: "{\"text\":\"Since day one\"}" },
        ],
      },
      {
        title: "Essential Polo Shirt",
        variantTitle: "Navy / L",
        quantity: 1,
        product: null,
        image: { url: "https://evil.example.com/x.jpg", altText: null },
        customAttributes: [],
      },
    ],
  },
  ...over,
});

function shopify(orders: unknown[]) {
  const m = mockFetch((c) => {
    if (isTokenCall(c)) return tokenResponse();
    if (isGraphQL(c) && /query\s+AuthenticityOrder/.test(gql(c).query)) return json({ data: { orders: { nodes: orders } } });
    throw new Error("unexpected call");
  });
  restore = m.restore;
  return m;
}

const assertPrivate = (text: string) => {
  for (const s of [...PRIVATE, SECRET, FAKE.clientSecret, FAKE.token]) assert.ok(!text.includes(s), `leaked ${s}`);
};

/* ── Serial format ── */

test("issue → parse → verify round-trips", () => {
  const serial = issueSerial("#1001", 1, SECRET)!;
  assert.match(serial, /^WH-1001-1-[0-9A-HJKMNP-TV-Z]{6}$/);
  const parsed = parseSerial(serial)!;
  assert.deepEqual([parsed.orderDigits, parsed.lineNo, parsed.canonical], ["1001", 1, serial]);
  assert.ok(checkMatches(parsed, SECRET));
  assert.ok(!checkMatches(parsed, `${SECRET}-other`), "another key does not verify");
  assert.notEqual(serialCheck("1001", 1, SECRET), serialCheck("1001", 2, SECRET));
  assert.equal(issueSerial("1001", 51, SECRET), null);
  assert.equal(issueSerial("#", 1, SECRET), null);
});

test("normalises case, spaces and typographic dashes; dashes are required", () => {
  const serial = issueSerial("1001", 12, SECRET)!;
  const lower = ` ${serial.toLowerCase().replace(/-/g, " - ")} `;
  assert.equal(parseSerial(lower)?.canonical, serial);
  assert.equal(parseSerial(serial.replace(/-/g, "–"))?.canonical, serial);
  assert.equal(parseSerial(serial.replace(/-/g, "")), null);
});

test("look-alikes map in the check group only", () => {
  const p = parseSerial("WH-1001-1-OILOIL")!;
  assert.equal(p.check, "011011");
  assert.equal(parseSerial("WH-1OO1-1-ABCDEF"), null, "letters in the order group are not forgiven");
  assert.equal(parseSerial("WH-1001-1-ABCDEU"), null, "U is not a Crockford character");
});

test("malformed inputs are rejected", () => {
  for (const bad of ["", "WH", "WH-1001-1", "B9-1001-1-ABCDEF", "WH-01001-1-ABCDEF", "WH-1001-0-ABCDEF", "WH-1001-51-ABCDEF",
    "WH-12345678901-1-ABCDEF", "WH-1001-1-ABCDE", "WH-1001-1-ABCDEFG", "WH-1001-1-ABC$EF", "x".repeat(200)]) {
    assert.equal(parseSerial(bad), null, bad);
  }
});

test("variant titles split into colour and size", () => {
  assert.deepEqual(splitVariantTitle("Black / M"), { colour: "Black", size: "M" });
  assert.deepEqual(splitVariantTitle("XXL / Beige"), { colour: "Beige", size: "XXL" });
  assert.deepEqual(splitVariantTitle("Default Title"), { colour: null, size: null });
  assert.deepEqual(splitVariantTitle(null), { colour: null, size: null });
});

/* ── Shopify mode ── */

test("authentic: describes the piece and nothing about the customer", async () => {
  const m = shopify([rawOrder({ name: "#10010" }), rawOrder()]);
  const serial = issueSerial("1001", 1, SECRET)!;
  const res = await postVerify(post({ serial: serial.toLowerCase() }));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const text = await res.text();
  assertPrivate(text);
  const body = JSON.parse(text);
  assert.equal(body.status, "authentic");
  assert.equal(body.serial, serial);
  assert.deepEqual(body.piece, {
    product: "Classic Premium T-Shirt",
    productHandle: "classic-premium-t-shirt",
    colour: "Black",
    size: "M",
    quantity: 2,
    issuedAt: "2026-05-02",
    image: { url: "https://cdn.shopify.com/s/files/1/tee.jpg", alt: "Classic tee in Black" },
    print: { text: "Since day one", typeface: "Editorial", placement: "Front", size: "Medium", ink: "White (#ffffff)" },
  });
  const q = gql(m.calls.find(isGraphQL)!);
  assert.equal(q.variables.query, "name:#1001 OR name:1001");
  assert.doesNotMatch(q.query, /email|customer|address|phone|price|total/i, "the query asks for no private fields");
  assertPrivate(logs.lines.join("\n"));
});

test("a non-CDN image is dropped and a plain line has no print", async () => {
  shopify([rawOrder()]);
  const body = await (await postVerify(post({ serial: issueSerial("1001", 2, SECRET) }))).json();
  assert.equal(body.status, "authentic");
  assert.equal(body.piece.image, null);
  assert.equal(body.piece.print, null);
  assert.equal(body.piece.productHandle, null);
});

test("void: the order was cancelled", async () => {
  shopify([rawOrder({ cancelledAt: "2026-05-03T00:00:00Z" })]);
  const res = await postVerify(post({ serial: issueSerial("1001", 1, SECRET) }));
  assert.deepEqual(await res.json(), { status: "void" });
});

test("not_found: a valid check but no such order or line", async () => {
  shopify([rawOrder({ name: "#10011" })]);
  assert.deepEqual(await (await postVerify(post({ serial: issueSerial("1001", 1, SECRET) }))).json(), { status: "not_found" });
  restore();
  shopify([rawOrder()]);
  assert.deepEqual(await (await postVerify(post({ serial: issueSerial("1001", 3, SECRET) }))).json(), { status: "not_found" });
});

test("a bad check makes zero Shopify calls", async () => {
  const m = shopify([rawOrder()]);
  const good = issueSerial("1001", 1, SECRET)!;
  const tampered = good.slice(0, -1) + (good.endsWith("0") ? "1" : "0");
  for (const serial of [tampered, "WH-1001-1-ZZZZZZ", "not a serial"]) {
    const res = await postVerify(post({ serial }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "invalid" });
  }
  assert.equal(m.calls.length, 0);
});

test("missing or short secret: 503 with a fixed message; the log names the variable, not a value", async () => {
  for (const value of [undefined, "too-short"]) {
    if (value === undefined) delete process.env.AUTHENTICITY_SECRET;
    else process.env.AUTHENTICITY_SECRET = value;
    const m = shopify([rawOrder()]);
    const res = await postVerify(post({ serial: "WH-1001-1-ABCDEF" }));
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { error: "Verification isn't available right now.", code: "unavailable" });
    assert.equal(m.calls.length, 0);
    restore();
  }
  const logged = logs.lines.join("\n");
  assert.match(logged, /AUTHENTICITY_SECRET/);
  assert.ok(!logged.includes("too-short"));
  assert.equal(authenticityKeyOrNull(), null);
});

test("the secret never appears in responses or logs", async () => {
  shopify([rawOrder()]);
  await postVerify(post({ serial: issueSerial("1001", 1, SECRET) }));
  await postVerify(post({ serial: "WH-1001-1-ABCDEF" }));
  assertPrivate(logs.lines.join("\n"));
});

test("Shopify failures surface as a generic store error", async () => {
  const m = mockFetch((c) => (isTokenCall(c) ? tokenResponse() : json({ errors: [{ message: "boom", extensions: { code: "INTERNAL" } }] })));
  restore = m.restore;
  const res = await postVerify(post({ serial: issueSerial("1001", 1, SECRET) }));
  assert.equal(res.status, 502);
  assert.equal((await res.json()).code, "graphql");
});

/* ── Route hygiene ── */

test("400 on a bad body", async () => {
  const m = shopify([]);
  for (const req of [post({}), post({ serial: 42 }), post({ serial: "   " }), post("not json{"), post({ serial: "x" }, { contentType: "text/plain" }), post({ serial: "A".repeat(2000) })]) {
    const res = await postVerify(req);
    assert.equal(res.status, 400);
    assert.equal(res.headers.get("cache-control"), "no-store");
  }
  assert.equal(m.calls.length, 0);
});

test("429 after the limit, per client, with Retry-After", async () => {
  shopify([]);
  for (let i = 0; i < VERIFY_MAX_ATTEMPTS; i++) {
    assert.equal((await postVerify(post({ serial: "WH-1-1-AAAAAA" }, { ip: "203.0.113.9" }))).status, 200);
  }
  const res = await postVerify(post({ serial: "WH-1-1-AAAAAA" }, { ip: "203.0.113.9" }));
  assert.equal(res.status, 429);
  assert.equal((await res.json()).code, "rate_limited");
  assert.ok(Number(res.headers.get("retry-after")) > 0);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal((await postVerify(post({ serial: "WH-1-1-AAAAAA" }, { ip: "203.0.113.10" }))).status, 200, "other clients are unaffected");
});

/* ── Demo mode ── */

test("demo mode: one sample piece, flagged demo, no Shopify and no secret needed", async () => {
  setTestEnv({ COMMERCE_PROVIDER: "mock" });
  delete process.env.AUTHENTICITY_SECRET;
  const m = mockFetch(() => new Error("no network in demo mode"));
  restore = m.restore;
  const serial = demoSerial()!;
  assert.match(serial, /^WH-1001-1-/);
  const ok = await verifySerial(serial);
  assert.equal(ok.status, "authentic");
  assert.ok(ok.status === "authentic" && ok.piece.demo === true && ok.piece.productHandle === "essential-crew-tee");
  assert.deepEqual(await verifySerial("WH-1001-1-ZZZZZZ"), { status: "invalid" });
  assert.equal(m.calls.length, 0);

  setTestEnv({ AUTHENTICITY_SECRET: SECRET });
  assert.equal(demoSerial(), null, "no demo hint in Shopify mode");
  assert.equal((await verifySerial(serial)).status, "invalid", "the demo serial never verifies against a real store");
});
