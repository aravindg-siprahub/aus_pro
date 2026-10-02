import type { Metadata } from "next";
import Link from "next/link";
import { getCommerce, getProviderMode } from "@/lib/commerce/server";
import { Container, PageHeader } from "@/components/ui/Layout";
import { Garment } from "@/components/product/Garment";
import { NoPhoto, Photo } from "@/components/product/ProductPhoto";
import { EmptyState } from "@/components/ui/Feedback";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Collections" };

const tint = { "round-neck": "#f2f0eb", polo: "#243050", oversized: "#cbc4b8", hoodie: "#1c1b1a" } as const;

export default async function CollectionsPage() {
  const [allCategories, products] = await Promise.all([getCommerce().listCategories(), getCommerce().listProducts()]);
  const live = getProviderMode() === "shopify";
  // With a real store, only show collections that actually have products, each fronted by a real product photo.
  const categories = live ? allCategories.filter((c) => products.some((p) => p.category === c.id)) : allCategories;
  const coverFor = (id: string) => products.find((p) => p.category === id && p.images?.length)?.images?.[0];

  return (
    <Container size="wide">
      <PageHeader eyebrow="Collections" title="Find your silhouette." description="Each collection is built around a single idea of fit." />
      {categories.length === 0 && (
        <EmptyState title="Collections are coming soon." description="There are no products in the store yet. Check back soon." actionHref="/" actionLabel="Back to home" />
      )}
      <ul className="space-y-3 pb-20 sm:space-y-5">
        {categories.map((c, i) => {
          const count = products.filter((p) => p.category === c.id).length;
          const cover = live ? coverFor(c.id) : undefined;
          const flip = i % 2 === 1;
          return (
            <li key={c.id}>
              <Reveal>
                <Link
                  href={`/shop?category=${c.id}`}
                  className="group grid items-center overflow-hidden rounded-tile bg-soft md:min-h-[480px] md:grid-cols-2"
                >
                  <div className={cn("p-8 sm:p-12 lg:p-16", flip && "md:order-2")}>
                    <p className="text-[13px] tabular-nums text-mute">0{i + 1}</p>
                    <h2 className="display-lg mt-4">{c.name}</h2>
                    <p className="lead mt-3">{c.tagline}</p>
                    <p className="mt-8 inline-flex items-center gap-3 text-[15px] font-medium">
                      <span className="link-draw">Shop {count} {count === 1 ? "style" : "styles"}</span>
                      <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white transition-transform duration-500 ease-[var(--ease-premium)] group-hover:translate-x-1">→</span>
                    </p>
                  </div>
                  <div className={cn("relative h-72 overflow-hidden sm:h-96 md:h-full", flip && "md:order-1")}>
                    {live ? (
                      <div className="absolute inset-0 transition-transform duration-[900ms] ease-[var(--ease-premium)] group-hover:scale-[1.04]">
                        {cover ? <Photo src={cover.url} alt={cover.alt} sizes="(min-width: 768px) 50vw, 100vw" priority={i === 0} /> : <NoPhoto name={c.name} />}
                      </div>
                    ) : (
                      <div className="absolute inset-0 grid place-items-center p-[8%] transition-transform duration-[900ms] ease-[var(--ease-premium)] group-hover:scale-[1.05]">
                        <Garment type={c.id} color={tint[c.id]} className="h-full w-full shadow-product" title="" />
                      </div>
                    )}
                  </div>
                </Link>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
