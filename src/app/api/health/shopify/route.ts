import { NextResponse } from "next/server";
import { getProviderMode } from "@/lib/commerce/server";
import { verifyShopifyConnection, type ShopifyHealth } from "@/lib/commerce/shopify-health";
import { errorResponse } from "@/lib/shopify/http";

export const dynamic = "force-dynamic";

const CACHE_MS = 30_000;
let last: { at: number; value: ShopifyHealth } | null = null;

/**
 * Public liveness check for monitoring: token exchange, shop read and catalogue read must all work
 * and the app must hold its required permissions. It answers only ok / not ok. The detailed view
 * (shop, permissions, errors) is behind the admin login at /admin/connection.
 * Results are cached for 30 seconds so this endpoint can't be used to hammer the Admin API.
 */
export async function GET() {
  try {
    if (getProviderMode() !== "shopify") {
      return NextResponse.json({ ok: true, provider: "mock" }, { headers: { "Cache-Control": "no-store" } });
    }
    if (!last || Date.now() - last.at > CACHE_MS) last = { at: Date.now(), value: await verifyShopifyConnection() };
    const { ok } = last.value;
    return NextResponse.json({ provider: "shopify", ok }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e, "GET /api/health/shopify");
  }
}
