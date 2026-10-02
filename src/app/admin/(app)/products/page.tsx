import type { Metadata } from "next";
import Link from "next/link";
import { loadAdmin } from "@/lib/admin/load";
import { PRODUCT_STATUS_FILTERS, listProductTypes, listProducts } from "@/lib/shopify/admin/service";
import { formatDay, formatPriceRange, humanize } from "@/components/admin/format";
import { EmptyRows, FilterBar, PageTitle, Pagination, Panel, ProblemPanel, ProductStatusBadge, StockBadge, Table, Td, Th, Thumb } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Products" };

type Search = { q?: string; status?: string; type?: string; after?: string; before?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const result = await loadAdmin("products.list", async () => {
    const [page, types] = await Promise.all([listProducts(sp), listProductTypes().catch(() => [] as string[])]);
    return { page, types };
  });

  return (
    <>
      <PageTitle title="Products" description="Live from Shopify. Edit products in the Shopify admin." />
      {!result.ok ? (
        <ProblemPanel problem={result.problem} />
      ) : (
        <Panel>
          <FilterBar
            action="/admin/products"
            current={sp}
            search={{ name: "q", placeholder: "Search products" }}
            selects={[
              { name: "status", label: "All statuses", options: PRODUCT_STATUS_FILTERS.map((s) => ({ value: s, label: humanize(s) })) },
              ...(result.data.types.length ? [{ name: "type", label: "All types", options: result.data.types.map((t) => ({ value: t, label: t })) }] : []),
            ]}
          />
          {result.data.page.items.length === 0 ? (
            <EmptyRows title="No products found" description={sp.q || sp.status || sp.type ? "Try a different search or clear the filters." : "Add products in your Shopify admin and they will appear here."} />
          ) : (
            <Table caption="Products">
              <thead>
                <tr><Th>Product</Th><Th>Status</Th><Th>Type</Th><Th>Inventory</Th><Th>Variants</Th><Th>Price</Th><Th>Updated</Th></tr>
              </thead>
              <tbody>
                {result.data.page.items.map((p) => (
                  <tr key={p.id}>
                    <Td>
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        <Thumb url={p.imageUrl} alt={p.imageAlt} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium underline-offset-4 hover:underline">{p.title}</span>
                          {p.vendor && <span className="block truncate text-[12px] text-mute">{p.vendor}</span>}
                        </span>
                      </Link>
                    </Td>
                    <Td><ProductStatusBadge status={p.status} /></Td>
                    <Td className="text-ink-2">{p.productType || <span className="text-mute">—</span>}</Td>
                    <Td><StockBadge inventory={p.inventory} /></Td>
                    <Td className="tabular-nums text-ink-2">{p.variantCount}</Td>
                    <Td className="whitespace-nowrap tabular-nums">{formatPriceRange(p.price.min, p.price.max)}</Td>
                    <Td className="whitespace-nowrap text-ink-2">{formatDay(p.updatedAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <Pagination base="/admin/products" current={sp} pageInfo={result.data.page.pageInfo} />
        </Panel>
      )}
    </>
  );
}
