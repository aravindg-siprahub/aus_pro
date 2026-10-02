import { shopifyGraphQL } from "../client";
import { memo } from "../memo";
import { hasGrantedScope, requireScope } from "../scopes";
import {
  CUSTOMERS_COUNT, CUSTOMER_DETAIL, CUSTOMER_LIST, DASHBOARD_CORE, INVENTORY_LIST, PRODUCT_DETAIL, PRODUCT_LIST,
  PRODUCT_TYPES, REVENUE, dashboardOrders, orderDetail, orderList,
} from "./queries";
import {
  LOW_STOCK_THRESHOLD, PAGE_SIZE, cleanSearch, fromGid, inventoryState, oneOf, pageArgs, placeOf, toGid, toMoney,
} from "./input";
import type {
  AdminCustomerDetail, AdminCustomerRow, AdminInventoryRow, AdminLineItem, AdminOrderDetail, AdminOrderRow, AdminProductDetail,
  AdminProductRow, AdminVariant, Count, DashboardData, Page, PageInfo, ProductStatus,
} from "./types";
import { ShopifyError } from "../errors";
import { describeProblem } from "../../admin/problems";

/* ───────── Raw response shapes (only the fields the queries ask for) ───────── */
interface RawMoney { amount: string; currencyCode: string }
interface RawPageInfo { hasNextPage: boolean; hasPreviousPage: boolean; startCursor: string | null; endCursor: string | null }
interface RawCount { count: number; precision: string }
interface RawOrderRow {
  id: string; name: string; createdAt: string; cancelledAt: string | null; test: boolean;
  displayFinancialStatus: string | null; displayFulfillmentStatus: string | null; subtotalLineItemsQuantity: number;
  currentTotalPriceSet: { shopMoney: RawMoney };
  customer?: { displayName: string } | null;
}

const pageInfo = (p: RawPageInfo): PageInfo => ({ hasNext: p.hasNextPage, hasPrevious: p.hasPreviousPage, startCursor: p.startCursor, endCursor: p.endCursor });
const count = (c: RawCount | null | undefined): Count => ({ value: c?.count ?? 0, atLeast: c?.precision === "AT_LEAST" });

const STATUSES = ["ACTIVE", "DRAFT", "ARCHIVED", "UNLISTED"] as const;
const asStatus = (s: string): ProductStatus => (STATUSES as readonly string[]).includes(s) ? (s as ProductStatus) : "DRAFT";

/** Search syntax: space-separated terms are ANDed. */
const join = (parts: (string | null | false | undefined)[]) => parts.filter(Boolean).join(" AND ") || undefined;

/* ───────── Products ───────── */

interface RawProductRow {
  id: string; title: string; handle: string; status: string; productType: string; vendor: string;
  totalInventory: number; tracksInventory: boolean; updatedAt: string;
  variantsCount: RawCount | null;
  priceRangeV2: { minVariantPrice: RawMoney; maxVariantPrice: RawMoney };
  featuredMedia: { preview: { image: { url: string; altText: string | null } | null } | null } | null;
}

export const PRODUCT_STATUS_FILTERS = ["active", "draft", "archived"] as const;

export async function listProducts(opts: { q?: string; status?: string; type?: string; after?: string; before?: string }): Promise<Page<AdminProductRow>> {
  const q = cleanSearch(opts.q);
  const status = oneOf(opts.status, PRODUCT_STATUS_FILTERS);
  const type = cleanSearch(opts.type);
  const data = await shopifyGraphQL<{ products: { pageInfo: RawPageInfo; nodes: RawProductRow[] } }>(
    PRODUCT_LIST,
    { ...pageArgs(opts.after, opts.before), query: join([q, status && `status:${status}`, type && `product_type:"${type}"`]) },
    { operation: "admin.products.list", idempotent: true },
  );
  return {
    pageInfo: pageInfo(data.products.pageInfo),
    items: data.products.nodes.map((n) => {
      const image = n.featuredMedia?.preview?.image;
      return {
        id: fromGid(n.id),
        title: n.title,
        handle: n.handle,
        status: asStatus(n.status),
        productType: n.productType,
        vendor: n.vendor,
        imageUrl: image?.url ?? null,
        imageAlt: image?.altText || n.title,
        variantCount: n.variantsCount?.count ?? 0,
        price: { min: toMoney(n.priceRangeV2.minVariantPrice), max: toMoney(n.priceRangeV2.maxVariantPrice) },
        inventory: n.tracksInventory ? inventoryState(n.totalInventory) : inventoryState(null),
        updatedAt: n.updatedAt,
      };
    }),
  };
}

