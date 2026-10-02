import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  getCustomer, getDashboard, getOrder, getProduct, listCustomers, listInventory, listOrders, listProducts,
} from "@/lib/shopify/admin/service";
import { cleanCursor, cleanSearch, inventoryState, pageArgs, toGid } from "@/lib/shopify/admin/input";
import { loadAdmin } from "@/lib/admin/load";
import { describeProblem } from "@/lib/admin/problems";
import { ShopifyError } from "@/lib/shopify/errors";
import { getConnectionStatus } from "@/lib/shopify/admin/connection";
import { FAKE, captureLogs, gql, isGraphQL, isTokenCall, json, mockFetch, setTestEnv, tokenResponse, type Call } from "./_mock";

let restore: () => void = () => {};
let logs: ReturnType<typeof captureLogs>;
beforeEach(() => {
  setTestEnv();
  logs = captureLogs();
});
afterEach(() => {
  restore();
  logs.restore();
});

const WITH_CUSTOMERS = "read_products,read_orders,read_draft_orders,write_draft_orders,read_customers";

/** Routes by GraphQL operation name; `scope` is what Shopify says the token may do. */
function shopify(routes: Record<string, (vars: Record<string, any>, call: Call) => Response>, scope?: string) {
  const m = mockFetch((c) => {
    if (isTokenCall(c)) return scope ? tokenResponse(86399, scope) : tokenResponse();
    const { query, variables } = gql(c);
    const op = /(?:query|mutation)\s+(\w+)/.exec(query)?.[1] ?? "";
    const route = routes[op];
    if (!route) throw new Error(`unexpected operation ${op}`);
    return route(variables, c);
  });
  restore = m.restore;
  return m;
}
const ops = (calls: Call[]) => calls.filter(isGraphQL).map((c) => /(?:query|mutation)\s+(\w+)/.exec(gql(c).query)?.[1]);

const money = (amount: string, currencyCode = "USD") => ({ shopMoney: { amount, currencyCode } });
const pageInfo = (over: Record<string, unknown> = {}) => ({ hasNextPage: false, hasPreviousPage: false, startCursor: "s", endCursor: "e", ...over });

const orderNode = (n: number, over: Record<string, unknown> = {}) => ({
  id: `gid://shopify/Order/${n}`, name: `#${1000 + n}`, createdAt: "2026-09-30T10:00:00Z", cancelledAt: null, test: false,
  displayFinancialStatus: "PAID", displayFulfillmentStatus: "UNFULFILLED", subtotalLineItemsQuantity: 2,
  currentTotalPriceSet: money("86.00"), ...over,
});

/* ───────── Input hygiene ───────── */

test("input: ids, cursors and search text are sanitised", () => {
  assert.equal(toGid("Order", "123"), "gid://shopify/Order/123");
  for (const bad of ["abc", "1;2", "12 3", "", "1".repeat(30), "../1"]) {
    assert.throws(() => toGid("Order", bad), (e: unknown) => e instanceof ShopifyError && e.kind === "validation", bad);
  }
  assert.equal(cleanCursor("eyJsYXN0X2lkIjoxfQ=="), "eyJsYXN0X2lkIjoxfQ==");
  assert.equal(cleanCursor('x" OR 1=1'), null);
  assert.equal(cleanSearch('tee" OR status:draft'), "tee OR status draft");
  assert.equal(cleanSearch("a".repeat(200)).length, 60);
  assert.deepEqual(pageArgs(null, null), { first: 20 });
  assert.deepEqual(pageArgs("abc", null), { first: 20, after: "abc" });
  assert.deepEqual(pageArgs("abc", "def"), { last: 20, before: "def" }, "going back wins over forward");
  assert.deepEqual(pageArgs("bad cursor!", null), { first: 20 });
});

test("input: inventory states", () => {
  assert.deepEqual(inventoryState(null), { quantity: null, status: "untracked" });
  assert.equal(inventoryState(0).status, "out");
  assert.equal(inventoryState(-3).status, "out");
  assert.equal(inventoryState(5).status, "low");
  assert.equal(inventoryState(6).status, "in_stock");
});

