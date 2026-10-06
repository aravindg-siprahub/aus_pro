"use client";

import Link from "next/link";
import { useState, type PointerEvent } from "react";
import type { Product, ProductColor } from "@/types/commerce";
import { Garment } from "./Garment";
import { NoPhoto, Photo, leadImageUrl, photoFor } from "./ProductPhoto";
import { formatPrice } from "@/lib/pricing";
import { availabilityOf, sizeRange, type Availability } from "@/lib/commerce/availability";
import { categoryName } from "@/lib/commerce/mock-data";
import { cn } from "@/lib/cn";

/* The second photo shows on hover, and when a link inside the card has keyboard focus (not on a tapped swatch). */
const REVEAL = "group-hover:opacity-100 group-has-[a:focus-visible]:opacity-100";
const CONCEAL = "group-hover:!opacity-0 group-has-[a:focus-visible]:!opacity-0";
const ZOOM =
  "absolute inset-0 transition-transform duration-[900ms] ease-[var(--ease-premium)] group-hover:scale-[1.03] " +
  "group-has-[a:focus-visible]:scale-[1.03] motion-reduce:transition-none motion-reduce:!scale-100";

const DOT: Record<Availability["status"], string> = {
  in_stock: "bg-success",
  limited: "bg-accent",
  sold_out: "bg-mute",
};

export function ProductCard({
  product,
  surface = "soft",
  className,
}: {
  product: Product;
  /** Tile colour: "soft" on the page canvas, "canvas" when placed on a soft section. */
  surface?: "soft" | "canvas";
  className?: string;
}) {
  const [selected, setSelected] = useState(0);
  // Pointer hover over a swatch previews that colour; leaving the swatches returns to the chosen one.
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? selected;
  const color = product.colors[shown];
  const hasBack = product.category !== "hoodie";
  const stock = availabilityOf(product, color.id);
  const sizes = sizeRange(product.sizes);
  // The card opens the customizer for the shown colour; product details stay one tap away.
  const href = `/customize/${product.slug}?color=${encodeURIComponent(color.id)}`;
  const detailsHref = `/product/${product.slug}`;
  const onSwatchHover = (idx: number) => (e: PointerEvent) => {
    if (e.pointerType === "mouse") setPreview(idx);
  };

  return (
    <article className={cn("group relative", className)}>
      <Link
        href={href}
        className="block rounded-tile focus-visible:outline-offset-4"
        aria-label={`Customise ${product.name} in ${color.name}, ${formatPrice(product.basePrice)}`}
      >
        <div className={cn("relative aspect-[4/5] overflow-hidden rounded-tile", surface === "soft" ? "bg-soft" : "bg-canvas")}>
          {product.images ? (
            <CardPhotos product={product} color={color} />
          ) : (
            /* Demo catalogue: front and back illustrations stacked; hover crossfades to the back */
            <div className={ZOOM}>
              <Garment
                type={product.category}
                color={color.hex}
                className={cn("absolute inset-[10%] h-[80%] w-[80%] transition-opacity duration-500 motion-reduce:transition-none", hasBack && CONCEAL)}
                title={`${product.name} in ${color.name}`}
              />
              {hasBack && (
                <Garment
                  type={product.category}
                  color={color.hex}
                  view="back"
                  className={cn("absolute inset-[10%] h-[80%] w-[80%] opacity-0 transition-opacity duration-500 motion-reduce:transition-none", REVEAL)}
                  title=""
                />
              )}
            </div>
          )}
        </div>
      </Link>

      <div className="mt-4 sm:mt-5">
        <p className="eyebrow flex flex-wrap items-baseline gap-x-2 !tracking-[0.18em]">
          <span>{categoryName(product.category)}</span>
          {product.badge && (
            <>
              <span aria-hidden className="text-line">/</span>
              <span className="text-accent">{product.badge}</span>
            </>
          )}
        </p>

        <div className="mt-2 flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 text-[14px] font-medium leading-snug tracking-[-0.005em] text-ink sm:text-[15px]">
            {/* Same destination as the image; kept out of the tab order so the card is one stop, not two */}
            <Link href={href} tabIndex={-1} className="link-draw">
              {product.name}
            </Link>
          </h3>
          <p className="shrink-0 text-[14px] tabular-nums text-ink-2 sm:text-[15px]">{formatPrice(product.basePrice)}</p>
        </div>

        <div className="mt-1 flex items-center justify-between gap-3">
          <div
            role="group"
            aria-label={`${product.name} colours`}
            className="-ml-2 flex items-center"
            onPointerLeave={() => setPreview(null)}
          >
            {product.colors.map((c, idx) => (
              <button
                key={c.id}
                type="button"
                aria-label={`Show ${c.name}`}
                aria-pressed={idx === selected}
                title={c.name}
                onClick={() => { setSelected(idx); setPreview(null); }}
                onPointerEnter={onSwatchHover(idx)}
                className="grid h-10 w-7 place-items-center rounded-full focus-visible:outline-offset-0"
              >
                <span
                  className={cn(
                    "block h-2.5 w-2.5 rounded-full ring-1 ring-inset ring-ink/25 transition-[outline-color,transform] duration-300 ease-[var(--ease-premium)] motion-reduce:transition-none",
                    idx === shown ? "outline outline-1 outline-offset-[3px] outline-ink" : "outline outline-1 outline-offset-[3px] outline-transparent",
                  )}
                  style={{ background: c.hex }}
                />
              </button>
            ))}
          </div>
          {sizes && (
            <p className="shrink-0 text-[12px] tracking-[0.04em] text-mute">
              <span className="sr-only">Sizes </span>
              {sizes}
            </p>
          )}
        </div>

        <div className="-mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="flex items-center gap-2 text-[12px] text-mute">
            <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[stock.status])} />
            <span>
              <span className="sr-only">{color.name}: </span>
              {stock.label}
            </span>
          </p>
          {/* Always visible on touch screens; on pointer devices it draws in on hover or keyboard focus */}
          <Link
            href={detailsHref}
            className={cn(
              "-my-2 inline-flex min-h-10 items-center gap-1.5 text-[12px] font-medium tracking-[0.04em] text-ink",
              "transition-opacity duration-500 ease-[var(--ease-premium)] motion-reduce:transition-none",
              "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100",
            )}
          >
            <span className="link-draw">Details</span>
            <span aria-hidden>→</span>
            <span className="sr-only"> of {product.name}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