export function listProductTypes(): Promise<string[]> {
  return memo("admin.productTypes", 5 * 60_000, async () => {
    const data = await shopifyGraphQL<{ productTypes: { nodes: string[] } }>(PRODUCT_TYPES, {}, { operation: "admin.productTypes", idempotent: true });
    return data.productTypes.nodes.filter(Boolean);
  });
}

interface RawVariantDetail {
  id: string; title: string; sku: string | null; price: string; inventoryQuantity: number | null; inventoryPolicy: string;
  availableForSale: boolean; selectedOptions: { name: string; value: string }[];
}

export async function getProduct(id: string): Promise<AdminProductDetail | null> {
  const data = await shopifyGraphQL<{
    product: null | (Omit<RawProductRow, "variantsCount" | "priceRangeV2" | "featuredMedia"> & {
      tags: string[]; description: string; createdAt: string; onlineStoreUrl: string | null;
      options: { name: string; values: string[] }[];
      media: { nodes: ({ image?: { url: string; altText: string | null } } | null)[] };
      variants: { pageInfo: { hasNextPage: boolean }; nodes: RawVariantDetail[] };
    });
    shop: { currencyCode: string };
  }>(PRODUCT_DETAIL, { id: toGid("Product", id) }, { operation: "admin.product.read", idempotent: true });

  const p = data.product;
  if (!p) return null;
  const currency = data.shop.currencyCode;
  const images = p.media.nodes.flatMap((m) => (m?.image ? [{ url: m.image.url, alt: m.image.altText || p.title }] : []));
  const variants: AdminVariant[] = p.variants.nodes.map((v) => ({
    id: fromGid(v.id),
    title: v.title,
    sku: v.sku || null,
    price: { amount: Number.parseFloat(v.price) || 0, currency },
    options: v.selectedOptions,
    inventory: p.tracksInventory ? inventoryState(v.inventoryQuantity) : inventoryState(null),
    availableForSale: v.availableForSale,
    sellsWhenOutOfStock: v.inventoryPolicy === "CONTINUE",
  }));

  return {
    id: fromGid(p.id),
    title: p.title,
    handle: p.handle,
    status: asStatus(p.status),
    productType: p.productType,
    vendor: p.vendor,
    imageUrl: images[0]?.url ?? null,
    imageAlt: images[0]?.alt ?? p.title,
    inventory: p.tracksInventory ? inventoryState(p.totalInventory) : inventoryState(null),
    updatedAt: p.updatedAt,
    description: p.description,
    tags: p.tags,
    createdAt: p.createdAt,
    storefrontUrl: p.onlineStoreUrl,
    options: p.options,
    images,
    variants,
    variantsTruncated: p.variants.pageInfo.hasNextPage,
  };
}

/* ───────── Inventory ───────── */

interface RawInventoryRow {
  id: string; title: string; sku: string | null; inventoryQuantity: number | null; inventoryPolicy: string;
  product: { id: string; title: string; status: string; tracksInventory: boolean };
}

export const STOCK_FILTERS = ["low", "out"] as const;

const inventoryRow = (n: RawInventoryRow): AdminInventoryRow => ({
  variantId: fromGid(n.id),
  productId: fromGid(n.product.id),
  productTitle: n.product.title,
  productStatus: asStatus(n.product.status),
  variantTitle: n.title,
  sku: n.sku || null,
  inventory: n.product.tracksInventory ? inventoryState(n.inventoryQuantity) : inventoryState(null),
  sellsWhenOutOfStock: n.inventoryPolicy === "CONTINUE",
});

