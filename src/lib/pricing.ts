import type { CartItem, OrderTotals, PrintSize } from "@/types/commerce";
import { getShopConfig } from "@/lib/shop-config";

// Used only by the mock checkout. With Shopify, shipping and taxes are calculated by Shopify at checkout.
export const FREE_SHIPPING_THRESHOLD = 100;
export const STANDARD_SHIPPING = 8;

/** Prices render in the store's currency (see ShopConfig). */
export const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: getShopConfig().currency,
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);

export const formatDate = (iso: string, opts?: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleDateString("en-US", opts ?? { weekday: "short", month: "short", day: "numeric" });

/**
 * Unit price including the custom-print surcharge. The server passes its own `surcharge`
 * explicitly so it never depends on browser-supplied values.
 */
export function unitPriceFor(
  base: number,
  printSize?: PrintSize,
  hasText = true,
  surcharge: Record<PrintSize, number> = getShopConfig().printSurcharge,
) {
  const total = base + (printSize && hasText ? surcharge[printSize] : 0);
  return Math.round(total * 100) / 100;
}

/** "Calculated at checkout" while Shopify owns shipping; otherwise the amount, or "Free". */
export function shippingLabel(shipping: number, calculatedAtCheckout = getShopConfig().provider === "shopify") {
  if (calculatedAtCheckout) return "Calculated at checkout";
  return shipping === 0 ? "Free" : formatPrice(shipping);
}

export function cartTotals(items: CartItem[]): OrderTotals {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  if (getShopConfig().provider === "shopify") {
    // Shopify computes shipping and tax on its hosted checkout; don't show a number we'd have to guess.
    return { subtotal, shipping: 0, total: subtotal };
  }
  const shipping = items.length === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
  return { subtotal, shipping, total: subtotal + shipping };
}
