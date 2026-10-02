import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCommerce } from "@/lib/commerce/server";
import { Container, Section } from "@/components/ui/Layout";
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
        <nav aria-label="Breadcrumb" className="py-5 text-[13px] text-mute">
          <Link href="/shop" className="hover:text-ink">Shop</Link> <span aria-hidden>/</span>{" "}
          <Link href={`/shop?category=${product.category}`} className="hover:text-ink">{categoryName(product.category)}</Link>
        </nav>
        <ProductDetail product={product} />
      </Container>
      <Section className="border-t border-line-soft !py-20 sm:!py-28" aria-labelledby="rel">
        <Container size="wide">
          <h2 id="rel" className="display-md mb-10">You may also like.</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </Container>
      </Section>
    </>
  );
}
