import { clearTokenCache } from "@/lib/shopify/token";
import { resetShopifyCaches } from "@/lib/commerce/shopify-provider";
import { setLogSink } from "@/lib/shopify/logger";
import { clearMemo } from "@/lib/shopify/memo";
import { resetRateLimits } from "@/lib/admin/rate-limit";

/** Fake credentials. These are test fixtures, not real values. */
export const FAKE = {
  domain: "test-shop.myshopify.com",
  clientId: "test-client-id-0001",
  clientSecret: "shpss_TESTSECRET_do_not_use_0000000000",
  token: "shpat_TESTTOKEN_do_not_use_1111111111",
};

export const ADMIN_PASSWORD = "correct-horse-battery-staple-9";

export function setTestEnv(extra: Record<string, string | undefined> = {}) {
  for (const k of Object.keys(process.env)) {
    if (/^(SHOPIFY_|COMMERCE_PROVIDER|PRINT_SURCHARGE_|ADMIN_PASSWORD)/.test(k)) delete process.env[k];
  }
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
  Object.assign(process.env, {
    SHOPIFY_SHOP_DOMAIN: FAKE.domain,
    SHOPIFY_CLIENT_ID: FAKE.clientId,
    SHOPIFY_CLIENT_SECRET: FAKE.clientSecret,
    SHOPIFY_TIMEOUT_MS: "2000",
  });
  for (const [k, v] of Object.entries(extra)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  clearTokenCache();
  resetShopifyCaches();
  clearMemo();
  resetRateLimits();
}

export interface Call { url: string; method: string; headers: Record<string, string>; body: string }

type Handler = (call: Call, n: number) => Response | Promise<Response> | Error;

/** Installs a scripted global fetch and returns the recorded calls. */
export function mockFetch(handler: Handler) {
  const calls: Call[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((v, k) => (headers[k] = v));
    const call: Call = { url: String(input), method: init?.method ?? "GET", headers, body: init?.body ? String(init.body) : "" };
    calls.push(call);
    const out = await handler(call, calls.length);
    if (out instanceof Error) throw out;
    return out;
  }) as typeof fetch;
  return { calls, restore: () => (globalThis.fetch = original) };
}

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

export const tokenResponse = (expiresIn = 86399, scope = "read_products,write_draft_orders,read_draft_orders,read_orders") =>
  json({ access_token: FAKE.token, scope, expires_in: expiresIn });

export const isTokenCall = (c: Call) => c.url.endsWith("/admin/oauth/access_token");
export const isGraphQL = (c: Call) => c.url.includes("/admin/api/");
export const gql = (c: Call) => JSON.parse(c.body) as { query: string; variables: Record<string, any> };

/** Collects everything logged to the console so tests can assert nothing sensitive was printed. */
export function captureLogs() {
  const lines: string[] = [];
  setLogSink((line) => void lines.push(line));
  return { lines, restore: () => setLogSink(null) };
}

/* ── Fixtures ── */
export const rawVariant = (id: number, color: string, size: string, price = "34.00", available = true) => ({
  id: `gid://shopify/ProductVariant/${id}`,
  price,
  availableForSale: available,
  selectedOptions: [
    { name: "Color", value: color },
    { name: "Size", value: size },
  ],
});

export const rawProduct = (over: Record<string, unknown> = {}) => ({
  id: "gid://shopify/Product/1",
  handle: "essential-crew-tee",
  title: "Essential Crew Tee",
  description: "Soft combed cotton. Made for your message.",
  productType: "Round Neck T-Shirt",
  tags: ["badge:New"],
  status: "ACTIVE",
  options: [
    { name: "Color", values: ["Onyx", "Chalk"] },
    { name: "Size", values: ["S", "M"] },
  ],
  material: { value: "100% cotton" },
  fit: null,
  variants: {
    nodes: [rawVariant(101, "Onyx", "S"), rawVariant(102, "Onyx", "M"), rawVariant(103, "Chalk", "M", "34.00", false)],
  },
  ...over,
});

export const rawVariantWithProduct = (id: number, color = "Onyx", size = "M", price = "34.00", available = true, extra: Record<string, unknown> = {}) => ({
  ...rawVariant(id, color, size, price, available),
  ...extra,
  product: {
    id: "gid://shopify/Product/1",
    handle: "essential-crew-tee",
    title: "Essential Crew Tee",
    productType: "Round Neck T-Shirt",
    tags: [],
    status: "ACTIVE",
    options: [
      { name: "Color", values: ["Onyx", "Chalk"] },
      { name: "Size", values: ["S", "M"] },
    ],
  },
});

export const SHIPPING = {
  email: "sam@example.com",
  firstName: "Sam",
  lastName: "Rivera",
  address: "1 Test Lane",
  apartment: "",
  city: "Austin",
  region: "TX",
  postalCode: "78701",
  country: "United States",
  phone: "",
};
