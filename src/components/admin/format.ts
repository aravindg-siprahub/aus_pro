import type { Count, Money } from "@/lib/shopify/admin/types";

export function formatMoney(m: Money): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: m.currency }).format(m.amount);
  } catch {
    return `${m.amount.toFixed(2)} ${m.currency}`;
  }
}

export function formatPriceRange(min: Money, max: Money): string {
  return min.amount === max.amount ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`;
}

export function formatCount(c: Count): string {
  return `${c.value.toLocaleString("en-US")}${c.atLeast ? "+" : ""}`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** "PARTIALLY_REFUNDED" → "Partially refunded" */
export function humanize(value: string): string {
  const s = value.toLowerCase().replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Builds a URL that keeps the current filters and swaps the given params (null removes one). */
export function withParams(base: string, current: Record<string, string | undefined>, changes: Record<string, string | null>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...changes })) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
