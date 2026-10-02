import type { Metadata } from "next";
import Link from "next/link";
import { loadAdmin } from "@/lib/admin/load";
import { LOW_STOCK_THRESHOLD } from "@/lib/shopify/admin/input";
import { PRODUCT_STATUS_FILTERS, listInventory } from "@/lib/shopify/admin/service";
import { humanize } from "@/components/admin/format";
import { EmptyRows, FilterBar, PageTitle, Pagination, Panel, ProblemPanel, ProductStatusBadge, StockBadge, Table, Td, Th } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Inventory" };

type Search = { q?: string; stock?: string; status?: string; after?: string; before?: string };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const result = await loadAdmin("inventory.list", () => listInventory(sp));

  return (
    <>
      <PageTitle title="Inventory" description={`Stock for every variant. "Low" means ${LOW_STOCK_THRESHOLD} or fewer. Adjust stock in the Shopify admin.`} />
      {!result.ok ? (
        <ProblemPanel problem={result.problem} />
      ) : (
        <Panel>
          <FilterBar
            action="/admin/inventory"
            current={sp}
            search={{ name: "q", placeholder: "Search by product or SKU" }}
            selects={[
              { name: "stock", label: "All stock levels", options: [{ value: "low", label: "Low stock" }, { value: "out", label: "Out of stock" }] },
              { name: "status", label: "All statuses", options: PRODUCT_STATUS_FILTERS.map((s) => ({ value: s, label: humanize(s) })) },
            ]}
          />
          {result.data.items.length === 0 ? (
            <EmptyRows title="No variants found" description={sp.q || sp.stock || sp.status ? "Nothing matches these filters." : "Variants appear here once products are added in Shopify."} />
          ) : (
            <Table caption="Variant inventory">
              <thead><tr><Th>Product</Th><Th>Variant</Th><Th>SKU</Th><Th>Product status</Th><Th>Inventory</Th></tr></thead>
              <tbody>
                {result.data.items.map((r) => (
                  <tr key={r.variantId}>
                    <Td><Link href={`/admin/products/${r.productId}`} className="font-medium underline-offset-4 hover:underline">{r.productTitle}</Link></Td>
                    <Td className="text-ink-2">{r.variantTitle === "Default Title" ? "Default" : r.variantTitle}</Td>
                    <Td className="text-ink-2">{r.sku ?? <span className="text-mute">—</span>}</Td>
                    <Td><ProductStatusBadge status={r.productStatus} /></Td>
                    <Td><StockBadge inventory={r.inventory} sellsWhenOutOfStock={r.sellsWhenOutOfStock} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <Pagination base="/admin/inventory" current={sp} pageInfo={result.data.pageInfo} />
        </Panel>
      )}
    </>
  );
}