/* ───────── Products ───────── */

const productRow = (n: number, over: Record<string, unknown> = {}) => ({
  id: `gid://shopify/Product/${n}`, title: `Tee ${n}`, handle: `tee-${n}`, status: "ACTIVE", productType: "Round Neck T-Shirt", vendor: "Atelier",
  totalInventory: 12, tracksInventory: true, updatedAt: "2026-09-30T10:00:00Z", variantsCount: { count: 6 },
  priceRangeV2: { minVariantPrice: { amount: "34.0", currencyCode: "USD" }, maxVariantPrice: { amount: "38.0", currencyCode: "USD" } },
  featuredMedia: { preview: { image: { url: "https://cdn.shopify.com/a.jpg", altText: null } } },
  ...over,
});

test("products: maps rows, builds a safe search query and pages with cursors", async () => {
  let vars: Record<string, any> = {};
  shopify({ AdminProducts: (v) => ((vars = v), json({ data: { products: { pageInfo: pageInfo({ hasNextPage: true }), nodes: [productRow(1), productRow(2, { tracksInventory: false, featuredMedia: null, status: "DRAFT" })] } } })) });

  const page = await listProducts({ q: 'tee" OR status:archived', status: "active", type: "Hoodie", after: "Y3Vyc29y" });
  assert.equal(vars.query, 'tee OR status archived AND status:active AND product_type:"Hoodie"');
  assert.equal(vars.first, 20);
  assert.equal(vars.after, "Y3Vyc29y");
  assert.equal(page.items[0].id, "1");
  assert.equal(page.items[0].price.max.amount, 38);
  assert.equal(page.items[0].inventory.status, "in_stock");
  assert.equal(page.items[0].imageAlt, "Tee 1", "falls back to the title when there is no alt text");
  assert.equal(page.items[1].inventory.status, "untracked", "products that don't track inventory are not shown as out of stock");
  assert.equal(page.items[1].imageUrl, null);
  assert.equal(page.pageInfo.hasNext, true);
});

test("products: unknown status filters are ignored, backwards paging uses `last`", async () => {
  let vars: Record<string, any> = {};
  shopify({ AdminProducts: (v) => ((vars = v), json({ data: { products: { pageInfo: pageInfo(), nodes: [] } } })) });
  await listProducts({ status: "everything", before: "YmVmb3Jl" });
  assert.equal(vars.query, undefined);
  assert.equal(vars.last, 20);
  assert.equal(vars.before, "YmVmb3Jl");
  assert.equal(vars.first, undefined);
});

test("product detail: variants, options, images and inventory", async () => {
  shopify({
    AdminProduct: (v) => {
      assert.equal(v.id, "gid://shopify/Product/7");
      return json({
        data: {
          shop: { currencyCode: "INR" },
          product: {
            ...productRow(7), tags: ["badge:New"], description: "Soft.", createdAt: "2026-09-01T00:00:00Z", onlineStoreUrl: null,
            options: [{ name: "Size", values: ["S", "M"] }],
            media: { nodes: [{ image: { url: "https://cdn.shopify.com/1.jpg", altText: "Front" } }, {}, null] },
            variants: {
              pageInfo: { hasNextPage: false },
              nodes: [
                { id: "gid://shopify/ProductVariant/71", title: "S", sku: "TEE-S", price: "34.00", inventoryQuantity: 0, inventoryPolicy: "DENY", availableForSale: false, selectedOptions: [{ name: "Size", value: "S" }] },
                { id: "gid://shopify/ProductVariant/72", title: "M", sku: "", price: "34.00", inventoryQuantity: 3, inventoryPolicy: "CONTINUE", availableForSale: true, selectedOptions: [{ name: "Size", value: "M" }] },
              ],
            },
          },
        },
      });
    },
  });
  const p = await getProduct("7");
  assert.ok(p);
  assert.equal(p.images.length, 1, "non-image media is ignored");
  assert.equal(p.variants[0].inventory.status, "out");
  assert.equal(p.variants[0].availableForSale, false);
  assert.equal(p.variants[0].price.currency, "INR");
  assert.equal(p.variants[1].inventory.status, "low");
  assert.equal(p.variants[1].sku, null, "empty SKUs are shown as missing");
  assert.equal(p.variants[1].sellsWhenOutOfStock, true);
  await assert.rejects(getProduct("7; drop"), (e: unknown) => e instanceof ShopifyError && e.kind === "validation");
});

