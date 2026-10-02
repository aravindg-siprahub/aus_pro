import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { ShopifyCommerceProvider } from "@/lib/commerce/shopify-provider";
import { ShopifyError } from "@/lib/shopify/errors";
import { draftOrderGidToRef, refToDraftOrderGid } from "@/lib/shopify/refs";
import { parseCheckoutRequest } from "@/lib/shopify/validation";
import { hasScope, verifyShopifyConnection } from "@/lib/commerce/shopify-health";
import {
  FAKE, SHIPPING, captureLogs, gql, isGraphQL, isTokenCall, json, mockFetch, rawProduct, rawVariant,
  rawVariantWithProduct, setTestEnv, tokenResponse, type Call,
} from "./_mock";

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

const productsPage = (nodes: unknown[], hasNextPage = false, endCursor: string | null = null) =>
  json({ data: { products: { pageInfo: { hasNextPage, endCursor }, nodes } } });

/** Routes by GraphQL operation name so tests read as scenarios. */
function shopify(routes: Record<string, (call: Call, vars: Record<string, any>) => Response>) {
  const m = mockFetch((c) => {
    if (isTokenCall(c)) return tokenResponse();
    if (isGraphQL(c)) {
      const { query, variables } = gql(c);
      const op = /(?:query|mutation)\s+(\w+)/.exec(query)?.[1] ?? "";
      const route = routes[op];
      if (!route) throw new Error(`unexpected operation ${op}`);
      return route(c, variables);
    }
    throw new Error(`unexpected url ${c.url}`);
  });
  restore = m.restore;
  return m;
}

const gqlCalls = (calls: Call[]) => calls.filter(isGraphQL);

/* ───────────── Catalogue ───────────── */

test("catalogue: maps Shopify products to the app's Product model", async () => {
  shopify({
    Products: () =>
      productsPage([
        rawProduct(),
        rawProduct({ id: "gid://shopify/Product/2", handle: "gift-card", title: "Gift card", productType: "Gift Card" }), // no category → skipped
        rawProduct({ id: "gid://shopify/Product/3", handle: "draft-tee", status: "DRAFT" }), // not active → skipped
        rawProduct({ id: "gid://shopify/Product/4", handle: "no-size", options: [{ name: "Color", values: ["Onyx"] }] }), // no Size → skipped
      ]),
  });
  const products = await new ShopifyCommerceProvider().listProducts();
  assert.equal(products.length, 1);
  const p = products[0];
  assert.equal(p.slug, "essential-crew-tee");
  assert.equal(p.category, "round-neck");
  assert.equal(p.badge, "New");
  assert.equal(p.basePrice, 34);
  assert.deepEqual(p.colors.map((c) => [c.id, c.name, c.hex]), [["onyx", "Onyx", "#222225"], ["chalk", "Chalk", "#f2f1ee"]]);
  assert.deepEqual(p.sizes, ["S", "M"]);
  assert.equal(p.variants.length, 3);
  const chalkM = p.variants.find((v) => v.colorId === "chalk" && v.size === "M")!;
  assert.equal(chalkM.available, false, "unavailable variants stay visible but unavailable");
  assert.equal(chalkM.id, "gid://shopify/ProductVariant/103");
  assert.equal(p.details.material, "100% cotton");
  assert.equal(p.details.fit, "True to size.");
});

test("catalogue: maps Shopify photos in order, with per-colour photos, skipping videos, duplicates and non-CDN URLs", async () => {
  const cdn = (n: string) => `https://cdn.shopify.com/s/files/1/0001/products/${n}.jpg`;
  const withMedia = (v: ReturnType<typeof rawVariant>, url?: string) => ({ ...v, media: { nodes: url ? [{ image: { url } }] : [] } });
  const m = shopify({
    Products: () =>
      productsPage([
        rawProduct({
          media: {
            nodes: [
              { image: { url: cdn("front"), altText: "Front of the tee", width: 1600, height: 2000 } },
              {}, // a video: no MediaImage fields
              { image: { url: cdn("back"), altText: null, width: 1600, height: 2000 } },
              { image: { url: cdn("chalk-back"), altText: "Essential Crew Tee in Chalk, back view", width: 1600, height: 2000 } },
              { image: { url: cdn("front"), altText: "dup" } },
              { image: { url: "https://evil.example/x.jpg", altText: "" } },
            ],
          },
          variants: {
            nodes: [withMedia(rawVariant(101, "Onyx", "S"), cdn("back")), withMedia(rawVariant(102, "Onyx", "M")), withMedia(rawVariant(103, "Chalk", "M"))],
          },
        }),
        rawProduct({ id: "gid://shopify/Product/5", handle: "bare-tee", media: { nodes: [] } }),
      ]),
  });
  const [tee, bare] = await new ShopifyCommerceProvider().listProducts();
  assert.deepEqual(tee.images, [
    { url: cdn("front"), alt: "Front of the tee", width: 1600, height: 2000, view: "front" },
    { url: cdn("back"), alt: "Essential Crew Tee", width: 1600, height: 2000, view: "front", colorId: "onyx" },
    { url: cdn("chalk-back"), alt: "Essential Crew Tee in Chalk, back view", width: 1600, height: 2000, view: "back", colorId: "chalk" },
  ], "side and colour come from alt text, or from the variant a photo is attached to");
  assert.equal(tee.colors.find((c) => c.id === "onyx")?.imageUrl, cdn("back"), "a colour leads with its variant photo");
  assert.equal(tee.colors.find((c) => c.id === "chalk")?.imageUrl, undefined);
  assert.deepEqual(bare.images, [], "no photos is an empty list, never a placeholder");
  assert.match(gql(gqlCalls(m.calls)[0]).query, /media\(first: 10\)[\s\S]*MediaImage/);
});

