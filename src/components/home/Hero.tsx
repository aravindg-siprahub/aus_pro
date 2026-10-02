"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ButtonLink, TextLink } from "@/components/ui/Button";
import { Garment } from "@/components/product/Garment";
import { RevealText } from "@/components/ui/RevealText";
import { MAX_TEXT, fontById } from "@/features/customizer/config";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/cn";
import type { FontId, HomeMedia } from "@/types/commerce";
import { PrintOverlay, type PrintSpot } from "./PrintOverlay";

type HomeImage = NonNullable<HomeMedia["hero"]>;

/** Shown until the visitor types: what the print could say. */
const PHRASES: { text: string; font: FontId }[] = [
  { text: "Yours.", font: "serif" },
  { text: "Day One", font: "condensed" },
  { text: "Made by me", font: "script" },
  { text: "No. 09", font: "mono" },
];

const FONT_CHOICES: FontId[] = ["sans", "serif", "script", "condensed"];

/**
 * The hero photo (a white tee on a hanger, 3:2) sits in a narrower frame with object-cover, which always shows
 * its full height and the centre of its width. So the chest stays at the same spot, and sizing the print by
 * the frame's height keeps it in proportion to the shirt at every screen size.
 */
const HERO_SPOT: PrintSpot = { x: 0.5, y: 0.47, size: 5.1, unit: "cqh" };
const INK = "#1b1a18";

const ease = [0.22, 1, 0.36, 1] as const;

export interface HeroProduct {
  name: string;
  price: number;
  href: string;
  /** Customizer for this product; the visitor's text is carried over. */
  customizeHref: string;
}

