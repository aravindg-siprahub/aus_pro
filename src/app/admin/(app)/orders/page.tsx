import type { Metadata } from "next";
import Link from "next/link";
import { loadAdmin } from "@/lib/admin/load";
import { FINANCIAL_FILTERS, FULFILLMENT_FILTERS, listOrders } from "@/lib/shopify/admin/service";
import { formatDateTime, formatMoney, humanize } from "@/components/admin/format";
import { Badge, EmptyRows, FilterBar, FulfillmentBadge, PageTitle, Pagination, Panel, PaymentBadge, ProblemPanel, Table, Td, Th } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Orders" };

type Search = { q?: string; financial?: string; fulfillment?: string; after?: string; before?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const result = await loadAdmin("orders.list", () => listOrders(sp));
  const showCustomer = result.ok && result.data.items.some((o) => o.customerName !== null);

  return (
    <>
      <PageTitle title="Orders" description="Orders from the last 60 days. Fulfil and refund in the Shopify admin." />
      {!result.ok ? (
        <ProblemPanel problem={result.problem} />
      ) : (
        <Panel>
          <FilterBar
            action="/admin/orders"
            current={sp}
            search={{ name: "q", placeholder: "Search by order number or email" }}
            selects={[
              { name: "financial", label: "Any payment status", options: FINANCIAL_FILTERS.map((s) => ({ value: s, label: humanize(s) })) },
              { name: "fulfillment", label: "Any fulfilment status", options: FULFILLMENT_FILTERS.map((s) => ({ value: s, label: humanize(s) })) },
            ]}
          />
          {result.data.items.length === 0 ? (
            <EmptyRows title="No orders found" description={sp.q || sp.financial || sp.fulfillment ? "Nothing matches these filters." : "Orders appear here once customers complete checkout."} />
          ) : (
            <Table caption="Orders">
              <thead>
                <tr><Th>Order</Th><Th>Date</Th>{showCustomer && <Th>Customer</Th>}<Th>Payment</Th><Th>Fulfilment</Th><Th>Items</Th><Th className="text-right">Total</Th></tr>
              </thead>
              <tbody>
                {result.data.items.map((o) => (
                  <tr key={o.id}>
                    <Td>
                      <Link href={`/admin/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline">{o.number}</Link>
                      {o.test && <span className="ml-2"><Badge>Test</Badge></span>}
                      {o.cancelled && <span className="ml-2"><Badge tone="red">Cancelled</Badge></span>}
                    </Td>
                    <Td className="whitespace-nowrap text-ink-2">{formatDateTime(o.createdAt)}</Td>
                    {showCustomer && <Td className="text-ink-2">{o.customerName ?? <span className="text-mute">Guest</span>}</Td>}
                    <Td><PaymentBadge status={o.financialStatus} /></Td>
                    <Td><FulfillmentBadge status={o.fulfillmentStatus} /></Td>
                    <Td className="tabular-nums text-ink-2">{o.itemCount}</Td>
                    <Td className="whitespace-nowrap text-right tabular-nums">{formatMoney(o.total)} <span className="text-[12px] text-mute">{o.total.currency}</span></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <Pagination base="/admin/orders" current={sp} pageInfo={result.data.pageInfo} />
        </Panel>
      )}
    </>
  );
}
