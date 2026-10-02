import { test } from "node:test";
import assert from "node:assert/strict";
import { ConfigError, getShopifyConfig, normalizeShopDomain, resolveProviderMode } from "@/lib/shopify/config";
import { FAKE, setTestEnv } from "./_mock";

test("auto mode: no Shopify variables → mock", () => {
  assert.equal(resolveProviderMode({}), "mock");
});

test("auto mode: any Shopify variable → shopify, and a partial set is a clear error", () => {
  const env = { SHOPIFY_SHOP_DOMAIN: FAKE.domain, SHOPIFY_CLIENT_SECRET: FAKE.clientSecret };
  assert.equal(resolveProviderMode(env), "shopify");
  assert.throws(
    () => getShopifyConfig(env),
    (e: unknown) => {
      assert.ok(e instanceof ConfigError);
      assert.match(e.message, /SHOPIFY_CLIENT_ID/);
      assert.ok(!e.message.includes(FAKE.clientSecret), "error must name variables, never print values");
      return true;
    },
  );
});

test("COMMERCE_PROVIDER=mock wins even when credentials exist", () => {
  setTestEnv({ COMMERCE_PROVIDER: "mock" });
  assert.equal(resolveProviderMode(), "mock");
});

test("COMMERCE_PROVIDER rejects unknown values", () => {
  assert.throws(() => resolveProviderMode({ COMMERCE_PROVIDER: "magento" }), ConfigError);
});

test("domain is validated and normalised", () => {
  assert.equal(normalizeShopDomain("https://My-Shop.myshopify.com/"), "my-shop.myshopify.com");
  assert.equal(normalizeShopDomain("example.com"), null);
  assert.equal(normalizeShopDomain("evil.com/.myshopify.com"), null);
  assert.equal(normalizeShopDomain("a.myshopify.com.evil.com"), null);
});

test("valid config parses, with defaults and overrides", () => {
  setTestEnv({ PRINT_SURCHARGE_MEDIUM: "15" });
  const cfg = getShopifyConfig();
  assert.equal(cfg.shopDomain, FAKE.domain);
  assert.equal(cfg.printSurcharge.medium, 15);
  assert.equal(cfg.printSurcharge.small, 6);
  assert.match(cfg.apiVersion, /^\d{4}-\d{2}$/);
});

test("malformed tuning values are rejected", () => {
  setTestEnv({ SHOPIFY_API_VERSION: "latest" });
  assert.throws(() => getShopifyConfig(), /SHOPIFY_API_VERSION/);
  setTestEnv({ SHOPIFY_TIMEOUT_MS: "5" });
  assert.throws(() => getShopifyConfig(), /SHOPIFY_TIMEOUT_MS/);
});
