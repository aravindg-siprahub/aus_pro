"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductImage } from "@/types/commerce";
import { NoPhoto, Photo } from "./ProductPhoto";
import { cn } from "@/lib/cn";

/**
 * Photo gallery for the product page. The main stage is a scroll-snap track, so touch swipe works natively;
 * thumbnails, arrow buttons and the arrow keys move between photos. `focusUrl` jumps to a photo (e.g. the
 * selected colour's) whenever it changes.
 */
export function ProductGallery({
  images,
  name,
  focusUrl,
  className,
}: {
  images: ProductImage[];
  name: string;
  focusUrl?: string;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = images.length;

  const go = useCallback((i: number, smooth = true) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(count - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
    setIndex(next);
  }, [count]);

  // Keep the index in step with swipes.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    if (!focusUrl) return;
    const i = images.findIndex((img) => img.url === focusUrl);
    if (i >= 0) go(i);
  }, [focusUrl, images, go]);

  // On phones the photo is capped so the name, price and options still show on the first screen.
  const stage = "relative overflow-hidden rounded-tile bg-soft aspect-[4/5] max-h-[56svh] w-full sm:aspect-square sm:max-h-[70svh] lg:aspect-auto lg:h-[calc(100svh-7rem)] lg:max-h-[860px] lg:min-h-[520px] lg:flex-1";

  if (count === 0) {
    return <div className={cn(stage, className)}><NoPhoto name={name} /></div>;
  }

  return (
    <div className={cn("flex flex-col lg:flex-row lg:gap-4", className)}>
      {count > 1 && (
        <div role="tablist" aria-label="Product photos" className="no-scrollbar order-2 mt-4 hidden gap-2.5 sm:flex overflow-x-auto px-0.5 py-1 lg:order-1 lg:mt-0 lg:max-h-[860px] lg:flex-col lg:overflow-y-auto lg:overflow-x-visible">
          {images.map((img, i) => (
            <button
              key={img.url}
              role="tab"
              aria-selected={i === index}
              aria-label={`Photo ${i + 1} of ${count}`}
              onClick={() => go(i)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-soft transition-[opacity,transform] duration-300 ease-[var(--ease-premium)] hover:scale-[1.04] sm:h-[72px] sm:w-[72px]",
                i === index ? "opacity-100 outline outline-[1.5px] outline-offset-2 outline-ink" : "opacity-55 hover:opacity-100",
              )}
            >
              <Photo src={img.url} alt="" sizes="72px" eager />
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(stage, "order-1 lg:order-2")}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${name} photos`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
        }}
      >
        <div ref={track} className="no-scrollbar absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain">
          {images.map((img, i) => (
            <div
              key={img.url}
              className="relative h-full w-full shrink-0 snap-center"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={i !== index}
            >
              <Photo src={img.url} alt={img.alt} sizes="(min-width: 1024px) 60vw, 100vw" priority={i === 0} />
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <GalleryArrow dir="prev" disabled={index === 0} onClick={() => go(index - 1)} />
            <GalleryArrow dir="next" disabled={index === count - 1} onClick={() => go(index + 1)} />
            <p className="absolute bottom-4 right-4 rounded-full bg-black/45 px-2.5 py-1 text-[12px] tabular-nums text-white backdrop-blur-sm" aria-live="polite">
              {index + 1} / {count}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function GalleryArrow({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Previous photo" : "Next photo"}
      className={cn(
        "absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink shadow-sm backdrop-blur transition-opacity duration-300 hover:bg-white disabled:pointer-events-none disabled:opacity-0 sm:grid",
        dir === "prev" ? "left-4" : "right-4",
      )}
    >
      <span aria-hidden className="text-lg leading-none">{dir === "prev" ? "‹" : "›"}</span>
    </button>
  );
}
