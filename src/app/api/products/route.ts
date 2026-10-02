import { NextResponse } from "next/server";
import { getCommerce } from "@/lib/commerce/server";
import { errorResponse } from "@/lib/shopify/http";

export const dynamic = "force-dynamic";

/** Product search for the browser (the header search overlay). */
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams.get("q")?.slice(0, 80);
    const products = await getCommerce().listProducts({ query: q || undefined });
    return NextResponse.json({ products }, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch (e) {
    return errorResponse(e, "GET /api/products");
  }
}