test("catalogue: follows pagination and caches the result", async () => {
  const m = shopify({
    Products: (_c, v) =>
      v.after ? productsPage([rawProduct({ id: "gid://shopify/Product/9", handle: "polo", productType: "Polo Shirt" })]) : productsPage([rawProduct()], true, "cursor-1"),
  });
  const provider = new ShopifyCommerceProvider();
  assert.equal((await provider.listProducts()).length, 2);
  assert.equal((await provider.getProduct("polo"))?.category, "polo");
  assert.equal(gqlCalls(m.calls).length, 2, "two pages fetched once, then served from cache");
});

test("catalogue: a Shopify outage is an error, not silent mock data", async () => {
  shopify({ Products: () => json({ errors: [{ message: "boom", extensions: { code: "INTERNAL_SERVER_ERROR" } }] }) });
  await assert.rejects(new ShopifyCommerceProvider().listProducts(), ShopifyError);
});

/* ───────────── Validation ───────────── */

const validBody = () => ({
  items: [{ variantId: "gid://shopify/ProductVariant/102", quantity: 1 }],
  shipping: { ...SHIPPING }, // a copy: tests mutate it
});

test("validation: accepts a well-formed request", () => {
  const r = parseCheckoutRequest(validBody());
  assert.equal(r.items[0].variantId, "gid://shopify/ProductVariant/102");
  assert.equal(r.shipping.country, "United States");
});

test("validation: rejects malformed requests with specific, safe messages", () => {
  const bad = (mutate: (b: any) => void, pattern: RegExp) => {
    const b = validBody();
    mutate(b);
    assert.throws(() => parseCheckoutRequest(b), (e: unknown) => e instanceof ShopifyError && e.kind === "validation" && pattern.test(e.userMessage));
  };
  bad((b) => (b.items = []), /empty/i);
  bad((b) => (b.items[0].variantId = "102"), /not valid/);
  bad((b) => (b.items[0].variantId = "gid://shopify/Product/102"), /not valid/);
  bad((b) => (b.items[0].quantity = 0), /quantity/);
  bad((b) => (b.items[0].quantity = 11), /quantity/);
  bad((b) => (b.items[0].quantity = 1.5), /quantity/);
  bad((b) => (b.shipping.email = "nope"), /email/i);
  bad((b) => (b.shipping.country = "Atlantis"), /ship to/);
  bad((b) => (b.shipping.postalCode = "1"), /Postal/);
  bad((b) => (b.items[0].customization = { text: "x".repeat(23), fontId: "sans", textColor: "#111111", printSize: "small", location: "front" }), /Print text/);
  bad((b) => (b.items[0].customization = { text: "Hi", fontId: "comic", textColor: "#111111", printSize: "small", location: "front" }), /font/);
  bad((b) => (b.items[0].customization = { text: "Hi", fontId: "sans", textColor: "red", printSize: "small", location: "front" }), /colour/);
  bad((b) => (b.items[0].customization = { text: "Hi", fontId: "sans", textColor: "#111111", printSize: "huge", location: "front" }), /size/);
  bad((b) => (b.items[0].customization = { text: "Hi", fontId: "sans", textColor: "#111111", printSize: "small", location: "chest" }), /placement/);
});

/* ───────────── Checkout ───────────── */