test("product detail: a missing product is null, not an error", async () => {
  shopify({ AdminProduct: () => json({ data: { product: null, shop: { currencyCode: "USD" } } }) });
  assert.equal(await getProduct("999"), null);
});

/* ───────── Inventory ───────── */

test("inventory: stock filters build the right query and drop untracked variants", async () => {
  const queries: (string | undefined)[] = [];
  shopify({
    AdminInventory: (v) => {
      queries.push(v.query);
      return json({
        data: {
          productVariants: {
            pageInfo: pageInfo(),
            nodes: [
              { id: "gid://shopify/ProductVariant/1", title: "S", sku: "A", inventoryQuantity: 2, inventoryPolicy: "DENY", product: { id: "gid://shopify/Product/1", title: "Tee", status: "ACTIVE", tracksInventory: true } },
              { id: "gid://shopify/ProductVariant/2", title: "M", sku: null, inventoryQuantity: 0, inventoryPolicy: "DENY", product: { id: "gid://shopify/Product/2", title: "Gift card", status: "ACTIVE", tracksInventory: false } },
            ],
          },
        },
      });
    },
  });
  const low = await listInventory({ stock: "low", status: "active", q: "tee" });
  assert.equal(queries[0], "tee AND product_status:active AND inventory_quantity:>0 AND inventory_quantity:<=5");
  assert.deepEqual(low.items.map((r) => r.variantId), ["1"], "the untracked product doesn't pollute a stock filter");
  const all = await listInventory({});
  assert.equal(all.items.length, 2);
  assert.equal(all.items[1].inventory.status, "untracked");
  await listInventory({ stock: "out" });
  assert.equal(queries[2], "inventory_quantity:<=0");
});

/* ───────── Orders ───────── */

test("orders: customer names are requested only when read_customers is granted", async () => {
  const seen: string[] = [];
  const route = (_v: Record<string, any>, c: Call) => (seen.push(gql(c).query), json({ data: { orders: { pageInfo: pageInfo(), nodes: [orderNode(1, { customer: { displayName: "Sam Rivera" } })] } } }));

  shopify({ AdminOrders: route }, WITH_CUSTOMERS);
  const withScope = await listOrders({});
  assert.ok(seen[0].includes("customer { displayName }"));
  assert.equal(withScope.items[0].customerName, "Sam Rivera");
  restore();

  setTestEnv();
  shopify({ AdminOrders: (v, c) => (seen.push(gql(c).query), json({ data: { orders: { pageInfo: pageInfo(), nodes: [orderNode(1)] } } })) });
  const without = await listOrders({});
  assert.ok(!seen[1].includes("customer {"), "the query never asks for a field the app can't read");
  assert.equal(without.items[0].customerName, null);
});

test("orders: search and filters become Shopify query syntax; unknown filters are ignored", async () => {
  const queries: (string | undefined)[] = [];
  shopify({ AdminOrders: (v) => (queries.push(v.query), json({ data: { orders: { pageInfo: pageInfo(), nodes: [] } } })) });
  await listOrders({ q: "1001", financial: "paid", fulfillment: "unshipped" });
  await listOrders({ q: "sam@example.com" });
  await listOrders({ q: "#1002", financial: "paid; DROP", fulfillment: "nope" });
  assert.equal(queries[0], "name:#1001 AND financial_status:paid AND fulfillment_status:unshipped");
  assert.equal(queries[1], "email:sam@example.com");
  assert.equal(queries[2], "name:#1002");
});

