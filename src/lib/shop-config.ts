import type { PrintSize } from "@/types/commerce";

/**
 * Non-secret storefront settings shared by server and browser code.
 * The server computes this (see lib/commerce/server.ts) and the root layout hands it to
 * <ShopConfigSync>, which applies it before any price is rendered.
 */
export interface ShopConfig {
  provider: "mock" | "shopify";
  /** ISO 4217 code used to format every price. */
  currency: string;
  /** Extra charge for a custom print, in `currency`. */
  printSurcharge: Record<PrintSize, number>;
}

export const DEFAULT_PRINT_SURCHARGE: Record<PrintSize, number> = { small: 6, medium: 9, large: 12 };

// A store has one currency and one provider, so a process-wide value is safe here.
let current: ShopConfig = { provider: "mock", currency: "USD", printSurcharge: DEFAULT_PRINT_SURCHARGE };

export const getShopConfig = () => current;
export function setShopConfig(next: ShopConfig) {
  current = next;
}
