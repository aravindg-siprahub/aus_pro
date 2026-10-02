"use client";

import { setShopConfig, type ShopConfig } from "@/lib/shop-config";

/**
 * Applies the server's non-secret store settings (currency, print prices, provider) before any
 * price renders. Rendered first in <body>, so it runs before the components below it, during
 * both server rendering and hydration. It renders nothing.
 */
export function ShopConfigSync({ config }: { config: ShopConfig }) {
  setShopConfig(config);
  return null;
}
