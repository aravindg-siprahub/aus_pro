/**
 * Admin session helpers. Web Crypto only, so the same code runs in middleware (Edge) and in
 * Node route handlers.
 *
 * The admin area exposes orders and customer data, so it is gated by ADMIN_PASSWORD. A successful
 * login sets an HttpOnly cookie holding `<expiry>.<HMAC(expiry)>`; the HMAC key is derived from the
 * password, so changing the password signs everyone out. There is no data to forge or decode in
 * the cookie, and nothing about Shopify ever goes into it.
 */
export const ADMIN_COOKIE = "atelier_admin";
export const SESSION_SECONDS = 8 * 60 * 60;
export const MIN_PASSWORD_LENGTH = 12;

type Env = Record<string, string | undefined>;

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer) {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message)));
}

/** Compares two strings without leaking where they differ. */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export type AdminAccess = "ready" | "not_configured" | "weak_password";

export function adminAccess(env: Env = process.env): AdminAccess {
  const pw = env.ADMIN_PASSWORD;
  if (!pw) return "not_configured";
  return pw.length >= MIN_PASSWORD_LENGTH ? "ready" : "weak_password";
}

export async function checkPassword(candidate: string, env: Env = process.env): Promise<boolean> {
  if (adminAccess(env) !== "ready" || typeof candidate !== "string" || candidate.length > 256) return false;
  // Compare fixed-length digests, so length and content are not observable through timing.
  const [a, b] = await Promise.all([hmac("atelier-admin-password-check", candidate), hmac("atelier-admin-password-check", env.ADMIN_PASSWORD!)]);
  return safeEqual(a, b);
}

export async function createSessionToken(env: Env = process.env, nowMs = Date.now()): Promise<string | null> {
  if (adminAccess(env) !== "ready") return null;
  const expires = Math.floor(nowMs / 1000) + SESSION_SECONDS;
  return `${expires}.${await hmac(env.ADMIN_PASSWORD!, `atelier-admin-session-v1:${expires}`)}`;
}

export async function verifySessionToken(token: string | undefined | null, env: Env = process.env, nowMs = Date.now()): Promise<boolean> {
  if (!token || adminAccess(env) !== "ready") return false;
  const m = /^(\d{1,12})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!m) return false;
  if (Number(m[1]) <= Math.floor(nowMs / 1000)) return false;
  return safeEqual(m[2], await hmac(env.ADMIN_PASSWORD!, `atelier-admin-session-v1:${m[1]}`));
}

/** Only allow redirects back into the admin area, never to another site. */
export function safeNextPath(next: string | null | undefined): string {
  return next && /^\/admin(\/[A-Za-z0-9/_\-.?=&%]*)?$/.test(next) && !next.includes("//") ? next : "/admin";
}