const draftCreated = (id = "555") =>
  json({
    data: {
      draftOrderCreate: {
        draftOrder: { id: `gid://shopify/DraftOrder/${id}`, invoiceUrl: `https://${FAKE.domain}/invoices/abc123` },
        userErrors: [],
      },
    },
  });

test("checkout: prices every line on the server and stores the print as line-item properties", async () => {
  let sent: any;
  const m = shopify({
    Variants: () => json({ data: { nodes: [rawVariantWithProduct(102, "Onyx", "M", "34.00")] } }),
    Shop: () => json({ data: { shop: { name: "Test Shop", currencyCode: "USD" } } }),
    DraftOrderCreate: (_c, v) => ((sent = v.input), draftCreated()),
  });

  const body = {
    // A tampered unitPrice must be ignored: parseCheckoutRequest doesn't even accept one.
    items: [{ variantId: "gid://shopify/ProductVariant/102", quantity: 2, unitPrice: 0.01, customization: { text: "Night Shift", fontId: "serif", textColor: "#ffffff", printSize: "medium", location: "back" } }],
    shipping: SHIPPING,
  };
  const result = await new ShopifyCommerceProvider().createCheckout(parseCheckoutRequest(body));

  assert.equal(result.type, "redirect");
  if (result.type !== "redirect") return;
  assert.equal(result.url, `https://${FAKE.domain}/invoices/abc123`);
  assert.equal(refToDraftOrderGid(result.orderRef), "gid://shopify/DraftOrder/555");

  const line = sent.lineItems[0];
  assert.equal(line.variantId, "gid://shopify/ProductVariant/102");
  assert.equal(line.quantity, 2);
  assert.deepEqual(line.priceOverride, { amount: "43.00", currencyCode: "USD" }, "34.00 from Shopify + 9.00 medium print");
  const attrs = Object.fromEntries(line.customAttributes.map((a: any) => [a.key, a.value]));
  assert.equal(attrs["Custom text"], "Night Shift");
  assert.equal(attrs["Font"], "Editorial");
  assert.equal(attrs["Placement"], "Back");
  assert.equal(attrs["Print size"], "Medium");
  assert.deepEqual(JSON.parse(attrs["_customization"]).text, "Night Shift");
  assert.equal(sent.email, "sam@example.com");
  assert.deepEqual(sent.shippingAddress, { firstName: "Sam", lastName: "Rivera", address1: "1 Test Lane", city: "Austin", countryCode: "US", zip: "78701" , provinceCode: "TX" });
  assert.equal(gqlCalls(m.calls).filter((c) => /mutation/.test(gql(c).query)).length, 1, "exactly one mutation");
});

test("checkout: a plain item has no override or properties", async () => {
  let sent: any;
  shopify({
    Variants: () => json({ data: { nodes: [rawVariantWithProduct(101, "Onyx", "S", "34.00")] } }),
    Shop: () => json({ data: { shop: { name: "Test Shop", currencyCode: "USD" } } }),
    DraftOrderCreate: (_c, v) => ((sent = v.input), draftCreated()),
  });
  await new ShopifyCommerceProvider().createCheckout(parseCheckoutRequest({ items: [{ variantId: "gid://shopify/ProductVariant/101", quantity: 1 }], shipping: SHIPPING }));
  assert.deepEqual(Object.keys(sent.lineItems[0]).sort(), ["quantity", "variantId"]);
});

test("checkout: print surcharge follows configuration", async () => {
  setTestEnv({ PRINT_SURCHARGE_LARGE: "20" });
  let sent: any;
  shopify({
    Variants: () => json({ data: { nodes: [rawVariantWithProduct(102)] } }),
    Shop: () => json({ data: { shop: { name: "Test Shop", currencyCode: "INR" } } }),
    DraftOrderCreate: (_c, v) => ((sent = v.input), draftCreated()),
  });
  await new ShopifyCommerceProvider().createCheckout(
    parseCheckoutRequest({
      items: [{ variantId: "gid://shopify/ProductVariant/102", quantity: 1, customization: { text: "Hi", fontId: "sans", textColor: "#111111", printSize: "large", location: "front" } }],
      shipping: SHIPPING,
    }),
  );
  assert.deepEqual(sent.lineItems[0].priceOverride, { amount: "54.00", currencyCode: "INR" });
});

