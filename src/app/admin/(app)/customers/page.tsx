import type { Metadata } from "next";
import Link from "next/link";
import { loadAdmin } from "@/lib/admin/load";
import { listCustomers } from "@/lib/shopify/admin/service";
import { formatDay, formatMoney } from "@/components/admin/format";
import { EmptyRows, FilterBar, PageTitle, Pagination, Panel, ProblemPanel, Table, Td, Th } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Customers" };

type Search = { q?: string; after?: string; before?: string };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const result = await loadAdmin("customers.list", () => listCustomers(sp));

  return (
    <>
      <PageTitle title="Customers" description="Name, email and order history only. Manage customers in the Shopify admin." />
      {!result.ok ? (
        <ProblemPanel problem={result.problem} />
      ) : (
        <Panel>
          <FilterBar action="/admin/customers" current={sp} search={{ name: "q", placeholder: "Search by name or email" }} />
          {result.data.items.length === 0 ? (
            <EmptyRows title="No customers found" description={sp.q ? "Nothing matches that search." : "Customers appear here after their first order."} />
          ) : (
            <Table caption="Customers">
              <thead><tr><Th>Customer</Th><Th>Email</Th><Th>Orders</Th><Th className="text-right">Total spent</Th><Th>Since</Th></tr></thead>
              <tbody>
                {result.data.items.map((c) => (
                  <tr key={c.id}>
                    <Td><Link href={`/admin/customers/${c.id}`} className="font-medium underline-offset-4 hover:underline">{c.name}</Link></Td>
                    <Td className="text-ink-2">{c.email ?? <span className="text-mute">—</span>}</Td>
                    <Td className="tabular-nums">{c.orderCount}</Td>
                    <Td className="whitespace-nowrap text-right tabular-nums">{formatMoney(c.totalSpent)}</Td>
                    <Td className="whitespace-nowrap text-ink-2">{formatDay(c.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <Pagination base="/admin/customers" current={sp} pageInfo={result.data.pageInfo} />
        </Panel>
      )}
    </>
  );
}
