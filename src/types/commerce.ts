export type CategoryId = "round-neck" | "polo" | "oversized" | "hoodie";
export type GarmentType = CategoryId;
export type Size = "XS" | "S" | "M" | "L" | "XL" | "XXL";

export interface Category {
  id: CategoryId;
  name: string;
  tagline: string;
}

export interface ProductColor {
  id: string;
  name: string;
  hex: string;
  /** Shopify image attached to this colour's variants, when there is one. */
  imageUrl?: string;
}

export type PhotoView = "front" | "back";

export interface ProductImage {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  /** Which side of the garment the photo shows, read from its alt text ("…, back view"). */
  view: PhotoView;
  /** The colour the photo shows, when its alt text or variant assignment names one. */
  colorId?: string;
}

/** Named home page image positions, filled from Shopify Files. */
export type HomeSlot = "hero" | "canvas" | "compose" | "made" | "place-front" | "place-back" | "place-sleeve" | "band";
export type HomeMedia = Partial<Record<HomeSlot, Omit<ProductImage, "view" | "colorId">>>;

export interface Variant {
  id: string;
  productId: string;
  colorId: string;
  size: Size;
  price: number;
  available: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: CategoryId;
  tagline: string;
  description: string;
  basePrice: number;
  colors: ProductColor[];
  sizes: Size[];
  variants: Variant[];
  details: { material: string; fit: string; delivery: string; care: string };
  badge?: string;
  /**
   * Product photos from Shopify, in the merchant's order. An empty array means the product has no photos yet.
   * Undefined only for the built-in mock catalogue, which is drawn with the garment illustration instead.
   */
  images?: ProductImage[];
}

/* ── Customization ── */
export type PrintLocation = "front" | "back" | "left-sleeve" | "right-sleeve";
export type PrintSize = "small" | "medium" | "large";
export type FontId = "sans" | "serif" | "script" | "condensed" | "mono";

export interface Customization {
  text: string;
  fontId: FontId;
  textColor: string; // hex
  printSize: PrintSize;
  location: PrintLocation;
}

export interface CustomizationDraft extends Customization {
  colorId: string;
  size: Size;
}

/* ── Cart ── */
export interface CartItem {
  id: string;
  productId: string;
  /** Snapshot of product info so a cart line renders without another lookup. */
  productSlug: string;
  title: string;
  category: CategoryId;
  variantId: string;
  colorId: string;
  colorName: string;
  colorHex: string;
  size: Size;
  quantity: number;
  unitPrice: number;
  customization?: Customization;
}

export interface Cart {
  items: CartItem[];
}

/* ── Orders ── */
export interface ShippingInfo {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  apartment?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  total: number;
}

export interface Order {
  id: string;
  /** "placed" once paid/confirmed; "awaiting_payment" while a hosted checkout is still open. */
  status?: "placed" | "awaiting_payment";
  /** Where to finish paying while status is "awaiting_payment". */
  paymentUrl?: string;
  number: string;
  placedAt: string;
  estimatedDelivery: { from: string; to: string };
  items: CartItem[];
  shipping: ShippingInfo;
  totals: OrderTotals;
}
