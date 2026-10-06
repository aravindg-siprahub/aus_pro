import { NextResponse } from "next/server";
import { clientKey } from "@/lib/admin/rate-limit";
import { takeVerifyAttempt } from "@/lib/authenticity/rate-limit";
import { verifySerial } from "@/lib/authenticity/service";
import { MAX_SERIAL_INPUT } from "@/lib/authenticity/serial";
import { ConfigError } from "@/lib/shopify/config";
import { validationError } from "@/lib/shopify/errors";
import { errorResponse, readJson } from "@/lib/shopify/http";
import { errorSummary, log } from "@/lib/shopify/logger";

export const dynamic = "force-dynamic";

const ROUTE = "POST /api/authenticity/verify";
const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Body: {"serial": string}. Answers 200 with a VerifyOutcome (authentic / void / not_found / invalid).
 * Never logs the serial or anything about the customer; only the outcome.
 */
export async function POST(req: Request) {
  const retryAfter = takeVerifyAttempt(clientKey(req));
  if (retryAfter) {
    log("warn", "authenticity.rate_limited", { route: ROUTE });
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes.", code: "rate_limited" },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(retryAfter) } },
    );
  }

  try {
    const body = await readJson(req, 1024);
    const serial = body && typeof body === "object" ? (body as { serial?: unknown }).serial : undefined;
    if (typeof serial !== "string" || !serial.trim()) throw validationError("Enter the serial number stamped on your piece.");
    if (serial.length > MAX_SERIAL_INPUT * 2) throw validationError("That serial number is too long.");

    const outcome = await verifySerial(serial);
    log("info", "authenticity.verify", { status: outcome.status });
    return NextResponse.json(outcome, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof ConfigError) {
      // The message names the variable that needs setting, never its value.
      log("error", "authenticity.config_error", { route: ROUTE, ...errorSummary(e) });
      return NextResponse.json(
        { error: "Verification isn't available right now.", code: "unavailable" },
        { status: 503, headers: NO_STORE },
      );
    }
    return errorResponse(e, ROUTE);
  }
}