export async function listInventory(opts: { q?: string; stock?: string; status?: string; after?: string; before?: string }): Promise<Page<AdminInventoryRow>> {
  const q = cleanSearch(opts.q);
  const stock = oneOf(opts.stock, STOCK_FILTERS);
  const status = oneOf(opts.status, PRODUCT_STATUS_FILTERS);
  const data = await shopifyGraphQL<{ productVariants: { pageInfo: RawPageInfo; nodes: RawInventoryRow[] } }>(
    INVENTORY_LIST,
    {
      ...pageArgs(opts.after, opts.before),
      query: join([
        q,
        status && `product_status:${status}`,
        stock === "out" && "inventory_quantity:<=0",
        stock === "low" && `inventory_quantity:>0 AND inventory_quantity:<=${LOW_STOCK_THRESHOLD}`,
      ]),
    },
    { operation: "admin.inventory.list", idempotent: true },
  );
  let items = data.productVariants.nodes.map(inventoryRow);
  // Stock filters are only meaningful for variants whose inventory Shopify actually tracks.
  if (stock) items = items.filter((r) => r.inventory.status !== "untracked");
  return { pageInfo: pageInfo(data.productVariants.pageInfo), items };
}

/* ───────── Orders ───────── */

const mapOrderRow = (n: RawOrderRow): AdminOrderRow => ({
  id: fromGid(n.id),
  number: n.name,
  createdAt: n.createdAt,
  customerName: n.customer?.displayName ?? null,
  financialStatus: n.displayFinancialStatus ?? "UNKNOWN",
  fulfillmentStatus: n.displayFulfillmentStatus ?? "UNKNOWN",
  total: toMoney(n.currentTotalPriceSet.shopMoney),
  itemCount: n.subtotalLineItemsQuantity,
  cancelled: !!n.cancelledAt,
  test: n.test,
});

export const FINANCIAL_FILTERS = ["paid", "pending", "authorized", "partially_paid", "refunded", "partially_refunded", "voided"] as const;
export const FULFILLMENT_FILTERS = ["unshipped", "partial", "shipped"] as const;

