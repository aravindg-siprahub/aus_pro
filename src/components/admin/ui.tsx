import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { AdminProblem } from "@/lib/admin/problems";
import type { InventoryState, PageInfo } from "@/lib/shopify/admin/types";
import { humanize, withParams } from "./format";

/* ───────── Layout ───────── */

export function PageTitle({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{title}</h1>
        {description && <p className="mt-1 text-[14px] text-mute">{description}</p>}
      </div>
      {actions}
    </header>
  );
}

export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-xl border border-line-soft bg-white", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-3.5">
          {title && <h2 className="text-[14px] font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, note, tone }: { label: string; value: ReactNode; note?: ReactNode; tone?: "warn" }) {
  return (
    <div className="rounded-xl border border-line-soft bg-white px-5 py-4">
      <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-mute">{label}</p>
      <p className={cn("mt-2 text-[26px] font-semibold tabular-nums tracking-[-0.02em]", tone === "warn" && "text-[#9a5b00]")}>{value}</p>
      {note && <p className="mt-1 text-[13px] text-mute">{note}</p>}
    </div>
  );
}

/* ───────── States ───────── */

export function ProblemPanel({ problem, compact }: { problem: AdminProblem; compact?: boolean }) {
  return (
    <div role="alert" className={cn("rounded-xl border border-[#ecc9c4] bg-[#fdf6f5]", compact ? "px-4 py-3" : "px-5 py-4")}>
      <p className="text-[14px] font-semibold text-danger">{problem.title}</p>
      <p className="mt-1 text-[14px] text-ink-2">{problem.message}</p>
      {problem.hint && <p className="mt-2 text-[13px] text-mute">{problem.hint}</p>}
      {!compact && (
        <p className="mt-3 text-[13px]">
          <Link href="/admin/connection" className="font-medium underline underline-offset-4">Check the Shopify connection</Link>
        </p>
      )}
    </div>
  );
}

export function Unavailable({ message }: { message: string }) {
  return <p className="px-5 py-4 text-[13px] text-mute">{message}</p>;
}

export function EmptyRows({ title, description }: { title: string; description?: string }) {
  return (
    <div className="px-5 py-14 text-center">
      <p className="text-[15px] font-medium">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-[13px] text-mute">{description}</p>}
    </div>
  );
}

/* ───────── Badges ───────── */

const TONES = {
  green: "bg-[#e6f3ea] text-[#1f6b3b]",
  amber: "bg-[#fbf0d9] text-[#8a5a00]",
  red: "bg-[#fbe7e4] text-[#a3281d]",
  grey: "bg-soft text-ink-2",
  blue: "bg-[#e5eefb] text-[#254f96]",
} as const;

