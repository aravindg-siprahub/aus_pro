import type { CartItem, CategoryId, Order, ShippingInfo, Category, Product } from "@/types/commerce";

export interface CheckoutInput {
  items: CartItem[];
  shipping: ShippingInfo;
}

/**
 * Either the order exists immediately (mock), or the customer must finish paying on a
 * hosted checkout (Shopify) and we hold a reference to look the order up afterwards.
 */
export type CheckoutResult = { type: "order"; order: Order } | { type: "redirect"; url: string; orderRef: string };

/**
 * CommerceProvider is the single seam between the UI and any backend.
 * Implementations: MockCommerceProvider (in-memory data) and ShopifyCommerceProvider
 * (Admin GraphQL API, server-side only). UI code must only depend on this interface.
 */
export interface CommerceProvider {
  listCategories(): Promise<Category[]>;
  listProducts(filter?: { category?: CategoryId; query?: string }): Promise<Product[]>;
  getProduct(slug: string): Promise<Product | null>;
  getProductById(id: string): Promise<Product | null>;
  getRelatedProducts(slug: string, limit?: number): Promise<Product[]>;
  startCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  getOrder(ref: string): Promise<Order | null>;
  listOrders(): Promise<Order[]>;
}

/** The subset the browser can use; it talks to the server through /api routes. */
export type ClientCommerce = Pick<CommerceProvider, "listProducts" | "startCheckout" | "getOrder" | "listOrders">;
