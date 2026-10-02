import { NextResponse } from "next/server";
import { ADMIN_COOKIE, SESSION_SECONDS, adminAccess, checkPassword, createSessionToken } from "@/lib/admin/session";
import { clearFailures, clientKey, isLockedOut, recordFailure } from "@/lib/admin/rate-limit";
import { readJson } from "@/lib/shopify/http";
import { log } from "@/lib/shopify/logger";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function POST(req: Request) {
  const access = adminAccess();
  if (access !== "ready") {
    return NextResponse.json(
      { error: access === "weak_password" ? "ADMIN_PASSWORD must be at least 12 characters." : "Admin access isn't configured. Set ADMIN_PASSWORD." },
      { status: 503, headers },
    );
  }

  const key = clientKey(req);
  if (isLockedOut(key)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429, headers });
  }

  let password: unknown;
  try {
    password = ((await readJson(req, 2048)) as { password?: unknown }).password;
  } catch {
    return NextResponse.json({ error: "That request wasn't valid." }, { status: 400, headers });
  }

  if (typeof password !== "string" || !(await checkPassword(password))) {
    recordFailure(key);
    log("warn", "admin.login_failed");
    return NextResponse.json({ error: "Incorrect password." }, { status: 401, headers });
  }

  clearFailures(key);
  const token = (await createSessionToken())!;
  const res = NextResponse.json({ ok: true }, { headers });
  const secure = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  res.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: "strict", secure, path: "/", maxAge: SESSION_SECONDS });
  log("info", "admin.login");
  return res;
}