/** Order search: "#1001"/"1001" match the order number, anything with "@" matches the email, otherwise default text search. */
function orderSearchTerm(q: string): string | undefined {
  if (!q) return undefined;
  if (/^#?\d{1,10}$/.test(q)) return `name:#${q.replace("#", "")}`;
  if (q.includes("@")) return `email:${q}`;
  return q;
}

export async function listOrders(opts: { q?: string; financial?: string; fulfillment?: string; after?: string; before?: string }): Promise<Page<AdminOrderRow>> {
  const financial = oneOf(opts.financial, FINANCIAL_FILTERS);
  const fulfillment = oneOf(opts.fulfillment, FULFILLMENT_FILTERS);
  const withCustomer = await hasGrantedScope("read_customers");
  const data = await shopifyGraphQL<{ orders: { pageInfo: RawPageInfo; nodes: RawOrderRow[] } }>(
    orderList(withCustomer),
    { ...pageArgs(opts.after, opts.before), query: join([orderSearchTerm(cleanSearch(opts.q)), financial && `financial_status:${financial}`, fulfillment && `fulfillment_status:${fulfillment}`]) },
    { operation: "admin.orders.list", idempotent: true },
  );
  return { pageInfo: pageInfo(data.orders.pageInfo), items: data.orders.nodes.map(mapOrderRow) };
}

interface RawLineItem {
  title: string; variantTitle: string | null; sku: string | null; quantity: number;
  originalUnitPriceSet: { shopMoney: RawMoney }; discountedTotalSet: { shopMoney: RawMoney };
  image: { url: string } | null; customAttributes: { key: string; value: string | null }[];
}

export async function getOrder(id: string): Promise<AdminOrderDetail | null> {
  const withCustomer = await hasGrantedScope("read_customers");
  const data = await shopifyGraphQL<{
    order: null | (RawOrderRow & {
      email: string | null; note: string | null;
      shippingAddress: { city: string | null; provinceCode: string | null; countryCodeV2: string | null } | null;
      subtotalPriceSet: { shopMoney: RawMoney } | null; totalShippingPriceSet: { shopMoney: RawMoney };
      totalTaxSet: { shopMoney: RawMoney } | null; lineItems: { nodes: RawLineItem[] };
    });
  }>(orderDetail(withCustomer), { id: toGid("Order", id) }, { operation: "admin.order.read", idempotent: true });

  const o = data.order;
  if (!o) return null;
  const lineItems: AdminLineItem[] = o.lineItems.nodes.map((li) => ({
    title: li.title,
    variantTitle: li.variantTitle,
    sku: li.sku || null,
    quantity: li.quantity,
    unitPrice: toMoney(li.originalUnitPriceSet.shopMoney),
    total: toMoney(li.discountedTotalSet.shopMoney),
    imageUrl: li.image?.url ?? null,
    // Properties starting with "_" are internal (our round-trip copy of the design); the rest are for the print team.
    print: li.customAttributes.filter((a) => !a.key.startsWith("_") && a.value).map((a) => ({ key: a.key, value: a.value as string })),
  }));
  const currency = o.currentTotalPriceSet.shopMoney.currencyCode;
  return {
    ...mapOrderRow(o),
    email: o.email,
    note: o.note,
    shipTo: placeOf(o.shippingAddress),
    lineItems,
    subtotal: toMoney(o.subtotalPriceSet?.shopMoney, currency),
    shipping: toMoney(o.totalShippingPriceSet?.shopMoney, currency),
    tax: toMoney(o.totalTaxSet?.shopMoney, currency),
  };
}

/* ───────── Customers ───────── */

interface RawCustomerRow {
  id: string; displayName: string; createdAt: string; numberOfOrders: string | number;
  defaultEmailAddress: { emailAddress: string } | null; amountSpent: RawMoney;
}
const mapCustomer = (c: RawCustomerRow): AdminCustomerRow => ({
  id: fromGid(c.id),
  name: c.displayName,
  email: c.defaultEmailAddress?.emailAddress ?? null,
  orderCount: Number(c.numberOfOrders) || 0,
  totalSpent: toMoney(c.amountSpent),
  createdAt: c.createdAt,
});

export async function listCustomers(opts: { q?: string; after?: string; before?: string }): Promise<Page<AdminCustomerRow>> {
  await requireScope("read_customers");
  const q = cleanSearch(opts.q);
  const data = await shopifyGraphQL<{ customers: { pageInfo: RawPageInfo; nodes: RawCustomerRow[] } }>(
    CUSTOMER_LIST,
    { ...pageArgs(opts.after, opts.before), query: q || undefined },
    { operation: "admin.customers.list", idempotent: true },
  );
  return { pageInfo: pageInfo(data.customers.pageInfo), items: data.customers.nodes.map(mapCustomer) };
}

export async function getCustomer(id: string): Promise<AdminCustomerDetail | null> {
  await requireScope("read_customers");
  const data = await shopifyGraphQL<{
    customer: null | (RawCustomerRow & {
      defaultAddress: { city: string | null; provinceCode: string | null; countryCodeV2: string | null } | null;
      orders: { nodes: RawOrderRow[] };
    });
  }>(CUSTOMER_DETAIL, { id: toGid("Customer", id) }, { operation: "admin.customer.read", idempotent: true });
  const c = data.customer;
  if (!c) return null;
  return { ...mapCustomer(c), location: placeOf(c.defaultAddress), orders: c.orders.nodes.map(mapOrderRow) };
}

/* ───────── Dashboard ───────── */

function describeUnavailable(e: unknown): string {
  const p = describeProblem(e);
  return p.hint ? `${p.message} ${p.hint}` : p.message;
}

export function getDashboard(): Promise<DashboardData> {
  return memo("admin.dashboard", 30_000, async () => {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const withCustomer = await hasGrantedScope("read_customers");
    const unavailable: DashboardData["unavailable"] = {};

    // Core (products) is required; every other panel degrades on its own.
    const core = await shopifyGraphQL<{ shop: { name: string; currencyCode: string }; productsAll: RawCount; productsActive: RawCount }>(
      DASHBOARD_CORE, {}, { operation: "admin.dashboard.core", idempotent: true },
    );
    const currency = core.shop.currencyCode;

    const [ordersBlock, revenueBlock, lowStockBlock, customersBlock] = await Promise.allSettled([
      shopifyGraphQL<{ ordersSince: RawCount; recentOrders: { nodes: RawOrderRow[] } }>(
        dashboardOrders(withCustomer), { since: `created_at:>=${since}` }, { operation: "admin.dashboard.orders", idempotent: true },
      ),
      shopifyGraphQL<{ orders: { pageInfo: { hasNextPage: boolean }; nodes: { currentTotalPriceSet: { shopMoney: RawMoney } }[] } }>(
        REVENUE, { query: `created_at:>=${since} AND financial_status:paid AND test:false` }, { operation: "admin.dashboard.revenue", idempotent: true },
      ),
      shopifyGraphQL<{ productVariants: { pageInfo: { hasNextPage: boolean }; nodes: RawInventoryRow[] } }>(
        INVENTORY_LIST, { first: 25, query: `product_status:active AND inventory_quantity:<=${LOW_STOCK_THRESHOLD}` }, { operation: "admin.dashboard.lowStock", idempotent: true },
      ),
      withCustomer
        ? shopifyGraphQL<{ customersCount: RawCount }>(CUSTOMERS_COUNT, {}, { operation: "admin.dashboard.customers", idempotent: true })
        : Promise.reject(new ShopifyError("auth", "missing scope read_customers", undefined, { reason: "missing_scope", scope: "read_customers" })),
    ]);

    let orders30d: Count = { value: 0, atLeast: false };
    let recentOrders: AdminOrderRow[] = [];
    if (ordersBlock.status === "fulfilled") {
      orders30d = count(ordersBlock.value.ordersSince);
      recentOrders = ordersBlock.value.recentOrders.nodes.map(mapOrderRow);
    } else unavailable.orders = describeUnavailable(ordersBlock.reason);

    let revenue: DashboardData["revenue30d"] = { money: { amount: 0, currency }, orderCount: 0, partial: false };
    if (revenueBlock.status === "fulfilled") {
      const nodes = revenueBlock.value.orders.nodes;
      revenue = {
        money: { amount: Math.round(nodes.reduce((s, n) => s + (Number.parseFloat(n.currentTotalPriceSet.shopMoney.amount) || 0), 0) * 100) / 100, currency },
        orderCount: nodes.length,
        partial: revenueBlock.value.orders.pageInfo.hasNextPage,
      };
    } else unavailable.orders ??= describeUnavailable(revenueBlock.reason);

    let lowStock: DashboardData["lowStock"] = { threshold: LOW_STOCK_THRESHOLD, rows: [], atLeast: false };
    if (lowStockBlock.status === "fulfilled") {
      const rows = lowStockBlock.value.productVariants.nodes.map(inventoryRow).filter((r) => r.inventory.status === "low" || r.inventory.status === "out");
      lowStock = { threshold: LOW_STOCK_THRESHOLD, rows, atLeast: lowStockBlock.value.productVariants.pageInfo.hasNextPage };
    } else unavailable.lowStock = describeUnavailable(lowStockBlock.reason);

    let customers: Count | null = null;
    if (customersBlock.status === "fulfilled") customers = count(customersBlock.value.customersCount);
    else unavailable.customers = describeUnavailable(customersBlock.reason);

    return {
      shop: { name: core.shop.name, currency },
      products: count(core.productsAll),
      activeProducts: count(core.productsActive),
      orders30d,
      revenue30d: revenue,
      customers,
      lowStock,
      recentOrders,
      unavailable,
      generatedAt: new Date().toISOString(),
    };
  });
}

export { PAGE_SIZE };
