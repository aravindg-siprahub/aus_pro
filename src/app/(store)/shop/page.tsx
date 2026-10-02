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
      <PageHeader eyebrow="Shop" title="Every piece, ready for your idea." description="Four silhouettes, thoughtfully made. Choose one and make it yours." />
      <ShopGrid products={products} categories={categories} initialCategory={initial} />
    </Container>
  );
}
