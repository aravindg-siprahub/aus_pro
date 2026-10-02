import { getShopifyConfig } from "../config";
import { getAccessToken, getTokenExpiry } from "../token";
import { shopifyGraphQL } from "../client";
import { OPTIONAL_SCOPES, REQUIRED_SCOPES, hasScope } from "../scopes";
import { getGrantedScopes } from "../token";
import { ShopifyCommerceProvider } from "@/lib/commerce/shopify-provider";

export interface ConnectionStatus {
  checkedAt: string;
  latencyMs: number;
  shop: { name: string; currencyCode: string; domain: string };
  apiVersion: string;
  tokenExpiresAt: string | null;
  scopes: { name: string; granted: boolean; required: boolean }[];
  grantedScopes: string[];
  catalog: { activeProducts: number; storefrontReady: number };
  ok: boolean;
}

/** Everything the Shopify Connection page shows. Contains no credentials. */
export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const cfg = getShopifyConfig();
  const started = Date.now();
  await getAccessToken(cfg);
  const data = await shopifyGraphQL<{ shop: { name: string; currencyCode: string }; productsCount: { count: number } }>(
    `query ConnectionCheck { shop { name currencyCode } productsCount(query: "status:active") { count } }`,
    {},
    { operation: "admin.connection", idempotent: true },
  );
  const latencyMs = Date.now() - started;
  const granted = getGrantedScopes();
  const scopes = [
    ...REQUIRED_SCOPES.map((name) => ({ name, required: true, granted: hasScope(granted, name) })),
    ...OPTIONAL_SCOPES.map((name) => ({ name, required: false, granted: hasScope(granted, name) })),
  ];
  const storefront = await new ShopifyCommerceProvider().listProducts();
  const expiry = getTokenExpiry();
  return {
    checkedAt: new Date().toISOString(),
    latencyMs,
    shop: { ...data.shop, domain: cfg.shopDomain },
    apiVersion: cfg.apiVersion,
    tokenExpiresAt: expiry ? new Date(expiry).toISOString() : null,
    scopes,
    grantedScopes: granted,
    catalog: { activeProducts: data.productsCount.count, storefrontReady: storefront.length },
    ok: scopes.filter((s) => s.required).every((s) => s.granted),
  };
}