test("order detail: line items, totals and the print details; internal properties are hidden", async () => {
  shopify({
    AdminOrder: (v) => {
      assert.equal(v.id, "gid://shopify/Order/5");
      return json({
        data: {
          order: {
            ...orderNode(5), email: "sam@example.com", note: null,
            shippingAddress: { city: "Austin", provinceCode: "TX", countryCodeV2: "US" },
            subtotalPriceSet: money("86.00"), totalShippingPriceSet: money("8.00"), totalTaxSet: money("7.10"),
            lineItems: {
              nodes: [{
                title: "Essential Crew Tee", variantTitle: "Onyx / M", sku: "TEE-ONYX-M", quantity: 2,
                originalUnitPriceSet: money("43.00"), discountedTotalSet: money("86.00"), image: { url: "https://cdn.shopify.com/x.jpg" },
                customAttributes: [
                  { key: "Custom text", value: "Night Shift" }, { key: "Placement", value: "Back" },
                  { key: "_customization", value: '{"text":"Night Shift"}' }, { key: "Empty", value: null },
                ],
              }],
            },
          },
        },
      });
    },
  });
  const o = await getOrder("5");
  assert.ok(o);
  assert.equal(o.number, "#1005");
  assert.equal(o.shipTo, "Austin, TX, US", "city, region and country only: no street, postcode or phone");
  assert.equal(o.total.amount, 86);
  assert.equal(o.shipping.amount, 8);
  assert.deepEqual(o.lineItems[0].print, [{ key: "Custom text", value: "Night Shift" }, { key: "Placement", value: "Back" }]);
  assert.equal(o.lineItems[0].unitPrice.amount, 43);
  assert.ok(!JSON.stringify(o).includes("_customization"));
});

/* ───────── Customers ───────── */

test("customers: without read_customers no Shopify call is made and the reason names the permission", async () => {
  const m = shopify({});
  await assert.rejects(listCustomers({}), (e: unknown) => e instanceof ShopifyError && e.reason === "missing_scope" && e.scope === "read_customers");
  assert.equal(ops(m.calls).length, 0, "nothing was sent to Shopify");
  const problem = describeProblem(new ShopifyError("auth", "x", undefined, { reason: "missing_scope", scope: "read_customers" }));
  assert.match(problem.message, /read_customers/);
  assert.match(problem.hint ?? "", /new app version/);
});

test("customers: list, search and detail with order history", async () => {
  let vars: Record<string, any> = {};
  shopify(
    {
      AdminCustomers: (v) => ((vars = v), json({ data: { customers: { pageInfo: pageInfo(), nodes: [{ id: "gid://shopify/Customer/9", displayName: "Sam Rivera", createdAt: "2026-01-01T00:00:00Z", numberOfOrders: "3", defaultEmailAddress: { emailAddress: "sam@example.com" }, amountSpent: { amount: "250.50", currencyCode: "USD" } }] } } })),
      AdminCustomer: () => json({ data: { customer: { id: "gid://shopify/Customer/9", displayName: "Sam Rivera", createdAt: "2026-01-01T00:00:00Z", numberOfOrders: "3", defaultEmailAddress: null, amountSpent: { amount: "250.50", currencyCode: "USD" }, defaultAddress: { city: "Austin", provinceCode: "TX", countryCodeV2: "US" }, orders: { nodes: [orderNode(1)] } } } }),
    },
    WITH_CUSTOMERS,
  );
  const page = await listCustomers({ q: "sam <script>" });
  assert.equal(vars.query, "sam script");
  assert.equal(page.items[0].orderCount, 3);
  assert.equal(page.items[0].totalSpent.amount, 250.5);
  assert.equal(page.items[0].email, "sam@example.com");

  const c = await getCustomer("9");
  assert.equal(c?.location, "Austin, TX, US");
  assert.equal(c?.email, null);
  assert.equal(c?.orders[0].number, "#1001");
});

/* ───────── Dashboard ───────── */

const core = () => json({ data: { shop: { name: "Test Shop", currencyCode: "USD" }, productsAll: { count: 8, precision: "EXACT" }, productsActive: { count: 6, precision: "EXACT" } } });
const deniedFor = (scope: string) => json({ errors: [{ message: `Access denied for field. Required access: \`${scope}\` access scope.`, extensions: { code: "ACCESS_DENIED" } }] });

