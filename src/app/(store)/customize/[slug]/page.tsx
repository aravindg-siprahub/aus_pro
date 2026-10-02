import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCommerce } from "@/lib/commerce/server";
import { Customizer } from "@/features/customizer/Customizer";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edit?: string; color?: string; size?: string; text?: string; font?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getCommerce().getProduct((await params).slug);
  return { title: p ? `Customize ${p.name}` : "Customize" };
}

export default async function CustomizePage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const product = await getCommerce().getProduct(slug);
  if (!product) notFound();

  // Query values are read on the server and passed down, so the page renders in one pass.
  return <Customizer key={query.edit ?? "new"} product={product} query={query} />;
}
