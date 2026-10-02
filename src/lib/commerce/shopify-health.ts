import { getShopifyConfig } from "@/lib/shopify/config";
import { getAccessToken, getGrantedScopes } from "@/lib/shopify/token";
import { ShopifyCommerceProvider } from "./shopify-provider";

import { REQUIRED_SCOPES, hasScope } from "@/lib/shopify/scopes";

export { REQUIRED_SCOPES, hasScope };

export interface ShopifyHealth {
  ok: boolean;
  apiVersion: string;
  shop: { name: string; currencyCode: string };
  scopes: string[];
  missingScopes: string[];
  catalogProducts: number;
}

/** Proves the credentials work end to end without ever returning them. */
export async function verifyShopifyConnection(): Promise<ShopifyHealth> {
  const cfg = getShopifyConfig();
  await getAccessToken(cfg);
  const provider = new ShopifyCommerceProvider();
  const [shop, products] = await Promise.all([provider.getShopInfo(), provider.listProducts()]);
  const scopes = getGrantedScopes();
  const missingScopes = REQUIRED_SCOPES.filter((s) => !hasScope(scopes, s));
  return {
    ok: missingScopes.length === 0,
    apiVersion: cfg.apiVersion,
    shop: { name: shop.name, currencyCode: shop.currencyCode },
    scopes,
    missingScopes,
    catalogProducts: products.length,
  };
}
