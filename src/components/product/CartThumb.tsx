"use client";

import { useEffect, useState } from "react";
import type { CartItem, Product } from "@/types/commerce";
import { commerce } from "@/lib/commerce";
import { getShopConfig } from "@/lib/shop-config";
import { fontById } from "@/features/customizer/config";
import { Garment } from "./Garment";
import { Photo, photoFor } from "./ProductPhoto";
import { cn } from "@/lib/cn";

/**
 * The catalogue, fetched once per page load and shared by every thumbnail, so a bag line can show the
 * real Shopify photo of the colour it holds. Read-only: it never touches the bag or checkout data.
 */
let catalogue: Promise<Product[]> | null = null;
function loadCatalogue() {
  catalogue ??= commerce.listProducts().catch(() => {
    catalogue = null; // try again on the next mount
    return [];
  });
  return catalogue;
}

/** Print text width relative to the photo, per print size (matches the studio's photo preview). */
const FONT_CQW = { small: 3.4, medium: 5, large: 6.8 } as const;

/**
 * A bag, checkout or order line's picture: the real photo of the chosen colour with the customer's text
 * laid over it in Shopify mode, or the print-layout drawing for the demo catalogue.
 * Callers size it (e.g. `w-24 aspect-[4/5]`).
 */
export function CartThumb({ item, className }: { item: CartItem; className?: string }) {
  const view = item.customization?.location === "back" ? "back" : "front";
  const hosted = getShopConfig().provider === "shopify";
  const [product, setProduct] = useState<Product | null | undefined>(undefined);

  useEffect(() => {
    if (!hosted) return;
    let live = true;
    loadCatalogue().then((list) => {
      if (live) setProduct(list.find((p) => p.id === item.productId || p.slug === item.productSlug) ?? null);
    });
    return () => {
      live = false;
    };
  }, [hosted, item.productId, item.productSlug]);

  if (!hosted) {
    return (
      <div className={cn("relative shrink-0 overflow-hidden rounded-tile bg-soft p-[9%]", className)}>
        <Garment
          type={item.category}
          color={item.colorHex}
          view={view}
          customization={item.customization}
          className="h-full w-full"
          title={`${item.title} in ${item.colorName}`}
        />
      </div>
    );
  }

  // Never another colour's photo: the colour's own shot of the printed side, else its front, else a quiet tile.
  const color = product?.colors.find((c) => c.id === item.colorId);
  const photo = product && color ? (photoFor(product, color, view) ?? photoFor(product, color, "front")) : undefined;
  const c = item.customization;
  const showText = !!photo && !!c?.text.trim() && c.location === photo.view;
  const f = c ? fontById(c.fontId) : null;

  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-tile bg-soft", className)}
      style={{ containerType: "inline-size" }}
      role={photo ? undefined : "img"}
      aria-label={photo ? undefined : `${item.title} in ${item.colorName}`}
    >
      {photo && <Photo src={photo.url} alt={`${item.title} in ${item.colorName}`} sizes="176px" />}
      {showText && c && f && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 w-[60%] -translate-x-1/2 -translate-y-1/2 break-words text-center leading-[1.05]"
          style={{
            top: photo.view === "back" ? "36%" : "44%",
            fontFamily: f.family,
            fontWeight: c.fontId === "sans" ? 700 : 500,
            letterSpacing: c.fontId === "condensed" ? "0.04em" : "-0.01em",
            fontSize: `${FONT_CQW[c.printSize]}cqw`,
            color: c.textColor,
          }}
        >
          {c.text}
        </span>
      )}
    </div>
  );
}
