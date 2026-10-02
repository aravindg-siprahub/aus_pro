import { getShopifyConfig } from "./config";
import { ShopifyError } from "./errors";
import { getAccessToken, getGrantedScopes } from "./token";

/** Permissions the storefront and admin need. Everything else stays ungranted (least privilege). */
export const REQUIRED_SCOPES = ["read_products", "read_draft_orders", "write_draft_orders", "read_orders"] as const;
/**
 * Optional; the app works without them. `read_customers`: the Customers area and customer names on orders.
 * `read_files`: home page photos managed in Shopify Files (otherwise product photos are used).
 */
export const OPTIONAL_SCOPES = ["read_customers", "read_files"] as const;

/** `write_x` implies `read_x`. */
export function hasScope(granted: string[], needed: string): boolean {
  return granted.includes(needed) || (needed.startsWith("read_") && granted.includes(`write_${needed.slice(5)}`));
}

/** The scopes Shopify granted to the cached token (fetching a token first if needed). */
export async function grantedScopes(): Promise<string[]> {
  await getAccessToken(getShopifyConfig());
  return getGrantedScopes();
}

export async function hasGrantedScope(scope: string): Promise<boolean> {
  return hasScope(await grantedScopes(), scope);
}

/** Fails fast, with an actionable reason, instead of sending a query Shopify would reject. */
export async function requireScope(scope: string): Promise<void> {
  if (!(await hasGrantedScope(scope))) {
    throw new ShopifyError("auth", `missing scope ${scope}`, undefined, { reason: "missing_scope", scope });
  }
}
