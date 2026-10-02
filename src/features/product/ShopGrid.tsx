"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Category, CategoryId, Product } from "@/types/commerce";
import { ProductCard } from "@/components/product/ProductCard";
import { Select, Swatch } from "@/components/ui/Controls";
import { EmptyState } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Sort = "featured" | "price-asc" | "price-desc";

export function ShopGrid({
  products,
  categories,
  initialCategory,
}: {
  products: Product[];
  categories: Category[];
  initialCategory?: CategoryId;
}) {
  const [category, setCategory] = useState<CategoryId | "all">(initialCategory ?? "all");
  const [colorName, setColorName] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("featured");

  const allColors = useMemo(() => {
    const m = new Map<string, string>();
    products.forEach((p) => p.colors.forEach((c) => m.set(c.name, c.hex)));
    return [...m.entries()];
  }, [products]);

  const visible = useMemo(() => {
    const list = products.filter(
      (p) => (category === "all" || p.category === category) && (!colorName || p.colors.some((c) => c.name === colorName)),
    );
    if (sort === "price-asc") return [...list].sort((a, b) => a.basePrice - b.basePrice);
    if (sort === "price-desc") return [...list].sort((a, b) => b.basePrice - a.basePrice);
    return list;
  }, [products, category, colorName, sort]);

  const pick = (c: CategoryId | "all") => {
    setCategory(c);
    const url = new URL(window.location.href);
    if (c === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", c);
    window.history.replaceState(null, "", url);
  };

  const tabs: { id: CategoryId | "all"; name: string }[] = [{ id: "all", name: "All" }, ...categories];
  const filtered = category !== "all" || colorName;

  if (products.length === 0) {
    return (
      <EmptyState
        title="New pieces are on their way."
        description="There’s nothing in the shop just yet. Check back soon."
        actionHref="/"
        actionLabel="Back to home"
      />
    );
  }

  return (
    <>
      <div className="sticky top-[var(--sticky-top)] z-30 -mx-5 border-b border-line-soft bg-canvas px-5 transition-[top] duration-500 ease-[var(--ease-premium)] sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
        <div className="flex items-center justify-between gap-4 py-3">
          <div role="tablist" aria-label="Category" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={category === t.id}
                onClick={() => pick(t.id)}
                className={cn(
                  "relative shrink-0 rounded-full px-4 py-2 text-[14px] transition-colors duration-300",
                  category === t.id ? "text-white" : "text-ink-2 hover:text-ink",
                )}
              >
                {category === t.id && (
                  <motion.span layoutId="shop-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                )}
                <span className="relative">{t.name}</span>
              </button>
            ))}
          </div>
          <div className="hidden shrink-0 sm:block">
            <label htmlFor="sort" className="sr-only">Sort products</label>
            <Select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="!h-10 !w-auto !rounded-full !pr-9 !text-[14px]">
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to high</option>
              <option value="price-desc">Price: High to low</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 py-6">
        <div role="radiogroup" aria-label="Filter by colour" className="flex flex-wrap items-center gap-0.5">
          <span className="mr-2 text-[13px] text-mute">Colour</span>
          {allColors.map(([name, hex]) => (
            <Swatch key={name} hex={hex} label={name} size="sm" selected={colorName === name} onSelect={() => setColorName(colorName === name ? null : name)} />
          ))}
        </div>
        <div className="flex items-center gap-4">
          <p className="text-[14px] text-mute" aria-live="polite">{visible.length} {visible.length === 1 ? "product" : "products"}</p>
          <div className="sm:hidden">
            <label htmlFor="sort-m" className="sr-only">Sort products</label>
            <Select id="sort-m" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="!h-9 !w-auto !rounded-full !text-[13px]">
              <option value="featured">Featured</option>
              <option value="price-asc">Price ↑</option>
              <option value="price-desc">Price ↓</option>
            </Select>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="Nothing matches that." description="Try a different colour or category.">
          <Button variant="secondary" className="mt-8" onClick={() => { pick("all"); setColorName(null); }}>Clear filters</Button>
        </EmptyState>
      ) : (
        <motion.ul layout className="grid grid-cols-2 gap-x-3 gap-y-12 pb-8 sm:gap-x-5 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-16">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((p) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProductCard product={p} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
      {filtered && visible.length > 0 && (
        <p className="pb-8 text-center text-[14px]">
          <button className="text-ink font-medium link-draw" onClick={() => { pick("all"); setColorName(null); }}>Clear filters</button>
        </p>
      )}
    </>
  );
}