export function Hero({ image, product }: { image?: HomeImage; product?: HeroProduct }) {
  const reduce = !!useReducedMotion();
  const inputId = useId();
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [font, setFont] = useState<FontId>("sans");
  const [loaded, setLoaded] = useState(false);

  const typing = text.trim().length > 0;

  // Cycle the sample phrases until the visitor starts typing.
  useEffect(() => {
    if (reduce || typing) return;
    const t = setInterval(() => setI((n) => (n + 1) % PHRASES.length), 2800);
    return () => clearInterval(t);
  }, [reduce, typing]);

  const shown = typing ? { text: text.trim(), font } : PHRASES[i];
  // Shrink long phrases so the print never runs off the chest (about 40% of the frame's height wide).
  const estWidth = shown.text.length * fontById(shown.font).widthFactor;
  const spot = { ...HERO_SPOT, size: Math.min(HERO_SPOT.size, 40 / Math.max(estWidth, 1)) };
  const designHref = product
    ? `${product.customizeHref}?${new URLSearchParams(typing ? { text: text.trim(), font } : {}).toString()}`.replace(/\?$/, "")
    : "/shop";

  const enter = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay, ease } };

  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      {/* Soft light behind the photo, like a studio sweep */}
      <div aria-hidden className="pointer-events-none absolute -right-[20%] top-[-10%] h-[80%] w-[70%] rounded-full bg-[radial-gradient(closest-side,rgba(185,119,90,0.10),transparent)] blur-2xl" />

      {/* Phones: headline, then the shirt, then the try-it control. Desktop: copy on the left, shirt on the right. */}
      <div className="relative mx-auto grid max-w-[1440px] gap-7 px-5 pb-14 pt-6 sm:px-8 sm:pt-10 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-12 lg:grid-rows-[1fr_auto] lg:gap-x-12 lg:gap-y-7 lg:px-12 lg:pb-20 lg:pt-6">
        <div className="lg:col-span-5 lg:col-start-1 lg:row-start-1 lg:self-end">
          <motion.p {...enter(0)} className="text-[13px] font-medium uppercase tracking-[0.18em] text-accent">
            Atelier Nine · Made to order
          </motion.p>
          <RevealText
            as="h1"
            id="hero-title"
            onMount
            delay={0.05}
            stagger={0.07}
            parts={["Wear your", { text: "words.", className: "block text-mute" }]}
            className="mt-4 text-[clamp(3.25rem,6.4vw,6rem)] font-semibold leading-[0.95] tracking-[-0.045em]"
          />
          <motion.p {...enter(0.15)} className="lead mt-4 max-w-md sm:mt-5">
            Type it, see it on the shirt, wear it. Premium cotton, printed just for you.
          </motion.p>
        </div>

        {/* The shirt, with the print live */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.1, ease }}
          className="lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1 lg:self-center"
        >
          {image ? (
            <div className="relative mx-auto aspect-[4/4.4] max-h-[56svh] w-full max-w-[640px] overflow-hidden rounded-[24px] bg-soft shadow-product sm:max-h-none sm:aspect-[5/5.2] sm:rounded-[28px] lg:max-h-[calc(100svh-7rem)] lg:max-w-none lg:aspect-[4/4.4]">
              <Image
                src={image.url}
                alt={image.alt}
                fill
                priority
                sizes="(min-width: 1024px) 56vw, 100vw"
                onLoad={() => setLoaded(true)}
                ref={(el) => { if (el?.complete && el.naturalWidth > 0) setLoaded(true); }}
                className={cn("object-cover transition-opacity duration-700", loaded ? "opacity-100" : "opacity-0")}
              />
              <PrintOverlay text={shown.text} fontId={shown.font} color={INK} spot={spot} animate={!typing} />
              <span className="sr-only" aria-live="polite">Preview: the shirt printed with “{shown.text}”</span>

              {/* Glass chips */}
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-[12px] font-medium text-ink shadow-sm backdrop-blur-md sm:left-5 sm:top-5">
                <span className="relative flex h-2 w-2">
                  {!reduce && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />}
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                {typing ? "Your design, live" : "Live preview"}
              </div>
              {product && (
                <Link
                  href={product.href}
                  className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-2xl bg-white/75 px-4 py-3 shadow-sm backdrop-blur-md transition-colors hover:bg-white/90 sm:bottom-5 sm:left-5 sm:right-auto sm:min-w-[280px]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-ink">{product.name}</span>
                    <span className="block text-[13px] text-ink-2">{formatPrice(product.price)} · custom print</span>
                  </span>
                  <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[13px] text-white">→</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="relative mx-auto h-[min(72svh,760px)] max-w-[720px]">
              <Garment
                type="hoodie"
                color="#1c1b1a"
                animated
                className="h-full w-full shadow-product"
                customization={{ text: shown.text, fontId: shown.font, textColor: "#f4efe6", printSize: "large", location: "front" }}
                title={`Black hoodie printed with “${shown.text}”`}
              />
            </div>
          )}
        </motion.div>
        <div className="lg:col-span-5 lg:col-start-1 lg:row-start-2 lg:self-start">

          <motion.div {...enter(0.25)} className="max-w-md">
            <label htmlFor={inputId} className="mb-2 block text-[13px] font-medium text-ink-2">Try your words</label>
            <div className="group flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-12px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.06] transition-shadow focus-within:ring-2 focus-within:ring-ink">
              <input
                id={inputId}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))}
                placeholder="Type something worth wearing"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-mute"
                style={typing ? { fontFamily: fontById(font).family } : undefined}
                aria-describedby={`${inputId}-hint`}
              />
              <ButtonLink href={designHref} className="shrink-0 !px-5">
                {typing ? "Design this" : "Start"}
                <span aria-hidden className="ml-1">→</span>
              </ButtonLink>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Typeface">
              {FONT_CHOICES.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={font === f}
                  onClick={() => setFont(f)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[14px] transition-colors duration-300",
                    font === f ? "bg-ink text-white" : "bg-black/[0.04] text-ink-2 hover:bg-black/[0.08]",
                  )}
                  style={{ fontFamily: fontById(f).family }}
                >
                  {fontById(f).label}
                </button>
              ))}
              <span id={`${inputId}-hint`} className="ml-auto text-[12px] tabular-nums text-mute">{text.length}/{MAX_TEXT}</span>
            </div>
          </motion.div>

          <motion.div {...enter(0.35)} className="mt-6 flex items-center gap-6">
            <TextLink href="/shop">Shop all</TextLink>
            <TextLink href="/collections">Collections</TextLink>
          </motion.div>

          <motion.ul {...enter(0.45)} className="mt-8 grid max-w-md grid-cols-3 gap-3 border-t border-line-soft pt-6 text-[12px] leading-snug text-ink-2 sm:gap-4 sm:text-[13px]">
            <li><span className="block font-semibold text-ink">Made to order</span>Nothing waits on a shelf</li>
            <li><span className="block font-semibold text-ink">Any typeface</span>Front, back or sleeve</li>
            <li>
              <span className="block font-semibold text-ink">{product ? `From ${formatPrice(product.price)}` : "Premium cotton"}</span>
              Printed in your colour
            </li>
          </motion.ul>
        </div>

      </div>
    </section>
  );
}
