export type ShopifyErrorKind =
  | "auth" // credentials rejected, or the app lacks a scope
  | "network"
  | "timeout"
  | "throttled"
  | "http"
  | "graphql"
  | "user_error" // Shopify rejected our input (e.g. draftOrderCreate userErrors)
  | "unavailable" // a product or variant can't be bought
  | "not_found"
  | "validation"; // bad request from the browser

const SAFE_MESSAGES: Record<ShopifyErrorKind, string> = {
  auth: "The store connection needs attention. Please try again later.",
  network: "We couldn't reach the store right now. Please try again.",
  timeout: "The store took too long to respond. Please try again.",
  throttled: "The store is busy right now. Please try again in a moment.",
  http: "The store ran into a problem. Please try again.",
  graphql: "The store ran into a problem. Please try again.",
  user_error: "We couldn't create your order. Please check your details and try again.",
  unavailable: "One of the items in your bag is no longer available.",
  not_found: "We couldn't find that.",
  validation: "Some of the details sent were not valid.",
};

const STATUS: Record<ShopifyErrorKind, number> = {
  auth: 503,
  network: 502,
  timeout: 504,
  throttled: 503,
  http: 502,
  graphql: 502,
  user_error: 422,
  unavailable: 409,
  not_found: 404,
  validation: 400,
};

/**
 * Internal errors may carry diagnostic detail in `message` (for logs). Only `userMessage`
 * is ever sent to the browser, and it is always one of the fixed strings above unless a
 * caller supplies a specific, secret-free validation message.
 */
export class ShopifyError extends Error {
  readonly kind: ShopifyErrorKind;
  readonly userMessage: string;
  readonly httpStatus: number;
  /**
   * A short, fixed-vocabulary cause (e.g. "app_not_installed", "missing_scope") used only to show
   * the signed-in admin how to fix the problem. Never sent to storefront visitors.
   */
  readonly reason?: string;
  /** For reason "missing_scope": the Shopify access scope that was denied. */
  readonly scope?: string;

  constructor(kind: ShopifyErrorKind, message: string, userMessage?: string, detail: { reason?: string; scope?: string } = {}) {
    super(message);
    this.name = "ShopifyError";
    this.kind = kind;
    this.userMessage = userMessage ?? SAFE_MESSAGES[kind];
    this.httpStatus = STATUS[kind];
    this.reason = detail.reason;
    this.scope = detail.scope;
  }
}

export const validationError = (userMessage: string) =>
  new ShopifyError("validation", `validation: ${userMessage}`, userMessage);
