import type { Order, Product } from "@/types/commerce";
import type { CheckoutInput, CheckoutResult, ClientCommerce } from "./provider";
import { MockCommerceProvider } from "./mock-provider";

/**
 * Browser-side commerce client. It never touches Shopify or any credential: catalogue search,
 * checkout and order lookup all go through this app's own /api routes. In mock mode the server
 * answers `{ mode: "mock" }` and the existing local mock flow runs in the browser.
 * (Server code uses `getCommerce()` from "./server" instead.)
 */
const mock = new MockCommerceProvider();
const REFS_KEY = "atelier.shopify-orders.v1";

class ApiError extends Error {}

async function api<T>(input: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    throw new ApiError("We couldn't reach the store. Check your connection and try again.");
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !body) throw new ApiError(body?.error ?? "Something went wrong. Please try again.");
  return body;
}

const isMockId = (ref: string) => ref.startsWith("ord_");

function readRefs(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(REFS_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}
function saveRef(ref: string) {
  try {
    window.localStorage.setItem(REFS_KEY, JSON.stringify([ref, ...readRefs().filter((r) => r !== ref)].slice(0, 20)));
  } catch {
    /* storage unavailable: the order is still reachable from the confirmation link */
  }
}

export const commerce: ClientCommerce = {
  async listProducts(filter) {
    const params = new URLSearchParams();
    if (filter?.query) params.set("q", filter.query);
    const { products } = await api<{ products: Product[] }>(`/api/products?${params}`);
    return filter?.category ? products.filter((p) => p.category === filter.category) : products;
  },

  async startCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    // Only identifiers, quantities and print details leave the browser; the server sets every price.
    const body = {
      items: input.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, customization: i.customization })),
      shipping: input.shipping,
    };
    const res = await api<{ mode: "mock" } | { mode: "shopify"; url: string; orderRef: string }>("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.mode === "mock") return mock.startCheckout(input);
    saveRef(res.orderRef);
    return { type: "redirect", url: res.url, orderRef: res.orderRef };
  },

  async getOrder(ref) {
    if (isMockId(ref)) return mock.getOrder(ref);
    try {
      const { order } = await api<{ order: Order }>(`/api/orders/${encodeURIComponent(ref)}`);
      return order;
    } catch {
      return null;
    }
  },

  async listOrders() {
    const local = await mock.listOrders();
    const remote = await Promise.all(readRefs().map((r) => commerce.getOrder(r)));
    return [...remote.filter((o): o is Order => !!o), ...local];
  },
};
