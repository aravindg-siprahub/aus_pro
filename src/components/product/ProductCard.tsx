"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product, ProductColor } from "@/types/commerce";
import { Garment } from "./Garment";
import { NoPhoto, Photo, leadImageUrl, photoFor } from "./ProductPhoto";
import { formatPrice } from "@/lib/pricing";
import { categoryName } from "@/lib/commerce/mock-data";
import { cn } from "@/lib/cn";

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
  const [i, setI] = useState(0);
  const color = product.colors[i];
  const hasBack = product.category !== "hoodie";
  // The card opens the customizer for the shown colour; product details stay one tap away.
  const href = `/customize/${product.slug}?color=${color.id}`;
  const detailsHref = `/product/${product.slug}`;

  return (
    <article className={cn("group", className)}>
      <div className="relative">
        <Link href={href} className="block rounded-tile focus-visible:outline-offset-4" aria-label={`Customize ${product.name}, ${formatPrice(product.basePrice)}`}>
          <div className={cn("relative aspect-[4/5] overflow-hidden rounded-tile", surface === "soft" ? "bg-soft" : "bg-canvas")}>
            {product.badge && (
              <span className="absolute left-4 top-4 z-10 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
                {product.badge}
              </span>
            )}
            {product.images ? (
              <CardPhotos product={product} color={color} />
            ) : (
              /* Mock catalogue: front and back illustrations stacked; hover crossfades to the back */
              <div className="absolute inset-0 transition-transform duration-[900ms] ease-[var(--ease-premium)] group-hover:scale-[1.035] motion-reduce:transition-none">
                <Garment type={product.category} color={color.hex} className={cn("absolute inset-[10%] h-[80%] w-[80%] transition-opacity duration-500", hasBack && "group-hover:opacity-0")} title={`${product.name} in ${color.name}`} />
                {hasBack && (
                  <Garment type={product.category} color={color.hex} view="back" className="absolute inset-[10%] h-[80%] w-[80%] opacity-0 transition-opacity duration-500 group-hover:opacity-100" title="" />
                )}
              </div>
            )}
          </div>
        </Link>
        {/* Product details; shown on hover or keyboard focus */}
        <Link
          href={detailsHref}
          className="absolute bottom-4 right-4 hidden translate-y-1.5 items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white opacity-0 transition-[opacity,transform] duration-500 ease-[var(--ease-premium)] group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 lg:inline-flex"
        >
          Details <span aria-hidden>→</span>
          <span className="sr-only"> {product.name}</span>
        </Link>
      </div>
      <div className="mt-4 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-mute">{categoryName(product.category)}</p>
          <h3 className="mt-1 text-[16px] font-semibold tracking-[-0.015em] sm:text-[18px]">
            <Link href={href} className="link-draw">{product.name}</Link>
          </h3>
        </div>
        <p className="mt-[18px] shrink-0 text-[15px] tabular-nums text-ink-2 sm:mt-[19px]">{formatPrice(product.basePrice)}</p>
      </div>
      <div className="mt-3 flex items-center gap-0.5 px-0.5" role="group" aria-label={`${product.name} colours`}>
        {product.colors.map((c, idx) => (
          <button
            key={c.id}
            type="button"
            aria-label={`Show ${c.name}`}
            aria-pressed={idx === i}
            onClick={() => setI(idx)}
            onMouseEnter={() => setI(idx)}
            className="grid h-7 w-7 place-items-center rounded-full"
          >
            <span
              className={cn(
                "block h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-black/15 transition-transform duration-300",
                idx === i ? "scale-100 outline outline-1 outline-offset-2 outline-ink" : "scale-[0.85] hover:scale-100",
              )}
              style={{ background: c.hex }}
            />
          </button>
        ))}
      </div>
    </article>
  );
}

const CARD_SIZES = "(min-width: 1024px) 30vw, 50vw";

/** Shopify photos: the colour's front photo leads; hover turns it around to the back when there is one. */
function CardPhotos({ product, color }: { product: Product; color: ProductColor }) {
  const images = product.images ?? [];
  const lead = leadImageUrl(product, color);
  if (!lead) return <NoPhoto name={product.name} />;
  const leadAlt = images.find((img) => img.url === lead)?.alt ?? `${product.name} in ${color.name}`;
  const second = photoFor(product, color, "back") ?? images.find((img) => img.url !== lead && img.view === "front");
  return (
    <div className="absolute inset-0 transition-transform duration-[900ms] ease-[var(--ease-premium)] group-hover:scale-[1.035] motion-reduce:transition-none">
      <Photo key={lead} src={lead} alt={leadAlt} sizes={CARD_SIZES} className={second ? "group-hover:!opacity-0" : undefined} />
      {second && (
        <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <Photo src={second.url} alt="" sizes={CARD_SIZES} />
        </div>
      )}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden>
      <div className="skeleton aspect-[4/5] rounded-tile" />
      <div className="skeleton mt-4 h-3 w-1/4 rounded-lg" />
      <div className="skeleton mt-2 h-5 w-2/3 rounded-lg" />
    </div>
  );
}
