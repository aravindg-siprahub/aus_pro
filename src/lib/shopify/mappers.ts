import type { CartItem, CategoryId, Customization, Product, ProductColor, ProductImage, Size, Variant } from "@/types/commerce";
import { CARE, DELIVERY, categoryName } from "@/lib/commerce/mock-data";
import { buildLineId } from "@/features/cart/line-id";
import { unitPriceFor } from "@/lib/pricing";
import type { PrintSize } from "@/types/commerce";
import { log } from "./logger";

/* ── Raw shapes returned by the queries in queries.ts ── */
export interface RawSelectedOption { name: string; value: string }
export interface RawImage { url: string; altText: string | null; width?: number | null; height?: number | null }
/** A media node: MediaImage carries `image`; other media types arrive as `{}`. */
export interface RawMedia { image?: RawImage | null }
export interface RawVariant {
  id: string;
  price: string;
  availableForSale: boolean;
  selectedOptions: RawSelectedOption[];
  media?: { nodes: RawMedia[] };
}
export interface RawProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  productType: string;
  tags: string[];
  status: string;
  options: { name: string; values: string[] }[];
  material?: { value: string } | null;
  fit?: { value: string } | null;
  media?: { nodes: RawMedia[] };
  variants: { nodes: RawVariant[] };
}
export interface RawVariantWithProduct extends RawVariant {
  /** Sellable stock, when Shopify tracks it. */
  inventoryQuantity?: number | null;
  /** "DENY" refuses orders beyond stock; "CONTINUE" allows overselling. */
  inventoryPolicy?: string;
  product: Pick<RawProduct, "id" | "handle" | "title" | "productType" | "tags" | "status" | "options">;
}

/* ── Colour, size and category conventions ── */
const SIZES: Size[] = ["XS", "S", "M", "L", "XL", "XXL"];

/** Shopify has no swatch colour, so known colour names map to a display hex. Unknown names get a neutral. */
const COLOR_HEX: Record<string, string> = {
  onyx: "#222225", black: "#222225", white: "#f2f1ee", chalk: "#f2f1ee", stone: "#cbc4b8", sage: "#9aa592",
  midnight: "#243050", navy: "#243050", clay: "#b9775a", grey: "#9a9a9a", gray: "#9a9a9a", charcoal: "#3c3c3f",
  cream: "#efe8d8", beige: "#d9ccb4", sand: "#d8c8a8", olive: "#6b6e45", green: "#4f7a5a", red: "#b3372d",
  maroon: "#6d2230", blue: "#2f5da8", pink: "#e3b5b9", yellow: "#e0b83a", orange: "#d9742b", purple: "#6c4f9c", brown: "#6e4a32",
};
const NEUTRAL_HEX = "#cbc4b8";

export const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "default";

export function normalizeSize(value: string): Size | null {
  const v = value.trim().toUpperCase().replace(/^2XL$/, "XXL");
  return (SIZES as string[]).includes(v) ? (v as Size) : null;
}

/** Explicit tag `category:polo` wins; otherwise infer from the product type. */
export function categoryOf(productType: string, tags: string[]): CategoryId | null {
  const tag = tags.find((t) => t.toLowerCase().startsWith("category:"))?.slice(9).trim().toLowerCase();
  const text = (tag || productType).toLowerCase();
  if (/polo/.test(text)) return "polo";
  if (/hood/.test(text)) return "hoodie";
  if (/oversized|boxy|drop/.test(text)) return "oversized";
  if (/round|crew|t-?shirt|tee/.test(text)) return "round-neck";
  return null;
}

const findOption = <T extends { name: string }>(options: T[], pattern: RegExp) => options.find((o) => pattern.test(o.name));
const optionValue = (opts: RawSelectedOption[], pattern: RegExp) => findOption(opts, pattern)?.value;

export function colorFor(name: string): ProductColor {
  return { id: slugify(name), name, hex: COLOR_HEX[name.trim().toLowerCase()] ?? NEUTRAL_HEX };
}