test("dashboard: real numbers from Shopify, and nothing invented", async () => {
  shopify(
    {
      AdminDashboardCore: () => core(),
      AdminDashboardOrders: (v) => {
        assert.match(v.since, /^created_at:>=\d{4}-\d{2}-\d{2}$/);
        return json({ data: { ordersSince: { count: 12, precision: "EXACT" }, recentOrders: { nodes: [orderNode(1, { customer: { displayName: "Sam" } })] } } });
      },
      AdminRevenue: (v) => {
        assert.match(v.query, /financial_status:paid AND test:false$/);
        return json({ data: { orders: { pageInfo: { hasNextPage: false }, nodes: [{ currentTotalPriceSet: money("86.00") }, { currentTotalPriceSet: money("43.25") }] } } });
      },
      AdminInventory: () => json({ data: { productVariants: { pageInfo: { hasNextPage: false }, nodes: [
        { id: "gid://shopify/ProductVariant/1", title: "S", sku: "A", inventoryQuantity: 2, inventoryPolicy: "DENY", product: { id: "gid://shopify/Product/1", title: "Tee", status: "ACTIVE", tracksInventory: true } },
        { id: "gid://shopify/ProductVariant/2", title: "M", sku: "B", inventoryQuantity: 0, inventoryPolicy: "DENY", product: { id: "gid://shopify/Product/9", title: "Gift card", status: "ACTIVE", tracksInventory: false } },
      ] } } }),
      AdminCustomersCount: () => json({ data: { customersCount: { count: 40, precision: "AT_LEAST" } } }),
    },
    WITH_CUSTOMERS,
  );
  const d = await getDashboard();
  assert.equal(d.products.value, 8);
  assert.equal(d.activeProducts.value, 6);
  assert.equal(d.orders30d.value, 12);
  assert.equal(d.revenue30d.money.amount, 129.25);
  assert.equal(d.revenue30d.orderCount, 2);
  assert.equal(d.revenue30d.partial, false);
  assert.deepEqual(d.customers, { value: 40, atLeast: true });
  assert.equal(d.lowStock.rows.length, 1, "untracked variants are not counted as low stock");
  assert.equal(d.recentOrders[0].customerName, "Sam");
  assert.deepEqual(d.unavailable, {});
});

test("dashboard: a missing permission blanks only its own panel", async () => {
  shopify({
    AdminDashboardCore: () => core(),
    AdminDashboardOrders: () => deniedFor("read_orders"),
    AdminRevenue: () => deniedFor("read_orders"),
    AdminInventory: () => json({ data: { productVariants: { pageInfo: { hasNextPage: false }, nodes: [] } } }),
  }); // default token scopes lack read_customers
  const d = await getDashboard();
  assert.equal(d.products.value, 8, "product numbers still load");
  assert.match(d.unavailable.orders ?? "", /read_orders/);
  assert.match(d.unavailable.customers ?? "", /read_customers/);
  assert.equal(d.unavailable.lowStock, undefined);
  assert.equal(d.customers, null);
  assert.equal(d.revenue30d.money.amount, 0);
});

test("dashboard: caches for a short time", async () => {
  const m = shopify({
    AdminDashboardCore: () => core(),
    AdminDashboardOrders: () => json({ data: { ordersSince: { count: 0, precision: "EXACT" }, recentOrders: { nodes: [] } } }),
    AdminRevenue: () => json({ data: { orders: { pageInfo: { hasNextPage: false }, nodes: [] } } }),
    AdminInventory: () => json({ data: { productVariants: { pageInfo: { hasNextPage: false }, nodes: [] } } }),
    AdminCustomersCount: () => json({ data: { customersCount: { count: 0, precision: "EXACT" } } }),
  }, WITH_CUSTOMERS);
  await getDashboard();
  const first = m.calls.length;
  await getDashboard();
  assert.equal(m.calls.length, first, "the second view costs no Shopify calls");
});

