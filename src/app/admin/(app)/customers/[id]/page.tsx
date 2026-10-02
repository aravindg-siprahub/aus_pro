import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadAdmin } from "@/lib/admin/load";
import { getCustomer } from "@/lib/shopify/admin/service";
import { formatDateTime, formatDay, formatMoney } from "@/components/admin/format";
import { EmptyRows, FulfillmentBadge, PageTitle, Panel, PaymentBadge, ProblemPanel, Table, Td, Th } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadAdmin("customer.read", () => getCustomer(id));
  if (!result.ok) {
    return (
      <>
        <PageTitle title="Customer" />
        <ProblemPanel problem={result.problem} />
      </>
    );
  }
  const c = result.data;
  if (!c) notFound();

  return (
    <>
      <p className="mb-3 text-[13px]"><Link href="/admin/customers" className="text-mute underline-offset-4 hover:text-ink hover:underline">← Customers</Link></p>
      <PageTitle title={c.name} description={`Customer since ${formatDay(c.createdAt)}`} />

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Panel title="Details">
          <dl className="divide-y divide-line-soft text-[14px]">
            <Row k="Email" v={c.email ?? "—"} />
            <Row k="Location" v={c.location ?? "—"} />
            <Row k="Orders" v={String(c.orderCount)} />
            <Row k="Total spent" v={formatMoney(c.totalSpent)} />
          </dl>
        </Panel>

        <Panel title="Recent orders">
          {c.orders.length === 0 ? (
            <EmptyRows title="No orders yet" />
          ) : (
            <Table caption="Customer orders">
              <thead><tr><Th>Order</Th><Th>Date</Th><Th>Payment</Th><Th>Fulfilment</Th><Th className="text-right">Total</Th></tr></thead>
              <tbody>
                {c.orders.map((o) => (
                  <tr key={o.id}>
                    <Td><Link href={`/admin/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline">{o.number}</Link></Td>
                    <Td className="whitespace-nowrap text-ink-2">{formatDateTime(o.createdAt)}</Td>
                    <Td><PaymentBadge status={o.financialStatus} /></Td>
                    <Td><FulfillmentBadge status={o.fulfillmentStatus} /></Td>
                    <Td className="whitespace-nowrap text-right tabular-nums">{formatMoney(o.total)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {c.orderCount > c.orders.length && <p className="border-t border-line-soft px-5 py-3 text-[12px] text-mute">Showing the latest {c.orders.length}. Shopify only exposes the last 60 days of orders to this app.</p>}
        </Panel>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 px-5 py-2.5">
      <dt className="text-mute">{k}</dt>
      <dd className="break-words text-right tabular-nums">{v}</dd>
    </div>
  );
}
