import { NextResponse } from "next/server";
import { ConfigError } from "./config";
import { ShopifyError } from "./errors";
import { errorSummary, log } from "./logger";

/**
 * Turns any thrown value into a response that is safe to show a customer.
 * Details go to the server log only; the body is a fixed message and a coarse code.
 */
export function errorResponse(e: unknown, route: string) {
  if (e instanceof ShopifyError) {
    if (e.kind !== "validation") log("error", "route.error", { route, kind: e.kind, ...errorSummary(e) });
    return NextResponse.json({ error: e.userMessage, code: e.kind }, { status: e.httpStatus, headers: { "Cache-Control": "no-store" } });
  }
  if (e instanceof ConfigError) {
    log("error", "route.config_error", { route, ...errorSummary(e) });
    return NextResponse.json({ error: "The store isn't configured yet.", code: "config" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  log("error", "route.unexpected", { route, ...errorSummary(e) });
  return NextResponse.json({ error: "Something went wrong. Please try again.", code: "internal" }, { status: 500, headers: { "Cache-Control": "no-store" } });
}

/** Reads a small JSON body, refusing anything oversized or of the wrong type. */
export async function readJson(req: Request, maxBytes = 64 * 1024): Promise<unknown> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new ShopifyError("validation", "wrong content type", "Unsupported request.");
  }
  const raw = await req.text();
  if (raw.length > maxBytes) throw new ShopifyError("validation", "body too large", "That request was too large.");
  try {
    return JSON.parse(raw);
  } catch {
    throw new ShopifyError("validation", "invalid json", "That request wasn't valid.");
  }
}