export function Badge({ tone = "grey", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium", TONES[tone])}>{children}</span>;
}

export function ProductStatusBadge({ status }: { status: string }) {
  return <Badge tone={status === "ACTIVE" ? "green" : status === "DRAFT" ? "amber" : "grey"}>{humanize(status)}</Badge>;
}

export function StockBadge({ inventory, sellsWhenOutOfStock }: { inventory: InventoryState; sellsWhenOutOfStock?: boolean }) {
  switch (inventory.status) {
    case "untracked": return <Badge>Not tracked</Badge>;
    case "out": return <Badge tone="red">{sellsWhenOutOfStock ? "Out of stock · backorder" : "Out of stock"}</Badge>;
    case "low": return <Badge tone="amber">Low · {inventory.quantity}</Badge>;
    default: return <Badge tone="green">{inventory.quantity} in stock</Badge>;
  }
}

export function PaymentBadge({ status }: { status: string }) {
  const tone = status === "PAID" ? "green" : status === "PENDING" || status === "AUTHORIZED" || status === "PARTIALLY_PAID" ? "amber" : status.includes("REFUND") || status === "VOIDED" ? "grey" : "grey";
  return <Badge tone={tone}>{humanize(status)}</Badge>;
}

export function FulfillmentBadge({ status }: { status: string }) {
  const tone = status === "FULFILLED" ? "green" : status === "UNFULFILLED" || status === "PARTIALLY_FULFILLED" || status === "IN_PROGRESS" ? "amber" : "grey";
  return <Badge tone={tone}>{humanize(status)}</Badge>;
}

/* ───────── Tables and forms ───────── */

export function Table({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[14px]">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}
export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <th scope="col" className={cn("border-b border-line-soft px-5 py-2.5 text-[12px] font-medium uppercase tracking-[0.06em] text-mute", className)}>{children}</th>
);
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <td className={cn("border-b border-line-soft px-5 py-3 align-middle last:border-b-0", className)}>{children}</td>
);

const field = "h-10 rounded-lg border border-line bg-white px-3 text-[14px] outline-none transition-colors hover:border-ink/40 focus:border-ink";

/** A plain GET form: filters live in the URL, so every view is linkable and needs no client JavaScript. */
export function FilterBar({
  action,
  current,
  search,
  selects = [],
}: {
  action: string;
  current: Record<string, string | undefined>;
  search: { name: string; placeholder: string };
  selects?: { name: string; label: string; options: { value: string; label: string }[] }[];
}) {
  const active = Object.entries(current).some(([k, v]) => v && !["after", "before"].includes(k));
  return (
    <form action={action} method="get" role="search" className="flex flex-wrap items-center gap-2 border-b border-line-soft px-5 py-3.5">
      <label className="sr-only" htmlFor={`f-${search.name}`}>Search</label>
      <input id={`f-${search.name}`} name={search.name} defaultValue={current[search.name] ?? ""} placeholder={search.placeholder} maxLength={60} className={cn(field, "min-w-[200px] flex-1")} />
      {selects.map((s) => (
        <label key={s.name} className="flex items-center">
          <span className="sr-only">{s.label}</span>
          <select name={s.name} defaultValue={current[s.name] ?? ""} className={cn(field, "pr-8")}>
            <option value="">{s.label}</option>
            {s.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      ))}
      <button type="submit" className="h-10 rounded-lg bg-ink px-4 text-[14px] font-medium text-white transition-colors hover:bg-[#3a3a3d]">Apply</button>
      {active && <Link href={action} className="px-1 text-[14px] text-mute underline underline-offset-4 hover:text-ink">Clear</Link>}
    </form>
  );
}

export function Pagination({ base, current, pageInfo }: { base: string; current: Record<string, string | undefined>; pageInfo: PageInfo }) {
  if (!pageInfo.hasNext && !pageInfo.hasPrevious) return null;
  const btn = "inline-flex h-9 items-center rounded-lg border border-line px-3.5 text-[13px] font-medium transition-colors";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 px-5 py-3.5">
      {pageInfo.hasPrevious && pageInfo.startCursor ? (
        <Link rel="prev" className={cn(btn, "hover:border-ink")} href={withParams(base, current, { before: pageInfo.startCursor, after: null })}>← Previous</Link>
      ) : <span className={cn(btn, "pointer-events-none opacity-40")} aria-disabled>← Previous</span>}
      {pageInfo.hasNext && pageInfo.endCursor ? (
        <Link rel="next" className={cn(btn, "hover:border-ink")} href={withParams(base, current, { after: pageInfo.endCursor, before: null })}>Next →</Link>
      ) : <span className={cn(btn, "pointer-events-none opacity-40")} aria-disabled>Next →</span>}
    </nav>
  );
}

export function Thumb({ url, alt, size = 40 }: { url: string | null; alt: string; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element -- Shopify CDN images; sizing is fixed and they are small thumbnails
  return url ? <img src={url} alt={alt} width={size} height={size} loading="lazy" className="rounded-lg bg-soft object-cover" style={{ width: size, height: size }} /> : (
    <span aria-hidden className="block rounded-lg bg-soft" style={{ width: size, height: size }} />
  );
}
