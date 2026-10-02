import type { Metadata } from "next";
import Link from "next/link";
import { loadAdmin } from "@/lib/admin/load";
import { getDashboard } from "@/lib/shopify/admin/service";
import { formatCount, formatDateTime, formatMoney } from "@/components/admin/format";
import { EmptyRows, FulfillmentBadge, PageTitle, Panel, PaymentBadge, ProblemPanel, Stat, StockBadge, Table, Td, Th, Unavailable } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const result = await loadAdmin("dashboard", getDashboard);
  if (!result.ok) {
    return (
      <>
        <PageTitle title="Dashboard" />
        <ProblemPanel problem={result.problem} />
      </>
    );
  }
  const d = result.data;
  const na = <span className="text-mute">—</span>;

  return (
    <>
      <PageTitle title="Dashboard" description={`${d.shop.name} · updated ${formatDateTime(d.generatedAt)}`} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Products" value={formatCount(d.products)} note={`${formatCount(d.activeProducts)} active`} />
        <Stat label="Orders · 30 days" value={d.unavailable.orders ? na : formatCount(d.orders30d)} note={d.unavailable.orders ? "Unavailable" : undefined} />
        <Stat
          label="Revenue · 30 days"
          value={d.unavailable.orders ? na : formatMoney(d.revenue30d.money)}
          note={d.unavailable.orders ? "Unavailable" : `${d.revenue30d.orderCount}${d.revenue30d.partial ? "+" : ""} paid orders${d.revenue30d.partial ? " (latest 200)" : ""}`}
        />
        <Stat label="Customers" value={d.customers ? formatCount(d.customers) : na} note={d.customers ? undefined : "Unavailable"} />
        <Stat
          label="Low stock"
          value={d.unavailable.lowStock ? na : `${d.lowStock.rows.length}${d.lowStock.atLeast ? "+" : ""}`}
          note={d.unavailable.lowStock ? "Unavailable" : `variants at ${d.lowStock.threshold} or fewer`}
          tone={d.lowStock.rows.length > 0 ? "warn" : undefined}
        />
      </div>

      {(d.unavailable.orders || d.unavailable.customers || d.unavailable.lowStock) && (
        <ul className="mt-4 space-y-2 text-[13px] text-mute">
          {d.unavailable.orders && <li><strong className="font-medium text-ink-2">Orders and revenue:</strong> {d.unavailable.orders}</li>}
          {d.unavailable.customers && <li><strong className="font-medium text-ink-2">Customers:</strong> {d.unavailable.customers}</li>}
          {d.unavailable.lowStock && <li><strong className="font-medium text-ink-2">Low stock:</strong> {d.unavailable.lowStock}</li>}
        </ul>
      )}

      <div className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title="Recent orders" action={<Link href="/admin/orders" className="text-[13px] text-mute underline underline-offset-4 hover:text-ink">All orders</Link>}>
          {d.unavailable.orders ? (
            <Unavailable message="Recent orders can’t be shown right now." />
          ) : d.recentOrders.length === 0 ? (
            <EmptyRows title="No orders yet" description="Orders appear here as soon as a customer completes checkout." />
          ) : (
            <Table caption="Recent orders">
              <thead><tr><Th>Order</Th><Th>Date</Th><Th>Payment</Th><Th>Fulfilment</Th><Th className="text-right">Total</Th></tr></thead>
              <tbody>
                {d.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <Td><Link href={`/admin/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline">{o.number}</Link>{o.test && <span className="ml-2 text-[12px] text-mute">test</span>}</Td>
                    <Td className="whitespace-nowrap text-ink-2">{formatDateTime(o.createdAt)}</Td>
                    <Td><PaymentBadge status={o.financialStatus} /></Td>
                    <Td><FulfillmentBadge status={o.fulfillmentStatus} /></Td>
                    <Td className="text-right tabular-nums">{formatMoney(o.total)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel title="Low stock" action={<Link href="/admin/inventory?stock=low" className="text-[13px] text-mute underline underline-offset-4 hover:text-ink">View inventory</Link>}>
          {d.unavailable.lowStock ? (
            <Unavailable message="Stock levels can’t be shown right now." />
          ) : d.lowStock.rows.length === 0 ? (
            <EmptyRows title="Nothing is running low" description={`No active variant has ${d.lowStock.threshold} or fewer left.`} />
          ) : (
            <ul>
              {d.lowStock.rows.map((r) => (
                <li key={r.variantId} className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-3 last:border-b-0">
                  <div className="min-w-0">
                    <Link href={`/admin/products/${r.productId}`} className="block truncate text-[14px] font-medium underline-offset-4 hover:underline">{r.productTitle}</Link>
                    <p className="truncate text-[13px] text-mute">{r.variantTitle}{r.sku ? ` · ${r.sku}` : ""}</p>
                  </div>
                  <StockBadge inventory={r.inventory} sellsWhenOutOfStock={r.sellsWhenOutOfStock} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
