import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { GET as getProducts } from "@/app/api/products/route";
import { POST as postCheckout } from "@/app/api/checkout/route";
import { GET as getOrder } from "@/app/api/orders/[ref]/route";
import { GET as getHealth } from "@/app/api/health/shopify/route";
import { draftOrderGidToRef } from "@/lib/shopify/refs";
import {
  FAKE, SHIPPING, captureLogs, gql, isGraphQL, isTokenCall, json, mockFetch, rawProduct, rawVariantWithProduct,
  setTestEnv, tokenResponse,
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

const post = (body: unknown, contentType = "application/json") =>
  new Request("http://localhost/api/checkout", { method: "POST", headers: { "content-type": contentType }, body: typeof body === "string" ? body : JSON.stringify(body) });

const opName = (c: Parameters<Parameters<typeof mockFetch>[0]>[0]) => /(?:query|mutation)\s+(\w+)/.exec(gql(c).query)?.[1];

function happyShopify() {
  const m = mockFetch((c) => {
    if (isTokenCall(c)) return tokenResponse();
    switch (opName(c)) {
      case "Products": return json({ data: { products: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [rawProduct()] } } });
      case "Shop": return json({ data: { shop: { name: "Test Shop", currencyCode: "USD" } } });
      case "Variants": return json({ data: { nodes: [rawVariantWithProduct(102)] } });
      case "DraftOrderCreate":
        return json({ data: { draftOrderCreate: { draftOrder: { id: "gid://shopify/DraftOrder/42", invoiceUrl: `https://${FAKE.domain}/invoices/zzz` }, userErrors: [] } } });
      case "DraftOrder":
        return json({ data: { draftOrder: null } });
      default: throw new Error(`unexpected ${opName(c)}`);
    }
  });
  restore = m.restore;
  return m;
}

const assertNoSecrets = (text: string) => {
  for (const secret of [FAKE.clientSecret, FAKE.token]) assert.ok(!text.includes(secret), "response/log leaked a secret");
};

test("GET /api/products returns catalogue data only", async () => {
  happyShopify();
  const res = await getProducts(new Request("http://localhost/api/products?q=tee"));
  assert.equal(res.status, 200);
  const text = await res.text();
  assertNoSecrets(text);
  assert.equal(JSON.parse(text).products[0].slug, "essential-crew-tee");
});

test("POST /api/checkout returns the hosted payment link and a signed reference", async () => {
  happyShopify();
  const res = await postCheckout(post({ items: [{ variantId: "gid://shopify/ProductVariant/102", quantity: 1 }], shipping: SHIPPING }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.mode, "shopify");
  assert.equal(body.url, `https://${FAKE.domain}/invoices/zzz`);
  assert.match(body.orderRef, /^42\.[A-Za-z0-9_-]{24}$/);
  assertNoSecrets(JSON.stringify(body));
});

test("POST /api/checkout rejects bad input with 400 before touching Shopify", async () => {
  const m = happyShopify();
  const res = await postCheckout(post({ items: [], shipping: SHIPPING }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "validation");
  assert.equal(m.calls.length, 0);

  assert.equal((await postCheckout(post("not json{"))).status, 400);
  assert.equal((await postCheckout(post({}, "text/plain"))).status, 400);
  assert.equal((await postCheckout(post("x".repeat(70_000)))).status, 400, "oversized bodies are refused");
});

test("POST /api/checkout: Shopify failure returns a generic message and logs no secrets", async () => {
  const m = mockFetch((c) => {
    if (isTokenCall(c)) return tokenResponse();
    if (opName(c) === "Variants") return json({ data: { nodes: [rawVariantWithProduct(102)] } });
    if (opName(c) === "Shop") return json({ data: { shop: { name: "T", currencyCode: "USD" } } });
    return json({ errors: [{ message: `internal ${FAKE.token} ${FAKE.clientSecret}`, extensions: { code: "INTERNAL" } }] });
  });
  restore = m.restore;
  const res = await postCheckout(post({ items: [{ variantId: "gid://shopify/ProductVariant/102", quantity: 1 }], shipping: SHIPPING }));
  assert.equal(res.status, 502);
  const text = await res.text();
  assertNoSecrets(text);
  assert.ok(!/internal|INTERNAL|shopify/i.test(JSON.parse(text).error), "no upstream detail in the user-facing message");
  assertNoSecrets(logs.lines.join("\n"));
});

test("missing configuration is reported safely, naming no values", async () => {
  setTestEnv({ SHOPIFY_CLIENT_ID: undefined }); // partial config in auto mode
  const res = await postCheckout(post({ items: [{ variantId: "gid://shopify/ProductVariant/102", quantity: 1 }], shipping: SHIPPING }));
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.code, "config");
  assertNoSecrets(JSON.stringify(body));
  assert.ok(logs.lines.join("\n").includes("SHOPIFY_CLIENT_ID"), "the log names the missing variable for the operator");
});

test("mock mode: checkout asks the browser to run the local mock flow, and Shopify is never called", async () => {
  setTestEnv({ COMMERCE_PROVIDER: "mock" });
  const m = mockFetch(() => { throw new Error("must not call Shopify in mock mode"); });
  restore = m.restore;
  const res = await postCheckout(post({}));
  assert.deepEqual(await res.json(), { mode: "mock" });
  assert.equal(m.calls.length, 0);
  const health = await getHealth();
  assert.deepEqual(await health.json(), { ok: true, provider: "mock" });
  assert.equal((await getOrder(new Request("http://localhost/x"), { params: Promise.resolve({ ref: "1.AAAAAAAAAAAAAAAAAAAAAAAA" }) })).status, 404);
  const products = await getProducts(new Request("http://localhost/api/products"));
  assert.ok((await products.json()).products.length > 0, "mock catalogue is served");
});

test("GET /api/orders/[ref]: unknown or forged refs are a plain 404", async () => {
  const m = happyShopify();
  const forged = await getOrder(new Request("http://localhost/x"), { params: Promise.resolve({ ref: "42.AAAAAAAAAAAAAAAAAAAAAAAA" }) });
  assert.equal(forged.status, 404);
  assert.equal(m.calls.filter(isGraphQL).length, 0);
  const genuine = draftOrderGidToRef("gid://shopify/DraftOrder/42");
  const missing = await getOrder(new Request("http://localhost/x"), { params: Promise.resolve({ ref: genuine }) });
  assert.equal(missing.status, 404);
});

test("GET /api/health/shopify answers ok / not ok without revealing store details or credentials", async () => {
  happyShopify();
  const res = await getHealth();
  const text = await res.text();
  assert.deepEqual(JSON.parse(text), { provider: "shopify", ok: true }, "the public endpoint says only ok / not ok");
  assert.ok(!text.includes("Test Shop"), "shop details are admin-only");
  assertNoSecrets(text);
  assert.ok(!text.includes(FAKE.clientId));
});
