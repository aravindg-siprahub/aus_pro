"use client";

import Image from "next/image";
import { useState } from "react";
import type { PhotoView, Product, ProductColor, ProductImage } from "@/types/commerce";
import { cn } from "@/lib/cn";

/**
 * Shown when a Shopify product has no photos yet. Deliberately not a stand-in garment: it says what it is,
 * quietly, as a caption on the tile.
 */
export function NoPhoto({ name, className }: { name: string; className?: string }) {
  return (
    <div className={cn("absolute inset-0 grid place-items-center p-6 text-center", className)} role="img" aria-label={`${name}: no photo yet`}>
      <div aria-hidden>
        <span className="mx-auto block h-px w-8 bg-line" />
        <p className="eyebrow mt-4">Photograph to follow</p>
      </div>
    </div>
  );
}

/**
 * The real photo of one side of one colour, or undefined when Shopify has none. Never substitutes another
 * colour or side, so a customer is never shown a garment they aren't buying.
 */
export function photoFor(product: Product, color: ProductColor, view: PhotoView): ProductImage | undefined {
  const images = product.images ?? [];
  if (view === "front") {
    return images.find((img) => img.url === color.imageUrl) ?? images.find((img) => img.view === "front" && img.colorId === color.id);
  }
  return images.find((img) => img.view === "back" && img.colorId === color.id);
}

/** The photo to lead with on cards: the colour's own front photo, otherwise the first front photo. */
export function leadImageUrl(product: Product, color?: ProductColor) {
  const images = product.images ?? [];
  return (color && photoFor(product, color, "front")?.url) ?? images.find((img) => img.view === "front")?.url ?? images[0]?.url;
}

/** A Shopify CDN photo that fades in once decoded, so tiles never flash a half-painted image. */
export function Photo({
  src,
  alt,
  sizes,
  priority,
  eager,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Load straight away without preloading (small thumbnails inside scroll strips). */
  eager?: boolean;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) return <NoPhoto name={alt} />;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : eager ? "eager" : "lazy"}
      // Priority images can finish before hydration, when onLoad has no listener yet: check on mount too.
      ref={(el) => { if (el?.complete && el.naturalWidth > 0 && !loaded) setLoaded(true); }}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={cn("object-cover transition-opacity duration-500 ease-[var(--ease-premium)]", loaded ? "opacity-100" : "opacity-0", className)}
    />
  );
}