test("checkout: unavailable or unknown variants are refused before any order is created", async () => {
  const m = shopify({
    Variants: () => json({ data: { nodes: [rawVariantWithProduct(103, "Chalk", "M", "34.00", false), null] } }),
    Shop: () => json({ data: { shop: { name: "T", currencyCode: "USD" } } }),
  });
  await assert.rejects(
    new ShopifyCommerceProvider().createCheckout(parseCheckoutRequest({ items: [{ variantId: "gid://shopify/ProductVariant/103", quantity: 1 }], shipping: SHIPPING })),
    (e: unknown) => e instanceof ShopifyError && e.kind === "unavailable",
  );
  await assert.rejects(
    new ShopifyCommerceProvider().createCheckout(parseCheckoutRequest({ items: [{ variantId: "gid://shopify/ProductVariant/999", quantity: 1 }], shipping: SHIPPING })),
    (e: unknown) => e instanceof ShopifyError && e.kind === "unavailable",
  );
  assert.ok(!gqlCalls(m.calls).some((c) => gql(c).query.includes("draftOrderCreate")));
});

test("checkout: refuses a quantity above the stock Shopify reports, but not on untracked variants", async () => {
  shopify({
    Variants: (_c, v) =>
      json({
        data: {
          nodes: v.ids.map((id: string) =>
            id.endsWith("/102")
              ? rawVariantWithProduct(102, "Onyx", "M", "34.00", true, { inventoryQuantity: 2, inventoryPolicy: "DENY" })
              : rawVariantWithProduct(101, "Onyx", "S", "34.00", true, { inventoryQuantity: 0, inventoryPolicy: "DENY" }), // untracked: 0 but sellable
          ),
        },
      }),
    Shop: () => json({ data: { shop: { name: "T", currencyCode: "USD" } } }),
    DraftOrderCreate: () => draftCreated(),
  });
  const provider = new ShopifyCommerceProvider();
  await assert.rejects(
    provider.createCheckout(parseCheckoutRequest({ items: [{ variantId: "gid://shopify/ProductVariant/102", quantity: 3 }], shipping: SHIPPING })),
    (e: unknown) => e instanceof ShopifyError && e.kind === "unavailable" && /Only 2 are left/.test(e.userMessage),
  );
  const ok = await provider.createCheckout(parseCheckoutRequest({ items: [{ variantId: "gid://shopify/ProductVariant/102", quantity: 2 }], shipping: SHIPPING }));
  assert.equal(ok.type, "redirect");
  const untracked = await provider.createCheckout(parseCheckoutRequest({ items: [{ variantId: "gid://shopify/ProductVariant/101", quantity: 5 }], shipping: SHIPPING }));
  assert.equal(untracked.type, "redirect");
});

test("checkout: Shopify userErrors become a safe error that leaks nothing", async () => {
  shopify({
    Variants: () => json({ data: { nodes: [rawVariantWithProduct(102)] } }),
    Shop: () => json({ data: { shop: { name: "T", currencyCode: "USD" } } }),
    DraftOrderCreate: () => json({ data: { draftOrderCreate: { draftOrder: null, userErrors: [{ field: ["shippingAddress", "zip"], message: "Zip is not valid" }] } } }),
  });
  await assert.rejects(new ShopifyCommerceProvider().createCheckout(parseCheckoutRequest(validBody())), (e: unknown) => {
    assert.ok(e instanceof ShopifyError);
    assert.equal(e.kind, "user_error");
    assert.ok(!/zip/i.test(e.userMessage));
    return true;
  });
});

/* ───────────── Orders ───────────── */

test("order refs: round-trip, and forged or altered refs are rejected", () => {
  setTestEnv();
  const ref = draftOrderGidToRef("gid://shopify/DraftOrder/777");
  assert.equal(refToDraftOrderGid(ref), "gid://shopify/DraftOrder/777");
  assert.equal(refToDraftOrderGid(ref.replace("777", "778")), null, "changing the id invalidates the signature");
  assert.equal(refToDraftOrderGid("777.AAAAAAAAAAAAAAAAAAAAAAAA"), null);
  assert.equal(refToDraftOrderGid("777"), null);
  assert.equal(refToDraftOrderGid("../../etc/passwd"), null);
  assert.ok(!ref.includes(FAKE.clientSecret));
  // A different secret produces a different signature
  assert.equal(refToDraftOrderGid(ref, "another-secret-value-123456"), null);
});