test("dashboard: marks revenue as partial when more orders exist than were summed", async () => {
  shopify({
    AdminDashboardCore: () => core(),
    AdminDashboardOrders: () => json({ data: { ordersSince: { count: 500, precision: "EXACT" }, recentOrders: { nodes: [] } } }),
    AdminRevenue: () => json({ data: { orders: { pageInfo: { hasNextPage: true }, nodes: [{ currentTotalPriceSet: money("10.00") }] } } }),
    AdminInventory: () => json({ data: { productVariants: { pageInfo: { hasNextPage: false }, nodes: [] } } }),
  });
  assert.equal((await getDashboard()).revenue30d.partial, true);
});

/* ───────── Error handling ───────── */

test("loadAdmin: mock mode reports 'not connected' and never calls Shopify", async () => {
  setTestEnv({ COMMERCE_PROVIDER: "mock" });
  const m = mockFetch(() => { throw new Error("must not be called"); });
  restore = m.restore;
  const r = await loadAdmin("test", async () => "data");
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.problem.code, "mock");
  assert.equal(m.calls.length, 0);
});

test("loadAdmin: failures become readable problems with a fix, and secrets stay out", async () => {
  const m = mockFetch((c) => (isTokenCall(c) ? json({ error: "app_not_installed", error_description: `no ${FAKE.clientSecret}` }, 400) : json({})));
  restore = m.restore;
  const r = await loadAdmin("test", () => listProducts({}));
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.problem.code, "app_not_installed");
  assert.match(r.problem.title, /isn.t installed/);
  assert.match(r.problem.hint ?? "", /Install app/);
  const shown = JSON.stringify(r.problem) + logs.lines.join("\n");
  assert.ok(!shown.includes(FAKE.clientSecret));
});

test("describeProblem covers the main failure causes", () => {
  const cases: [ShopifyError, RegExp][] = [
    [new ShopifyError("auth", "x", undefined, { reason: "invalid_client" }), /rejected the credentials/],
    [new ShopifyError("auth", "x", undefined, { reason: "shop_not_found" }), /Store not found/],
    [new ShopifyError("throttled", "x"), /busy/],
    [new ShopifyError("timeout", "x"), /too long/],
    [new ShopifyError("network", "x"), /Can.t reach/],
    [new ShopifyError("not_found", "x"), /Not found/],
  ];
  for (const [err, pattern] of cases) assert.match(describeProblem(err).title, pattern);
  assert.equal(describeProblem(new Error("boom")).code, "internal");
  assert.ok(!describeProblem(new Error("secret detail")).message.includes("secret detail"));
});

test("connection status: reports permissions, token expiry and catalogue readiness without credentials", async () => {
  const m = mockFetch((c) => {
    if (isTokenCall(c)) return tokenResponse(86399, "read_products,write_draft_orders,read_orders");
    const op = /(?:query|mutation)\s+(\w+)/.exec(gql(c).query)?.[1];
    if (op === "ConnectionCheck") return json({ data: { shop: { name: "Test Shop", currencyCode: "USD" }, productsCount: { count: 4 } } });
    if (op === "Products") return json({ data: { products: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] } } });
    throw new Error(`unexpected ${op}`);
  });
  restore = m.restore;
  const s = await getConnectionStatus();
  assert.equal(s.shop.name, "Test Shop");
  assert.equal(s.catalog.activeProducts, 4);
  assert.equal(s.catalog.storefrontReady, 0);
  assert.equal(s.ok, true, "write_draft_orders implies read_draft_orders");
  assert.equal(s.scopes.find((x) => x.name === "read_customers")?.granted, false);
  assert.equal(s.scopes.find((x) => x.name === "read_customers")?.required, false);
  assert.ok(s.tokenExpiresAt && new Date(s.tokenExpiresAt).getTime() > Date.now());
  const text = JSON.stringify(s);
  assert.ok(!text.includes(FAKE.token) && !text.includes(FAKE.clientSecret) && !text.includes(FAKE.clientId));
});
