import type { CategoryId, Order } from "@/types/commerce";
import type { CheckoutInput, CheckoutResult, CommerceProvider } from "./provider";
import { categories, products } from "./mock-data";
import { cartTotals } from "@/lib/pricing";
import { estimateDelivery } from "@/lib/delivery";

const ORDERS_KEY = "atelier.orders.v1";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readOrders(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(ORDERS_KEY) ?? "[]") as Order[];
  } catch {
    return [];
  }
}

/** In-memory catalogue and a browser-only (localStorage) order flow, used for development and as the fallback. */
export class MockCommerceProvider implements CommerceProvider {
  async listCategories() {
    return categories;
  }

  async listProducts(filter?: { category?: CategoryId; query?: string }) {
    const q = filter?.query?.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!filter?.category || p.category === filter.category) &&
        (!q || `${p.name} ${p.category} ${p.tagline}`.toLowerCase().includes(q)),
    );
  }

  async getProduct(slug: string) {
    return products.find((p) => p.slug === slug) ?? null;
  }

  async getProductById(id: string) {
    return products.find((p) => p.id === id) ?? null;
  }

  async getRelatedProducts(slug: string, limit = 4) {
    const current = products.find((p) => p.slug === slug);
    if (!current) return [];
    const same = products.filter((p) => p.slug !== slug && p.category === current.category);
    const rest = products.filter((p) => p.slug !== slug && p.category !== current.category);
    return [...same, ...rest].slice(0, limit);
  }

  async startCheckout({ items, shipping }: CheckoutInput): Promise<CheckoutResult> {
    await wait(1400); // simulate latency so loading states are real
    if (items.length === 0) throw new Error("Your bag is empty.");
    const now = new Date();
    const n = Math.floor(100000 + Math.random() * 899999);
    const order: Order = {
      id: `ord_${now.getTime().toString(36)}${n}`,
      status: "placed",
      number: `AT-${n}`,
      placedAt: now.toISOString(),
      estimatedDelivery: estimateDelivery(now),
      items,
      shipping,
      totals: cartTotals(items),
    };
    window.localStorage.setItem(ORDERS_KEY, JSON.stringify([order, ...readOrders()]));
    return { type: "order", order };
  }

  async getOrder(id: string) {
    return readOrders().find((o) => o.id === id) ?? null;
  }

  async listOrders() {
    return readOrders();
  }
}
