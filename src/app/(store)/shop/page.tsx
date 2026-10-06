import type { Metadata } from "next";
import { getCommerce } from "@/lib/commerce/server";
import { Container, PageHeader } from "@/components/ui/Layout";
import { ShopGrid } from "@/features/product/ShopGrid";
import type { CategoryId } from "@/types/commerce";

export const metadata: Metadata = { title: "Shop" };

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const [products, categories] = await Promise.all([getCommerce().listProducts(), getCommerce().listCategories()]);
  const initial = categories.find((c) => c.id === category)?.id as CategoryId | undefined;

  return (
    <Container size="wide">
      <PageHeader
        eyebrow="Shop"
        title={<>The <em>collection</em></>}
        description="Considered essentials, cut for everyday wear and printed to order. Choose a piece, then make it yours."
        className="pb-12 sm:pb-16 lg:pt-28"
      />
      <ShopGrid products={products} categories={categories} initialCategory={initial} />
    </Container>
  );
}