const CARD_SIZES = "(min-width: 1024px) 30vw, 50vw";

/** Shopify photos: the colour's front photo leads; hover turns it to the back (or another front photo). */
function CardPhotos({ product, color }: { product: Product; color: ProductColor }) {
  const images = product.images ?? [];
  const lead = leadImageUrl(product, color);
  if (!lead) return <NoPhoto name={product.name} />;
  const leadAlt = images.find((img) => img.url === lead)?.alt ?? `${product.name} in ${color.name}`;
  const second = photoFor(product, color, "back") ?? images.find((img) => img.url !== lead && img.view === "front");
  return (
    <div className={ZOOM}>
      <Photo key={lead} src={lead} alt={leadAlt} sizes={CARD_SIZES} className={second ? CONCEAL : undefined} />
      {second && (
        <div className={cn("absolute inset-0 opacity-0 transition-opacity duration-500 ease-[var(--ease-premium)] motion-reduce:transition-none", REVEAL)}>
          <Photo key={second.url} src={second.url} alt="" sizes={CARD_SIZES} />
        </div>
      )}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden>
      <div className="skeleton aspect-[4/5] rounded-tile" />
      <div className="skeleton mt-5 h-2.5 w-1/4 rounded-tile" />
      <div className="mt-3 flex justify-between gap-6">
        <div className="skeleton h-4 w-1/2 rounded-tile" />
        <div className="skeleton h-4 w-1/6 rounded-tile" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-3">
          <div className="skeleton h-2.5 w-2.5 rounded-full" />
          <div className="skeleton h-2.5 w-2.5 rounded-full" />
          <div className="skeleton h-2.5 w-2.5 rounded-full" />
        </div>
        <div className="skeleton h-2.5 w-12 rounded-tile" />
      </div>
      <div className="skeleton mt-4 h-2.5 w-1/3 rounded-tile" />
    </div>
  );
}
