"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Category, CategoryId, Product } from "@/types/commerce";
import { ProductCard } from "@/components/product/ProductCard";
import { Select, Swatch } from "@/components/ui/Controls";
import { EmptyState } from "@/components/ui/Feedback";
import { cn } from "@/lib/cn";

type Sort = "featured" | "price-asc" | "price-desc";
type Tab = CategoryId | "all";

const EASE = [0.22, 1, 0.36, 1] as const;

export function ShopGrid({
  products,
  categories,
  initialCategory,
}: {
  products: Product[];
  categories: Category[];
  initialCategory?: CategoryId;
}) {
  const reduce = useReducedMotion();
  const [category, setCategory] = useState<Tab>(initialCategory ?? "all");
  const [colorName, setColorName] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("featured");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

  const pick = (c: Tab) => {
    setCategory(c);
    const url = new URL(window.location.href);
    if (c === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", c);
    window.history.replaceState(null, "", url);
  };
  const clear = () => {
    pick("all");
    setColorName(null);
  };

  // Only categories that have something in them (plus one asked for in the URL, which then shows its empty state).
  const tabs: { id: Tab; name: string }[] = [
    { id: "all", name: "All" },
    ...categories.filter((c) => c.id === initialCategory || products.some((p) => p.category === c.id)),
  ];
  const filtered = category !== "all" || colorName !== null;

  // Tabs pattern: arrows move between tabs and select them; only the selected tab is in the tab order.
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const last = tabs.length - 1;
    const next =
      e.key === "ArrowRight" ? (idx === last ? 0 : idx + 1)
      : e.key === "ArrowLeft" ? (idx === 0 ? last : idx - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    pick(tabs[next].id);
    tabRefs.current[next]?.focus();
  };

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

  const count = (
    <p className="whitespace-nowrap text-[13px] tabular-nums text-mute" aria-live="polite">
      {visible.length} {visible.length === 1 ? "piece" : "pieces"}
    </p>
  );
  const colours = (
    <div role="radiogroup" aria-label="Filter by colour" className="-ml-2 flex flex-wrap items-center lg:ml-0">
      <span aria-hidden className="eyebrow ml-2 mr-2 lg:ml-0">Colour</span>
      {allColors.map(([name, hex]) => (
        <Swatch key={name} hex={hex} label={name} size="sm" selected={colorName === name} onSelect={() => setColorName(colorName === name ? null : name)} />
      ))}
    </div>
  );
  const sorter = (id: string) => (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="eyebrow">Sort</label>
      <Select
        id={id}
        value={sort}
        onChange={(e) => setSort(e.target.value as Sort)}
        className="!h-9 !w-auto !bg-transparent !pl-3 !pr-10 !text-[16px] sm:!text-[13px]"
      >
        <option value="featured">Featured</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
      </Select>
    </div>
  );

  return (
    <>
      {/* Category tabs stay pinned under the header; on large screens the whole filter bar does */}
      <div className="sticky top-[var(--sticky-top)] z-30 -mx-5 border-b border-line-soft bg-canvas px-5 transition-[top] duration-500 ease-[var(--ease-premium)] motion-reduce:transition-none sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
        <div className="flex items-center justify-between gap-8">
          <div role="tablist" aria-label="Category" className="no-scrollbar -mx-1 flex min-w-0 gap-6 overflow-x-auto px-1 sm:gap-8">
            {tabs.map((t, idx) => {
              const on = category === t.id;
              return (
                <button
                  key={t.id}
                  ref={(el) => { tabRefs.current[idx] = el; }}
                  id={`shop-tab-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls="shop-results"
                  tabIndex={on ? 0 : -1}
                  onClick={() => pick(t.id)}
                  onKeyDown={(e) => onTabKey(e, idx)}
                  className={cn(
                    "relative shrink-0 whitespace-nowrap py-4 text-[14px] tracking-[0.01em] transition-colors duration-300 focus-visible:outline-offset-[-2px]",
                    on ? "text-ink" : "text-mute hover:text-ink",
                  )}
                >
                  {t.name}
                  {on && (
                    <motion.span
                      layoutId="shop-tab-underline"
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-px bg-ink"
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 38 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          <div className="hidden shrink-0 items-center gap-8 lg:flex">
            {colours}
            <span aria-hidden className="h-4 w-px bg-line" />
            {count}
            {sorter("sort")}
          </div>
        </div>
      </div>

      {/* Phones and tablets: the secondary filters scroll with the page so the pinned bar stays slim */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4 lg:hidden">
        {colours}
        <div className="flex items-center gap-5">
          {count}
          {sorter("sort-m")}
        </div>
      </div>

      <div id="shop-results" role="tabpanel" aria-labelledby={`shop-tab-${category}`} className="pt-6 lg:pt-12">
        {filtered && visible.length > 0 && (
          <p className="-mt-2 mb-6 text-[13px] text-mute lg:-mt-6 lg:mb-10">
            {colorName ? <>Showing {colorName.toLowerCase()} pieces. </> : null}
            <button type="button" className="link-draw font-medium text-ink" onClick={clear}>
              Clear filters
            </button>
          </p>
        )}

        {visible.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center sm:py-32">
            <p className="eyebrow">No pieces</p>
            <h2 className="display-md mt-4">Nothing in that combination.</h2>
            <p className="lead mt-4">Try another colour or category, or see everything we make.</p>
            <button type="button" onClick={clear} className="group mt-8 inline-flex min-h-10 items-center gap-2 text-[14px] font-medium text-ink">
              <span className="link-draw">Show all pieces</span>
              <span aria-hidden className="transition-transform duration-300 ease-[var(--ease-premium)] group-hover:translate-x-1 motion-reduce:transition-none">→</span>
            </button>
          </div>
        ) : (
          <motion.ul
            layout={!reduce}
            className="grid grid-cols-2 gap-x-3 gap-y-14 pb-16 sm:gap-x-6 sm:gap-y-16 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-24 lg:pb-24"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((p) => (
                <motion.li
                  key={p.id}
                  layout={!reduce}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  transition={{ duration: reduce ? 0.15 : 0.5, ease: EASE }}
                  className="min-w-0"
                >
                  <ProductCard product={p} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </>
  );
}