/** Convert a Shopify product to the app's Product. Returns null when it can't be sold through this storefront. */
export function mapProduct(raw: RawProduct): Product | null {
  if (raw.status !== "ACTIVE") return null;
  const category = categoryOf(raw.productType, raw.tags);
  if (!category) {
    log("warn", "mapper.skip_product", { handle: raw.handle, reason: "no category (set product type or a category:<name> tag)" });
    return null;
  }
  if (!findOption(raw.options, /^size$/i)) {
    log("warn", "mapper.skip_product", { handle: raw.handle, reason: "no Size option" });
    return null;
  }

  const colorOption = findOption(raw.options, /^colou?r$/i);
  const colorNames = colorOption ? colorOption.values : ["Default"];
  const colors = colorNames.map(colorFor);

  const variants: Variant[] = [];
  for (const v of raw.variants.nodes) {
    const size = normalizeSize(optionValue(v.selectedOptions, /^size$/i) ?? "");
    const price = Number.parseFloat(v.price);
    if (!size || !Number.isFinite(price)) continue;
    const colorName = colorOption ? optionValue(v.selectedOptions, /^colou?r$/i) : "Default";
    if (!colorName) continue;
    variants.push({ id: v.id, productId: raw.id, colorId: slugify(colorName), size, price, available: v.availableForSale });
  }
  if (variants.length === 0) return null;

  const images = mapImages(raw.media?.nodes ?? [], raw.title, colorNames);
  // A colour's photo is the first image attached to any of its variants.
  const colorImage = new Map<string, string>();
  for (const v of raw.variants.nodes) {
    const url = v.media?.nodes.find((m) => m.image?.url)?.image?.url;
    const colorName = colorOption ? optionValue(v.selectedOptions, /^colou?r$/i) : "Default";
    if (url && colorName && !colorImage.has(slugify(colorName))) colorImage.set(slugify(colorName), url);
  }

  const usedColors = colors
    .filter((c) => variants.some((v) => v.colorId === c.id))
    .map((c) => (colorImage.has(c.id) ? { ...c, imageUrl: colorImage.get(c.id) } : c));
  // A variant's photo shows that colour, even if its alt text doesn't say so.
  for (const img of images) {
    const owner = [...colorImage].find(([, url]) => url === img.url)?.[0];
    if (owner && !img.colorId) img.colorId = owner;
  }
  const sizes = SIZES.filter((s) => variants.some((v) => v.size === s));
  const badge = raw.tags.find((t) => t.toLowerCase().startsWith("badge:"))?.slice(6).trim();
  const firstSentence = raw.description.split(/(?<=[.!?])\s|\n/)[0]?.trim() ?? "";

  return {
    id: raw.id,
    slug: raw.handle,
    name: raw.title,
    category,
    tagline: firstSentence.length > 0 && firstSentence.length <= 90 ? firstSentence : categoryName(category),
    description: raw.description || raw.title,
    basePrice: Math.min(...variants.map((v) => v.price)),
    colors: usedColors,
    sizes,
    variants,
    details: {
      material: raw.material?.value || "See the product description.",
      fit: raw.fit?.value || "True to size.",
      delivery: DELIVERY,
      care: CARE,
    },
    badge: badge || undefined,
    images,
  };
}

/**
 * Product photos in Shopify's order, skipping non-image media and duplicates. Only Shopify CDN URLs are kept.
 * Alt text tells us the side and colour: "Essential Polo Shirt in Navy, back view" is the Navy back photo.
 */
export function mapImages(nodes: RawMedia[], productTitle: string, colorNames: string[] = []): ProductImage[] {
  const seen = new Set<string>();
  const out: ProductImage[] = [];
  for (const n of nodes) {
    const img = n?.image;
    if (!img?.url || seen.has(img.url) || !isShopifyCdn(img.url)) continue;
    seen.add(img.url);
    const alt = img.altText?.trim() || productTitle;
    const words = ` ${alt.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
    const hasWord = (w: string) => words.includes(` ${w.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `);
    const named = colorNames.find(hasWord);
    out.push({
      url: img.url,
      alt,
      width: img.width ?? null,
      height: img.height ?? null,
      view: hasWord("back") ? "back" : "front",
      ...(named ? { colorId: slugify(named) } : {}),
    });
  }
  return out;
}

export function isShopifyCdn(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "cdn.shopify.com";
  } catch {
    return false;
  }
}

/** Build a cart line from a Shopify variant, pricing it on the server (never from client input). */
export function lineFromVariant(
  v: RawVariantWithProduct,
  quantity: number,
  customization: Customization | undefined,
  surcharge: Record<PrintSize, number>,
): CartItem | null {
  const category = categoryOf(v.product.productType, v.product.tags);
  const size = normalizeSize(optionValue(v.selectedOptions, /^size$/i) ?? "");
  const price = Number.parseFloat(v.price);
  if (!category || !size || !Number.isFinite(price)) return null;
  const colorName = findOption(v.product.options, /^colou?r$/i) ? optionValue(v.selectedOptions, /^colou?r$/i) : "Default";
  if (!colorName) return null;
  const color = colorFor(colorName);
  const unitPrice = unitPriceFor(price, customization?.printSize, !!customization, surcharge);
  return {
    id: buildLineId(v.id, customization),
    productId: v.product.id,
    productSlug: v.product.handle,
    title: v.product.title,
    category,
    variantId: v.id,
    colorId: color.id,
    colorName: color.name,
    colorHex: color.hex,
    size,
    quantity,
    unitPrice,
    customization,
  };
}
