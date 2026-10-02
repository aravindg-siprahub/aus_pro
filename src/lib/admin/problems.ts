import { ConfigError } from "@/lib/shopify/config";
import { ShopifyError } from "@/lib/shopify/errors";

/**
 * Plain-English explanations for the signed-in admin. These can be more specific than storefront
 * messages (they name permissions and settings) but never include credentials or raw API output.
 */
export interface AdminProblem {
  code: string;
  title: string;
  message: string;
  hint?: string;
}

const REINSTALL = "Add it to a new app version in the Dev Dashboard, release it, then approve the update on the store.";

export function describeProblem(e: unknown): AdminProblem {
  if (e instanceof ConfigError) {
    return { code: "config", title: "Shopify isn't configured", message: e.message, hint: "Set the variables in .env.local and restart the server." };
  }
  if (e instanceof ShopifyError) {
    switch (e.reason) {
      case "app_not_installed":
        return {
          code: e.reason,
          title: "The app isn't installed on this store",
          message: "Shopify recognised the credentials but the app hasn't been installed on the store yet.",
          hint: "In the Dev Dashboard open the app, choose Install app, select the store and approve the permissions.",
        };
      case "invalid_client":
      case "token_rejected":
        return {
          code: e.reason,
          title: "Shopify rejected the credentials",
          message: "The client ID or client secret doesn't match the app.",
          hint: "Copy them again from the app's Settings page (or rotate the secret) and update .env.local.",
        };
      case "shop_not_found":
        return { code: e.reason, title: "Store not found", message: "Shopify doesn't recognise that store domain.", hint: "Check SHOPIFY_SHOP_DOMAIN (it ends in .myshopify.com)." };
      case "missing_scope":
        return {
          code: e.reason,
          title: "A permission is missing",
          message: `The app doesn't have the ${e.scope ? `\`${e.scope}\`` : "required"} permission.`,
          hint: REINSTALL,
        };
      case "access_denied":
        return { code: e.reason, title: "Access denied", message: "Shopify refused the request for this app.", hint: `Check the app's permissions. ${REINSTALL}` };
    }
    switch (e.kind) {
      case "throttled": return { code: e.kind, title: "Shopify is busy", message: "Too many requests were sent to Shopify.", hint: "Wait a moment and reload." };
      case "timeout": return { code: e.kind, title: "Shopify took too long", message: "The request timed out.", hint: "Reload to try again." };
      case "network": return { code: e.kind, title: "Can't reach Shopify", message: "The server couldn't connect to Shopify.", hint: "Check the internet connection and reload." };
      case "not_found": return { code: e.kind, title: "Not found", message: "Shopify has no record with that id." };
      case "validation": return { code: e.kind, title: "That request isn't valid", message: e.userMessage };
      default: return { code: e.kind, title: "Shopify returned an error", message: "Shopify couldn't complete the request.", hint: "Reload to try again. If it keeps happening, check the server log." };
    }
  }
  return { code: "internal", title: "Something went wrong", message: "An unexpected error occurred.", hint: "Check the server log for details." };
}

export const MOCK_PROBLEM: AdminProblem = {
  code: "mock",
  title: "Shopify isn't connected",
  message: "The app is running on the built-in sample catalogue, so there is no store data to show here.",
  hint: "Set SHOPIFY_SHOP_DOMAIN, SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in .env.local (and leave COMMERCE_PROVIDER as auto or shopify).",
};
