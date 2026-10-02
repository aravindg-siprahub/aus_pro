import type { CartItem, Customization, Product, Size } from "@/types/commerce";
import { unitPriceFor } from "@/lib/pricing";

export function findVariant(product: Product, colorId: string, size: Size) {
  return product.variants.find((v) => v.colorId === colorId && v.size === size);
}

export function buildCartItem(
  product: Product,
  colorId: string,
  size: Size,
  quantity = 1,
  customization?: Customization,
): Omit<CartItem, "id"> {
  const color = product.colors.find((c) => c.id === colorId) ?? product.colors[0];
  const variant = findVariant(product, color.id, size)!;
  const custom = customization && customization.text.trim() ? { ...customization, text: customization.text.trim() } : undefined;
  return {
    productId: product.id,
    productSlug: product.slug,
    title: product.name,
    category: product.category,
    variantId: variant.id,
    colorId: color.id,
    colorName: color.name,
    colorHex: color.hex,
    size,
    quantity,
    unitPrice: unitPriceFor(variant.price, custom?.printSize, !!custom),
    customization: custom,
  };
}