const draftOrderPayload = (over: Record<string, unknown> = {}) => ({
  id: "gid://shopify/DraftOrder/777",
  name: "#D12",
  status: "OPEN",
  invoiceUrl: `https://${FAKE.domain}/invoices/abc123`,
  email: "sam@example.com",
  createdAt: "2026-10-02T10:00:00Z",
  completedAt: null,
  subtotalPriceSet: { shopMoney: { amount: "86.00", currencyCode: "USD" } },
  totalShippingPriceSet: { shopMoney: { amount: "0.00" } },
  totalPriceSet: { shopMoney: { amount: "86.00" } },
  shippingAddress: { firstName: "Sam", lastName: "Rivera", address1: "1 Test Lane", address2: null, city: "Austin", provinceCode: "TX", zip: "78701", countryCodeV2: "US", phone: null },
  order: null,
  lineItems: {
    nodes: [
      {
        quantity: 2,
        customAttributes: [{ key: "_customization", value: JSON.stringify({ text: "Night Shift", fontId: "serif", textColor: "#ffffff", printSize: "medium", location: "back" }) }],
        variant: rawVariantWithProduct(102, "Onyx", "M", "34.00"),
      },
    ],
  },
  ...over,
});

test("orders: a genuine ref returns an awaiting-payment order with the payment link and restored print", async () => {
  setTestEnv();
  const ref = draftOrderGidToRef("gid://shopify/DraftOrder/777");
  shopify({ DraftOrder: (_c, v) => ((assert.equal(v.id, "gid://shopify/DraftOrder/777")), json({ data: { draftOrder: draftOrderPayload() } })) });
  const order = await new ShopifyCommerceProvider().getOrder(ref);
  assert.ok(order);
  assert.equal(order.status, "awaiting_payment");
  assert.equal(order.number, "#D12");
  assert.equal(order.paymentUrl, `https://${FAKE.domain}/invoices/abc123`);
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].quantity, 2);
  assert.equal(order.items[0].unitPrice, 43);
  assert.equal(order.items[0].customization?.text, "Night Shift");
  assert.equal(order.items[0].colorName, "Onyx");
  assert.equal(order.shipping.country, "United States");
  assert.equal(order.totals.total, 86);
});

test("orders: a completed draft becomes a placed order carrying Shopify's order number", async () => {
  setTestEnv();
  const ref = draftOrderGidToRef("gid://shopify/DraftOrder/777");
  shopify({
    DraftOrder: () =>
      json({ data: { draftOrder: draftOrderPayload({ status: "COMPLETED", completedAt: "2026-10-02T10:05:00Z", order: { id: "gid://shopify/Order/1", name: "#1001", createdAt: "2026-10-02T10:05:00Z" } }) } }),
  });
  const order = await new ShopifyCommerceProvider().getOrder(ref);
  assert.equal(order?.status, "placed");
  assert.equal(order?.number, "#1001");
  assert.equal(order?.paymentUrl, undefined);
});

test("orders: forged refs never reach Shopify", async () => {
  setTestEnv();
  const m = shopify({});
  assert.equal(await new ShopifyCommerceProvider().getOrder("777.AAAAAAAAAAAAAAAAAAAAAAAA"), null);
  assert.equal(m.calls.length, 0);
});

/* ───────────── Health ───────────── */

test("scopes: write implies read", () => {
  assert.ok(hasScope(["write_draft_orders"], "read_draft_orders"));
  assert.ok(!hasScope(["read_draft_orders"], "write_draft_orders"));
  assert.ok(!hasScope([], "read_products"));
});

test("health: reports connection facts and never returns credentials", async () => {
  shopify({
    Shop: () => json({ data: { shop: { name: "Test Shop", currencyCode: "USD" } } }),
    Products: () => productsPage([rawProduct()]),
  });
  const health = await verifyShopifyConnection();
  assert.equal(health.ok, true);
  assert.equal(health.catalogProducts, 1);
  assert.equal(health.shop.currencyCode, "USD");
  assert.deepEqual(health.missingScopes, []);
  const text = JSON.stringify(health);
  assert.ok(!text.includes(FAKE.clientSecret));
  assert.ok(!text.includes(FAKE.token));
  assert.ok(!text.includes(FAKE.clientId));
});

test("health: flags missing scopes", async () => {
  const m = mockFetch((c) => {
    if (isTokenCall(c)) return tokenResponse(86399, "read_products");
    const op = /(?:query|mutation)\s+(\w+)/.exec(gql(c).query)?.[1];
    return op === "Shop" ? json({ data: { shop: { name: "T", currencyCode: "USD" } } }) : productsPage([rawProduct()]);
  });
  restore = m.restore;
  const health = await verifyShopifyConnection();
  assert.equal(health.ok, false);
  assert.deepEqual(health.missingScopes.sort(), ["read_draft_orders", "read_orders", "write_draft_orders"]);
});

// Keeps the fixture helper referenced so the test file documents the shape of raw variants.
test("fixtures are internally consistent", () => {
  assert.equal(rawVariant(1, "Onyx", "S").selectedOptions.length, 2);
});
