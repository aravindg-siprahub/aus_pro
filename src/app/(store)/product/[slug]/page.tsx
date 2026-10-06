import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCommerce } from "@/lib/commerce/server";
import { Container, Eyebrow, Section } from "@/components/ui/Layout";
import { ProductDetail } from "@/features/product/ProductDetail";
import { ProductCard } from "@/components/product/ProductCard";
import { categoryName } from "@/lib/commerce/mock-data";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await getCommerce().getProduct((await params).slug);
  return { title: p?.name ?? "Product" };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getCommerce().getProduct(slug);
  if (!product) notFound();
  const related = await getCommerce().getRelatedProducts(slug, 4);

  return (
    <>
      <Container size="wide">
        <nav aria-label="Breadcrumb" className="py-4 sm:py-8">
          <ol className="flex min-w-0 items-center gap-2.5 text-[12px] tracking-[0.04em] text-mute">
            <li className="shrink-0">
              <Link href="/shop" className="link-draw transition-colors hover:text-ink">Shop</Link>
            </li>
            <li aria-hidden className="shrink-0 text-line">/</li>
            <li className="shrink-0">
              <Link href={`/shop?category=${product.category}`} className="link-draw transition-colors hover:text-ink">
                {categoryName(product.category)}
              </Link>
            </li>
            <li aria-hidden className="shrink-0 text-line">/</li>
            <li className="min-w-0 truncate text-ink-2" aria-current="page">{product.name}</li>
          </ol>
        </nav>
        <ProductDetail product={product} />
      </Container>

      {related.length > 0 && (
        <Section className="border-t border-line-soft" aria-labelledby="related-heading">
          <Container size="wide">
            <div className="mb-10 sm:mb-14">
              <Eyebrow accent>Continue the edit</Eyebrow>
              <h2 id="related-heading" className="display-md mt-4">You may also like</h2>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </Container>
        </Section>
      )}
    </>
  );
}
