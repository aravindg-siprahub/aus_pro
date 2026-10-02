import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin/session";

/**
 * Everything under /admin and /api/admin requires a valid admin session, except the login
 * page and login/logout endpoints. Pages also re-check the session on the server (see
 * lib/admin/require-admin.ts), so this is one of two independent layers.
 */
const PUBLIC = new Set(["/admin/login", "/api/admin/login", "/api/admin/logout"]);

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  let res: NextResponse;

  if (PUBLIC.has(pathname) || (await verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value))) {
    res = NextResponse.next();
  } else if (isApi) {
    res = NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  } else {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    res = NextResponse.redirect(url);
  }

  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
