import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadAdmin } from "@/lib/admin/load";
import { getOrder } from "@/lib/shopify/admin/service";
import { formatDateTime, formatMoney } from "@/components/admin/format";
import { authenticityKeyOrNull } from "@/lib/authenticity/key";
import { issueSerial } from "@/lib/authenticity/serial";
import { Badge, FulfillmentBadge, PageTitle, Panel, PaymentBadge, ProblemPanel, Table, Td, Th, Thumb } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Order" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadAdmin("order.read", () => getOrder(id));
  if (!result.ok) {
    return (
      <>
        <PageTitle title="Order" />
        <ProblemPanel problem={result.problem} />
      </>
    );
  }
  const o = result.data;
  if (!o) notFound();
  // Serial numbers for the print team to stamp: computed here from the order number and line position
  // (the same lineItems(first: 50) order the verifier reads). No key, no serials.
  const serialKey = authenticityKeyOrNull();
  const serialFor = (index: number) => (serialKey ? issueSerial(o.number, index + 1, serialKey) : null);

  return (
    <>
      <p className="mb-3 text-[13px]"><Link href="/admin/orders" className="text-mute underline-offset-4 hover:text-ink hover:underline">← Orders</Link></p>
      <PageTitle
        title={`Order ${o.number}`}
        description={formatDateTime(o.createdAt)}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {o.test && <Badge>Test order</Badge>}
            {o.cancelled && <Badge tone="red">Cancelled</Badge>}
            <PaymentBadge status={o.financialStatus} />
            <FulfillmentBadge status={o.fulfillmentStatus} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <Panel title={`Items (${o.itemCount})`}>
            <Table caption="Order line items">
              <thead><tr><Th>Item</Th><Th>Qty</Th><Th className="text-right">Price</Th><Th className="text-right">Total</Th></tr></thead>
              <tbody>
                {o.lineItems.map((li, i) => (
                  <tr key={`${li.title}-${i}`}>
                    <Td>
                      <div className="flex items-start gap-3">
                        <Thumb url={li.imageUrl} alt={li.title} size={48} />
                        <div className="min-w-0">
                          <p className="font-medium">{li.title}</p>
                          {li.variantTitle && <p className="text-[13px] text-mute">{li.variantTitle}</p>}
                          {li.sku && <p className="text-[12px] text-mute">SKU {li.sku}</p>}
                          {serialFor(i) && (
                            <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-[12px]">
                              <span className="font-medium uppercase tracking-[0.08em] text-mute">Serial</span>
                              <span className={`break-all font-mono tracking-[0.06em] ${o.cancelled ? "text-mute line-through" : "text-ink"}`}>{serialFor(i)}</span>
                              {o.cancelled && <span className="text-mute">(void: order cancelled)</span>}
                            </p>
                          )}
                          {li.print.length > 0 && (
                            <dl className="mt-2 rounded-lg bg-soft px-3 py-2 text-[13px]">
                              <dt className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-mute">Custom print</dt>
                              {li.print.map((p) => (
                                <div key={p.key} className="flex gap-2"><dt className="text-mute">{p.key}:</dt><dd className="break-words font-medium">{p.value}</dd></div>
                              ))}
                            </dl>
                          )}
                        </div>
                      </div>
                    </Td>
                    <Td className="tabular-nums">{li.quantity}</Td>
                    <Td className="whitespace-nowrap text-right tabular-nums text-ink-2">{formatMoney(li.unitPrice)}</Td>
                    <Td className="whitespace-nowrap text-right tabular-nums">{formatMoney(li.total)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!serialKey && <p className="border-t border-line-soft px-5 py-3 text-[12px] text-mute">Set AUTHENTICITY_SECRET to issue serial numbers.</p>}
            <dl className="ml-auto max-w-xs space-y-1.5 border-t border-line-soft px-5 py-4 text-[14px]">
              <Line k="Subtotal" v={formatMoney(o.subtotal)} />
              <Line k="Shipping" v={formatMoney(o.shipping)} />
              <Line k="Tax" v={formatMoney(o.tax)} />
              <div className="flex justify-between border-t border-line-soft pt-2 text-[15px] font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(o.total)} <span className="text-[12px] font-normal text-mute">{o.total.currency}</span></dd></div>
            </dl>
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          <Panel title="Customer">
            <dl className="divide-y divide-line-soft text-[14px]">
              <Line k="Name" v={o.customerName ?? "Not available"} pad />
              <Line k="Email" v={o.email ?? "—"} pad />
              <Line k="Ship to" v={o.shipTo ?? "—"} pad />
            </dl>
            {o.customerName === null && <p className="border-t border-line-soft px-5 py-3 text-[12px] text-mute">Customer names need the read_customers permission.</p>}
          </Panel>
          {o.note && <Panel title="Note"><p className="whitespace-pre-line px-5 py-4 text-[14px] text-ink-2">{o.note}</p></Panel>}
        </div>
      </div>
    </>
  );
}

function Line({ k, v, pad }: { k: string; v: string; pad?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${pad ? "px-5 py-2.5" : ""}`}>
      <dt className="text-mute">{k}</dt>
      <dd className="break-words text-right tabular-nums">{v}</dd>
    </div>
  );
}
