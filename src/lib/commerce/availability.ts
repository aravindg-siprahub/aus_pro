import type { Product, Size } from "@/types/commerce";

export type Availability = { status: "in_stock" | "limited" | "sold_out"; label: string };

/**
 * Stock for a product, or for one of its colours. Shopify only tells the storefront whether each variant can be
 * sold, so this is about sizes on offer, not unit counts: every size available, some, or none.
 */
export function availabilityOf(product: Product, colorId?: string): Availability {
  const variants = colorId ? product.variants.filter((v) => v.colorId === colorId) : product.variants;
  const open = variants.filter((v) => v.available).length;
  if (open === 0) return { status: "sold_out", label: "Sold out" };
  if (open < variants.length) return { status: "limited", label: "Limited sizes" };
  return { status: "in_stock", label: "In stock" };
}

const ORDER: Size[] = ["XS", "S", "M", "L", "XL", "XXL"];

/** "XS–XXL" for a run of sizes, "S · M · XL" when there are gaps, the size itself when there is one. */
export function sizeRange(sizes: Size[]): string {
  const sorted = [...new Set(sizes)].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  if (sorted.length === 0) return "";
  if (sorted.length === 1) return sorted[0];
  const first = ORDER.indexOf(sorted[0]);
  const contiguous = sorted.every((s, i) => ORDER.indexOf(s) === first + i);
  return contiguous && sorted.length > 2 ? `${sorted[0]}–${sorted[sorted.length - 1]}` : sorted.join(" · ");
}
