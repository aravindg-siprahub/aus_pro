import { NextResponse } from "next/server";
import { ShopifyCommerceProvider } from "@/lib/commerce/shopify-provider";
import { getProviderMode } from "@/lib/commerce/server";
import { errorResponse, readJson } from "@/lib/shopify/http";
import { parseCheckoutRequest } from "@/lib/shopify/validation";

export const dynamic = "force-dynamic";

/**
 * Starts checkout. With Shopify this creates a draft order from the validated bag (re-priced on
 * the server) and returns Shopify's hosted payment link. In mock mode it tells the browser to run
 * the local mock flow instead.
 */
export async function POST(req: Request) {
  try {
    if (getProviderMode() !== "shopify") {
      return NextResponse.json({ mode: "mock" }, { headers: { "Cache-Control": "no-store" } });
    }
    const request = parseCheckoutRequest(await readJson(req));
    const result = await new ShopifyCommerceProvider().createCheckout(request);
    if (result.type !== "redirect") throw new Error("unexpected checkout result");
    return NextResponse.json({ mode: "shopify", url: result.url, orderRef: result.orderRef }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e, "POST /api/checkout");
  }
}
