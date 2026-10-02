import type { CommerceProvider } from "./provider";
import { MockCommerceProvider } from "./mock-provider";
import { ShopifyCommerceProvider } from "./shopify-provider";
import { resolveProviderMode, getShopifyConfig } from "@/lib/shopify/config";
import { errorSummary, log } from "@/lib/shopify/logger";
import { DEFAULT_PRINT_SURCHARGE, type ShopConfig } from "@/lib/shop-config";
import { getHomeMedia as getShopifyHomeMedia } from "@/lib/shopify/home-media";
import type { HomeMedia } from "@/types/commerce";

/**
 * Server-side composition root. Server components and API routes get their provider here;
 * browser code never imports this file (it reaches the server through /api routes).
 * Mock data is used only when configured: a Shopify outage is reported, not hidden behind fake products.
 */
export function getProviderMode() {
  return resolveProviderMode();
}

export function getCommerce(): CommerceProvider {
  return resolveProviderMode() === "shopify" ? new ShopifyCommerceProvider() : new MockCommerceProvider();
}

/** Non-secret settings the UI needs (currency, print prices, which provider is active). */
export async function getPublicShopConfig(): Promise<ShopConfig> {
  if (resolveProviderMode() !== "shopify") {
    return { provider: "mock", currency: "USD", printSurcharge: DEFAULT_PRINT_SURCHARGE };
  }
  const cfg = getShopifyConfig();
  let currency = "USD";
  try {
    currency = (await new ShopifyCommerceProvider().getShopInfo()).currencyCode;
  } catch (e) {
    // Keep pages rendering; the catalogue call on the page reports the real failure.
    log("error", "shop_config.currency_unavailable", errorSummary(e));
  }
  return { provider: "shopify", currency, printSurcharge: cfg.printSurcharge };
}

/** Home page photos from Shopify Files. The mock catalogue has none and keeps its illustrations. */
export async function getHomeMedia(): Promise<HomeMedia> {
  return resolveProviderMode() === "shopify" ? getShopifyHomeMedia() : {};
}
