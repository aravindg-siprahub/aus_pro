import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadAdmin } from "@/lib/admin/load";
import { getProduct } from "@/lib/shopify/admin/service";
import { formatDateTime } from "@/components/admin/format";
import { PageTitle, Panel, ProblemPanel, ProductStatusBadge, StockBadge } from "@/components/admin/ui";
import { ProductVariants } from "@/components/admin/ProductVariants";

export const metadata: Metadata = { title: "Product" };

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadAdmin("product.read", () => getProduct(id));
  if (!result.ok) {
    return (
      <>
        <PageTitle title="Product" />
        <ProblemPanel problem={result.problem} />
      </>
    );
  }
  const p = result.data;
  if (!p) notFound();

  return (
    <>
      <p className="mb-3 text-[13px]"><Link href="/admin/products" className="text-mute underline-offset-4 hover:text-ink hover:underline">← Products</Link></p>
      <PageTitle
        title={p.title}
        description={[p.productType, p.vendor].filter(Boolean).join(" · ") || undefined}
        actions={<div className="flex items-center gap-2"><ProductStatusBadge status={p.status} /><StockBadge inventory={p.inventory} /></div>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Panel title="Images">
            {p.images.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-mute">No images on this product.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 p-3">
                {p.images.map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element -- Shopify CDN images
                  <img key={img.url} src={img.url} alt={img.alt} loading={i === 0 ? "eager" : "lazy"} className={`w-full rounded-lg bg-soft object-cover ${i === 0 ? "col-span-2 aspect-square" : "aspect-square"}`} />
                ))}
              </div>
            )}
          </Panel>
          <Panel title="Details">
            <dl className="divide-y divide-line-soft text-[14px]">
              <Row k="Handle" v={p.handle} />
              <Row k="Created" v={formatDateTime(p.createdAt)} />
              <Row k="Updated" v={formatDateTime(p.updatedAt)} />
              <Row k="Tags" v={p.tags.length ? p.tags.join(", ") : "None"} />
            </dl>
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          {p.description && (
            <Panel title="Description"><p className="whitespace-pre-line px-5 py-4 text-[14px] leading-relaxed text-ink-2">{p.description}</p></Panel>
          )}
          <ProductVariants options={p.options} variants={p.variants} truncated={p.variantsTruncated} />
        </div>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 px-5 py-2.5">
      <dt className="text-mute">{k}</dt>
      <dd className="break-words text-right">{v}</dd>
    </div>
  );
}
