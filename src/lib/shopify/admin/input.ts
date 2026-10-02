import { validationError } from "../errors";

/** Sanitising for values that come from URLs and end up inside Shopify search strings or ids. */

export const PAGE_SIZE = 20;

/** Admin URLs carry numeric ids; convert to a GID only after validating. */
export function toGid(kind: "Product" | "Order" | "Customer" | "ProductVariant", id: string): string {
  if (!/^\d{1,20}$/.test(id)) throw validationError("That link isn't valid.");
  return `gid://shopify/${kind}/${id}`;
}

export function fromGid(gid: string): string {
  const id = gid.slice(gid.lastIndexOf("/") + 1);
  return /^\d+$/.test(id) ? id : gid;
}

/** Pagination cursors are opaque base64-ish strings. Anything else is dropped. */
export function cleanCursor(value: string | undefined | null): string | null {
  return value && /^[A-Za-z0-9+/=_-]{1,400}$/.test(value) ? value : null;
}

/** Free-text search: keep letters, digits and a few safe symbols so users can't inject search operators. */
export function cleanSearch(value: string | undefined | null): string {
  return (value ?? "").replace(/[^\p{L}\p{N}\s@._+#-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export function oneOf<T extends string>(value: string | undefined | null, allowed: readonly T[]): T | null {
  return allowed.includes(value as T) ? (value as T) : null;
}

export interface PageArgs {
  first?: number;
  last?: number;
  after?: string;
  before?: string;
}

/** Forward by default; `before` pages backwards using `last`. */
export function pageArgs(after: string | undefined | null, before: string | undefined | null, size = PAGE_SIZE): PageArgs {
  const b = cleanCursor(before);
  if (b) return { last: size, before: b };
  const a = cleanCursor(after);
  return a ? { first: size, after: a } : { first: size };
}

export function toMoney(set: { amount: string; currencyCode: string } | null | undefined, fallbackCurrency = "USD") {
  const amount = Number.parseFloat(set?.amount ?? "0");
  return { amount: Number.isFinite(amount) ? amount : 0, currency: set?.currencyCode ?? fallbackCurrency };
}

/** "City, Region, Country" and nothing more. Street, postcode and phone are deliberately not shown. */
export function placeOf(a: { city?: string | null; provinceCode?: string | null; countryCodeV2?: string | null } | null | undefined): string | null {
  const parts = [a?.city, a?.provinceCode, a?.countryCodeV2].filter((p): p is string => !!p);
  return parts.length ? parts.join(", ") : null;
}

export const LOW_STOCK_THRESHOLD = 5;

export function inventoryState(quantity: number | null | undefined, threshold = LOW_STOCK_THRESHOLD): { quantity: number | null; status: "in_stock" | "low" | "out" | "untracked" } {
  if (quantity === null || quantity === undefined) return { quantity: null, status: "untracked" };
  if (quantity <= 0) return { quantity, status: "out" };
  return { quantity, status: quantity <= threshold ? "low" : "in_stock" };
}
