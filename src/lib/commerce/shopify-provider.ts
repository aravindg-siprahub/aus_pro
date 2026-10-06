import type { CartItem, CategoryId, Customization, Order, Product, ShippingInfo } from "@/types/commerce";
import type { CheckoutInput, CheckoutResult, CommerceProvider } from "./provider";
import { categories } from "./mock-data";
import { estimateDelivery } from "@/lib/delivery";
import { colorName, fontById, locationLabel, sizeLabel } from "@/features/customizer/config";
import { getShopifyConfig } from "@/lib/shopify/config";
import { ShopifyError } from "@/lib/shopify/errors";
import { shopifyGraphQL } from "@/lib/shopify/client";
import { log } from "@/lib/shopify/logger";
import { lineFromVariant, mapProduct, type RawProduct, type RawVariantWithProduct } from "@/lib/shopify/mappers";
import {
  DRAFT_ORDER_CREATE,
  DRAFT_ORDER_QUERY,
  PRODUCTS_PAGE_SIZE,
  PRODUCTS_QUERY,
  SHOP_QUERY,
  VARIANTS_QUERY,
} from "@/lib/shopify/queries";
import { draftOrderGidToRef, refToDraftOrderGid } from "@/lib/shopify/refs";
import { COUNTRIES, parseCustomization, type CheckoutRequest } from "@/lib/shopify/validation";

const CATALOG_TTL_MS = 60_000;
const SHOP_TTL_MS = 10 * 60_000;
/** 25 pages × 4 products = the first 100 active products. */
const MAX_PAGES = 25;

interface Entry<T> { value: T; expiresAt: number }
// Module-level so every request in a server process shares one catalogue fetch.
let catalog: Entry<Product[]> | null = null;
let catalogInflight: Promise<Product[]> | null = null;
let shopInfo: Entry<ShopInfo> | null = null;

export interface ShopInfo { name: string; currencyCode: string }

export function resetShopifyCaches() {
  catalog = null;
  catalogInflight = null;
  shopInfo = null;
}

/* Raw response shapes */
interface ProductsData { products: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: RawProduct[] } }
interface VariantsData { nodes: (RawVariantWithProduct | null)[] }
interface DraftOrderCreateData {
  draftOrderCreate: { draftOrder: { id: string; invoiceUrl: string | null } | null; userErrors: { field: string[] | null; message: string }[] };
}
interface DraftOrderData {
  draftOrder: null | {
    id: string;
    name: string;
    status: string;
    invoiceUrl: string | null;
    email: string | null;
    createdAt: string;
    completedAt: string | null;
    subtotalPriceSet: { shopMoney: { amount: string } };
    totalShippingPriceSet: { shopMoney: { amount: string } } | null;
    totalPriceSet: { shopMoney: { amount: string } };
    shippingAddress: null | {
      firstName: string | null; lastName: string | null; address1: string | null; address2: string | null;
      city: string | null; provinceCode: string | null; zip: string | null; countryCodeV2: string | null; phone: string | null;
    };
    order: { id: string; name: string; createdAt: string } | null;
    lineItems: { nodes: { quantity: number; customAttributes: { key: string; value: string | null }[]; variant: RawVariantWithProduct | null }[] };
  };
}

const money = (s: string | undefined | null) => {
  const n = Number.parseFloat(s ?? "0");
  return Number.isFinite(n) ? n : 0;
};

/** Human-readable properties for the print team, plus one hidden (underscore) property that round-trips the design. */
export function customizationAttributes(c: Customization) {
  return [
    { key: "Custom text", value: c.text },
    { key: "Font", value: fontById(c.fontId).label },
    { key: "Text colour", value: `${colorName(c.textColor)} (${c.textColor})` },
    { key: "Print size", value: sizeLabel(c.printSize) },
    { key: "Placement", value: locationLabel(c.location) },
    { key: "_customization", value: JSON.stringify(c) },
  ];
}

function shippingAddressInput(s: ShippingInfo) {
  const region = s.region.trim();
  return {
    firstName: s.firstName,
    lastName: s.lastName,
    address1: s.address,
    ...(s.apartment ? { address2: s.apartment } : {}),
    city: s.city,
    countryCode: COUNTRIES[s.country],
    zip: s.postalCode,
    ...(s.phone ? { phone: s.phone } : {}),
    // Shopify wants a province *code*; only pass what looks like one and let checkout collect the rest.
    ...(/^[A-Za-z]{2,3}$/.test(region) ? { provinceCode: region.toUpperCase() } : {}),
  };
}

