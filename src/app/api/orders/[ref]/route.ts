import { NextResponse } from "next/server";
import { ShopifyCommerceProvider } from "@/lib/commerce/shopify-provider";
import { getProviderMode } from "@/lib/commerce/server";
import { ShopifyError } from "@/lib/shopify/errors";
import { errorResponse } from "@/lib/shopify/http";

export const dynamic = "force-dynamic";

/** Looks up an order by its signed reference. A forged or altered reference is indistinguishable from "not found". */
export async function GET(_req: Request, { params }: { params: Promise<{ ref: string }> }) {
  try {
    if (getProviderMode() !== "shopify") throw new ShopifyError("not_found", "no shopify provider");
    const { ref } = await params;
    const order = await new ShopifyCommerceProvider().getOrder(ref);
    if (!order) throw new ShopifyError("not_found", "unknown order reference");
    return NextResponse.json({ order }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e, "GET /api/orders/[ref]");
  }
}
