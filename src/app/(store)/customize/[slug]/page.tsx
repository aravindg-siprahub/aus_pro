import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCommerce } from "@/lib/commerce/server";
import { Customizer, type CustomizerQuery } from "@/features/customizer/Customizer";

/** Deep-link keys the studio understands; see CustomizerQuery. A repeated key arrives as an array. */
type QueryKey = "edit" | "color" | "size" | "text" | "font" | "place" | "print" | "ink";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Partial<Record<QueryKey, string | string[]>>>;
};

const KEYS: QueryKey[] = ["edit", "color", "size", "text", "font", "place", "print", "ink"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getCommerce().getProduct((await params).slug);
  return { title: p ? `Customize ${p.name}` : "Customize" };
}

export default async function CustomizePage({ params, searchParams }: Props) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  const product = await getCommerce().getProduct(slug);
  if (!product) notFound();

  // Keep single string values only; the Customizer validates each one against its known options.
  const query: CustomizerQuery = {};
  for (const k of KEYS) {
    const v = raw[k];
    if (typeof v === "string") query[k] = v;
  }

  // Query values are read on the server and passed down, so the page renders in one pass.
  return <Customizer key={query.edit ?? "new"} product={product} query={query} />;
}