export class ShopifyCommerceProvider implements CommerceProvider {
  constructor() {
    getShopifyConfig(); // fail fast, with a clear message, if configuration is missing or malformed
  }

  /* ── Shop ── */
  async getShopInfo(): Promise<ShopInfo> {
    if (shopInfo && shopInfo.expiresAt > Date.now()) return shopInfo.value;
    const data = await shopifyGraphQL<{ shop: ShopInfo }>(SHOP_QUERY, {}, { operation: "shop.read", idempotent: true });
    shopInfo = { value: data.shop, expiresAt: Date.now() + SHOP_TTL_MS };
    return data.shop;
  }

  /* ── Catalogue ── */
  async listCategories() {
    return categories;
  }

  private async allProducts(): Promise<Product[]> {
    if (catalog && catalog.expiresAt > Date.now()) return catalog.value;
    catalogInflight ??= this.fetchAllProducts()
      .then((value) => {
        catalog = { value, expiresAt: Date.now() + CATALOG_TTL_MS };
        return value;
      })
      .finally(() => {
        catalogInflight = null;
      });
    return catalogInflight;
  }

  private async fetchAllProducts(): Promise<Product[]> {
    const out: Product[] = [];
    let after: string | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const data: ProductsData = await shopifyGraphQL<ProductsData>(
        PRODUCTS_QUERY,
        { first: PRODUCTS_PAGE_SIZE, after, query: "status:active" },
        { operation: "products.list", idempotent: true },
      );
      for (const raw of data.products.nodes) {
        const product = mapProduct(raw);
        if (product) out.push(product);
      }
      if (!data.products.pageInfo.hasNextPage || !data.products.pageInfo.endCursor) break;
      after = data.products.pageInfo.endCursor;
    }
    log("info", "catalog.loaded", { products: out.length });
    return out;
  }

  async listProducts(filter?: { category?: CategoryId; query?: string }) {
    const q = filter?.query?.trim().toLowerCase();
    return (await this.allProducts()).filter(
      (p) =>
        (!filter?.category || p.category === filter.category) &&
        (!q || `${p.name} ${p.category} ${p.tagline}`.toLowerCase().includes(q)),
    );
  }

  async getProduct(slug: string) {
    return (await this.allProducts()).find((p) => p.slug === slug) ?? null;
  }

  async getProductById(id: string) {
    return (await this.allProducts()).find((p) => p.id === id) ?? null;
  }

  async getRelatedProducts(slug: string, limit = 4) {
    const all = await this.allProducts();
    const current = all.find((p) => p.slug === slug);
    if (!current) return [];
    const same = all.filter((p) => p.slug !== slug && p.category === current.category);
    const rest = all.filter((p) => p.slug !== slug && p.category !== current.category);
    return [...same, ...rest].slice(0, limit);
  }

  /* ── Checkout ── */

  /** Re-reads every variant from Shopify and prices each line server-side. Client prices are ignored. */
  private async resolveLines(req: CheckoutRequest): Promise<CartItem[]> {
    const cfg = getShopifyConfig();
    const ids = [...new Set(req.items.map((i) => i.variantId))];
    const data = await shopifyGraphQL<VariantsData>(VARIANTS_QUERY, { ids }, { operation: "variants.read", idempotent: true });
    const byId = new Map(data.nodes.filter((n): n is RawVariantWithProduct => !!n?.id).map((n) => [n.id, n]));

    return req.items.map((item) => {
      const v = byId.get(item.variantId);
      if (!v || v.product.status !== "ACTIVE" || !v.availableForSale) {
        throw new ShopifyError("unavailable", `variant unavailable: ${item.variantId}`);
      }
      // availableForSale only says "at least one left". Also refuse a quantity beyond the stock Shopify reports.
      // (A quantity of 0 on a sellable variant means inventory isn't tracked, so it is not a limit.)
      const stock = v.inventoryQuantity;
      if (v.inventoryPolicy === "DENY" && typeof stock === "number" && stock > 0 && item.quantity > stock) {
        throw new ShopifyError(
          "unavailable",
          `quantity ${item.quantity} exceeds stock for ${item.variantId}`,
          `Only ${stock} ${stock === 1 ? "is" : "are"} left of ${v.product.title}. Please lower the quantity.`,
        );
      }
      const line = lineFromVariant(v, item.quantity, item.customization, cfg.printSurcharge);
      if (!line) throw new ShopifyError("unavailable", `variant not sellable here: ${item.variantId}`);
      return line;
    });
  }

  /** Creates a draft order and returns Shopify's hosted checkout link for payment. */
  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    const lines = await this.resolveLines(req);
    const shop = await this.getShopInfo();

    const input = {
      email: req.shipping.email,
      shippingAddress: shippingAddressInput(req.shipping),
      tags: ["atelier-nine"],
      note: "Created from the WAHAU web storefront.",
      customAttributes: [{ key: "Source", value: "WAHAU web" }],
      lineItems: lines.map((l) => ({
        variantId: l.variantId,
        quantity: l.quantity,
        ...(l.customization
          ? {
              customAttributes: customizationAttributes(l.customization),
              // The print surcharge is added here, computed on the server.
              priceOverride: { amount: l.unitPrice.toFixed(2), currencyCode: shop.currencyCode },
            }
          : {}),
      })),
    };

    // A mutation: never auto-retried after an ambiguous failure, so it can't create duplicates.
    const data = await shopifyGraphQL<DraftOrderCreateData>(DRAFT_ORDER_CREATE, { input }, { operation: "draftOrder.create", idempotent: false });
    const { draftOrder, userErrors } = data.draftOrderCreate;
    if (userErrors.length || !draftOrder) {
      log("warn", "draftOrder.rejected", { errors: userErrors.map((e) => ({ field: e.field, message: e.message })) });
      throw new ShopifyError("user_error", "draftOrderCreate returned userErrors");
    }
    if (!draftOrder.invoiceUrl || !draftOrder.invoiceUrl.startsWith("https://")) {
      throw new ShopifyError("graphql", "draft order has no usable invoiceUrl");
    }
    log("info", "draftOrder.created", { lines: lines.length });
    return { type: "redirect", url: draftOrder.invoiceUrl, orderRef: draftOrderGidToRef(draftOrder.id) };
  }

  /** For callers holding CartItems. Their prices are discarded; every line is re-priced from Shopify. */
  async startCheckout({ items, shipping }: CheckoutInput): Promise<CheckoutResult> {
    return this.createCheckout({
      items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, customization: i.customization })),
      shipping,
    });
  }

  /* ── Orders ── */
  async getOrder(ref: string): Promise<Order | null> {
    const gid = refToDraftOrderGid(ref);
    if (!gid) return null;
    const data = await shopifyGraphQL<DraftOrderData>(DRAFT_ORDER_QUERY, { id: gid }, { operation: "draftOrder.read", idempotent: true });
    const d = data.draftOrder;
    if (!d) return null;

    const cfg = getShopifyConfig();
    const items: CartItem[] = [];
    for (const node of d.lineItems.nodes) {
      if (!node.variant) continue;
      const raw = node.customAttributes.find((a) => a.key === "_customization")?.value;
      let customization: Customization | undefined;
      if (raw) {
        try {
          customization = parseCustomization(JSON.parse(raw));
        } catch {
          customization = undefined;
        }
      }
      const line = lineFromVariant(node.variant, node.quantity, customization, cfg.printSurcharge);
      if (line) items.push(line);
    }

    const completed = d.status === "COMPLETED" && !!d.order;
    const placedAt = (completed ? d.completedAt ?? d.order?.createdAt : d.createdAt) ?? d.createdAt;
    const a = d.shippingAddress;
    const countryName = Object.entries(COUNTRIES).find(([, code]) => code === a?.countryCodeV2)?.[0] ?? a?.countryCodeV2 ?? "";
    const subtotal = money(d.subtotalPriceSet.shopMoney.amount);
    const shipping = money(d.totalShippingPriceSet?.shopMoney.amount);

    return {
      id: ref,
      status: completed ? "placed" : "awaiting_payment",
      paymentUrl: completed ? undefined : d.invoiceUrl ?? undefined,
      number: completed ? d.order!.name : d.name,
      placedAt,
      estimatedDelivery: estimateDelivery(new Date(placedAt)),
      items,
      shipping: {
        email: d.email ?? "",
        firstName: a?.firstName ?? "",
        lastName: a?.lastName ?? "",
        address: a?.address1 ?? "",
        apartment: a?.address2 ?? "",
        city: a?.city ?? "",
        region: a?.provinceCode ?? "",
        postalCode: a?.zip ?? "",
        country: countryName,
        phone: a?.phone ?? "",
      },
      totals: { subtotal, shipping, total: money(d.totalPriceSet.shopMoney.amount) },
    };
  }

  async listOrders(): Promise<Order[]> {
    return []; // there is no customer login yet; the browser keeps its own order references
  }
}
