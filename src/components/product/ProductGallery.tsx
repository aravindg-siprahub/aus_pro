"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { ProductImage } from "@/types/commerce";
import { NoPhoto, Photo } from "./ProductPhoto";
import { cn } from "@/lib/cn";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Photo gallery for the product page. The main stage is a scroll-snap track, so touch swipe works natively.
 * Phones get a slim segmented progress line; tablets a thumbnail row; desktops a vertical thumbnail rail.
 * Thumbnails, the prev/next buttons and the arrow keys move between photos. `focusUrl` jumps to a photo
 * (e.g. the selected colour's) whenever it changes.
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
  const thumbs = useRef<(HTMLButtonElement | null)[]>([]);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  useEffect(() => { indexRef.current = index; }, [index]);
  const count = images.length;

  const go = useCallback((i: number, smooth = true) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(count - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: smooth && !reducedMotion() ? "smooth" : "auto" });
    indexRef.current = next;
    setIndex(next);
  }, [count]);

  // Keep the index in step with swipes, and the track aligned when the stage changes width.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))));
    };
    const ro = new ResizeObserver(() => el.scrollTo({ left: indexRef.current * el.clientWidth, behavior: "auto" }));
    el.addEventListener("scroll", onScroll, { passive: true });
    ro.observe(el);
    return () => { el.removeEventListener("scroll", onScroll); ro.disconnect(); cancelAnimationFrame(frame); };
  }, []);

  // Jump to the selected colour's photo; instantly on first render, smoothly afterwards.
  const firstFocus = useRef(true);
  useEffect(() => {
    if (!focusUrl) return;
    const i = images.findIndex((img) => img.url === focusUrl);
    if (i >= 0) go(i, !firstFocus.current);
    firstFocus.current = false;
  }, [focusUrl, images, go]);

  const onStageKey = (e: KeyboardEvent) => {
    const to = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: count - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(to);
  };

  // Roving focus across the thumbnails (a tablist): either arrow axis, since the rail turns vertical on desktop.
  const onThumbKey = (e: KeyboardEvent, i: number) => {
    const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: count - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(count - 1, to));
    go(next);
    thumbs.current[next]?.focus();
  };

  // On phones the photo is capped so the name, price and options still show on the first screen.
  const stage =
    "relative w-full overflow-hidden rounded-tile bg-soft aspect-[4/5] max-h-[54svh] sm:max-h-[74svh] " +
    "lg:aspect-auto lg:h-[calc(100svh-var(--sticky-top)-3rem)] lg:min-h-[560px] lg:max-h-[920px] lg:flex-1 lg:transition-[height] lg:duration-500";

  if (count === 0) {
    return <div className={cn(stage, className)}><NoPhoto name={name} /></div>;
  }

  const counter = `${String(index + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;

  return (
    <div className={cn("flex min-w-0 flex-col lg:flex-row lg:gap-5", className)}>
      {count > 1 && (
        <div
          role="tablist"
          aria-label="Product photos"
          className="no-scrollbar order-2 mt-4 hidden gap-2 overflow-x-auto p-1 sm:flex lg:order-1 lg:mt-0 lg:max-h-[calc(100svh-var(--sticky-top)-3rem)] lg:w-[88px] lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden"
        >
          {images.map((img, i) => (
            <button
              key={img.url}
              ref={(el) => { thumbs.current[i] = el; }}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Photo ${i + 1} of ${count}`}
              tabIndex={i === index ? 0 : -1}
              onClick={() => go(i)}
              onKeyDown={(e) => onThumbKey(e, i)}
              className={cn(
                "relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-tile bg-soft transition-opacity duration-500 ease-[var(--ease-premium)] motion-reduce:transition-none sm:w-[72px] lg:w-full",
                i === index ? "opacity-100 outline outline-1 outline-offset-2 outline-ink" : "opacity-45 hover:opacity-100",
              )}
            >
              <Photo src={img.url} alt="" sizes="88px" eager />
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
        onKeyDown={onStageKey}
      >
        <div ref={track} className="no-scrollbar absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain">
          {images.map((img, i) => (
            <div
              key={img.url}
              className="relative h-full w-full shrink-0 snap-center snap-always"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={i !== index}
            >
              <Photo src={img.url} alt={img.alt} sizes="(min-width: 1024px) 58vw, 100vw" priority={i === 0} />
            </div>
          ))}
        </div>

        {count > 1 && (
          // One quiet control cluster in the corner: previous, counter, next. Tablets and up; phones swipe.
          <div className="absolute bottom-4 right-4 hidden items-stretch bg-canvas/90 text-ink ring-1 ring-inset ring-line-soft sm:flex">
            <GalleryArrow dir="prev" disabled={index === 0} onClick={() => go(index - 1)} />
            <p className="flex min-w-[4.5rem] items-center justify-center px-1 font-mono text-[11px] tracking-[0.08em] tabular-nums" aria-hidden>
              {counter}
            </p>
            <GalleryArrow dir="next" disabled={index === count - 1} onClick={() => go(index + 1)} />
          </div>
        )}
      </div>

      {count > 1 && (
        // Phones: a slim progress line in place of thumbnails, with the counter alongside.
        <div className="order-3 mt-3 flex items-center gap-4 sm:hidden" aria-hidden>
          <div className="flex flex-1 gap-1">
            {images.map((img, i) => (
              <span
                key={img.url}
                className={cn("h-px flex-1 transition-colors duration-500 motion-reduce:transition-none", i === index ? "bg-ink" : "bg-line")}
              />
            ))}
          </div>
          <span className="font-mono text-[11px] tracking-[0.08em] tabular-nums text-mute">{counter}</span>
        </div>
      )}

      <p className="sr-only" aria-live="polite">{count > 1 ? `Photo ${index + 1} of ${count}` : ""}</p>
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
      className="grid h-10 w-10 place-items-center transition-[background-color,opacity] duration-300 hover:bg-ink/[0.06] disabled:pointer-events-none disabled:opacity-30"
    >
      <svg aria-hidden viewBox="0 0 16 16" className={cn("h-3.5 w-3.5", dir === "prev" && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="1.25">
        <path d="M2 8h11M9 4l4 4-4 4" strokeLinecap="square" />
      </svg>
    </button>
  );
}
