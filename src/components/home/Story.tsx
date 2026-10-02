"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Garment } from "@/components/product/Garment";
import { Container } from "@/components/ui/Layout";
import { Reveal } from "@/components/ui/Reveal";
import { RevealText } from "@/components/ui/RevealText";
import { TextLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { FontId, GarmentType, HomeMedia, HomeSlot } from "@/types/commerce";
import { PrintOverlay, type PrintSpot } from "./PrintOverlay";

type HomeImage = NonNullable<HomeMedia["hero"]>;

interface Chapter {
  n: string;
  label: string;
  title: string;
  body: string;
  link: { href: string; label: string };
  type: GarmentType;
  color: string;
  dark?: boolean;
  text?: { text: string; fontId: FontId; color: string };
  flip?: boolean;
  /** Shopify Files slot for the chapter photo. */
  slot: HomeSlot;
  /** Print laid on the photo (only for photos framed at their own aspect ratio). */
  photoPrint?: { text: string; fontId: FontId; color: string; spot: PrintSpot };
}

const chapters: Chapter[] = [
  {
    n: "01",
    label: "Choose",
    title: "Start with a better canvas.",
    body: "Combed cotton, heavyweight fleece, a considered fit. Four silhouettes, each cut to carry a print beautifully.",
    link: { href: "/shop", label: "Explore the range" },
    type: "round-neck",
    color: "#f2f0eb",
    slot: "canvas",
  },
  {
    n: "02",
    label: "Compose",
    title: "Design it exactly as you see it.",
    body: "Type your words, choose a typeface and a colour, then place it front, back or on a sleeve. It comes to life as you type.",
    link: { href: "/customize/drop-shoulder-tee", label: "Try the customizer" },
    type: "oversized",
    color: "#cbc4b8",
    dark: true,
    text: { text: "Say it loud", fontId: "condensed", color: "#181716" },
    flip: true,
    slot: "compose",
    photoPrint: { text: "SAY IT LOUD", fontId: "condensed", color: "#f4efe6", spot: { x: 0.5, y: 0.5, size: 7 } },
  },
  {
    n: "03",
    label: "Made",
    title: "Printed once. Made for you.",
    body: "Nothing is made until you design it. Each piece is printed, checked by hand and shipped in under two weeks.",
    link: { href: "/about", label: "Our process" },
    type: "polo",
    color: "#243050",
    text: { text: "No. 01", fontId: "serif", color: "#f4efe6" },
    slot: "made",
  },
];

function ChapterSection({ c, image, href }: { c: Chapter; image?: HomeImage; href: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = !!useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [80, -80]);
  const rotate = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [c.flip ? 4 : -4, c.flip ? -3 : 3]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], reduce ? [1, 1, 1] : [0.92, 1, 0.96]);
  const numY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [40, -40]);
  // Photos move less than illustrations: a gentle drift and settle, no tilt.
  const photoY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [60, -60]);
  const photoScale = useTransform(scrollYProgress, [0, 0.5, 1], reduce ? [1, 1, 1] : [0.94, 1, 0.98]);

  return (
    <section ref={ref} className={cn("relative overflow-hidden", c.dark ? "bg-night text-white" : "bg-canvas")} aria-labelledby={`ch-${c.n}`}>
      <Container size="wide" className="grid min-h-[90svh] items-center gap-6 py-20 sm:py-28 lg:grid-cols-12 lg:gap-8 lg:py-0">
        <div className={cn("relative z-10 lg:col-span-5", c.flip ? "lg:order-2 lg:col-start-8" : "lg:col-start-1")}>
          <Reveal>
            <p className={cn("text-[13px] font-medium uppercase tracking-[0.18em]", c.dark ? "text-white/50" : "text-mute")}>
              {c.n} <span className="mx-2 inline-block h-px w-8 translate-y-[-4px] bg-current align-middle" aria-hidden /> {c.label}
            </p>
            <RevealText id={`ch-${c.n}`} parts={[c.title]} className="display-lg mt-5 max-w-[14ch]" />
            <p className={cn("lead mt-6 max-w-md", c.dark && "!text-white/60")}>{c.body}</p>
            <div className="mt-8">
              <TextLink href={href} className={c.dark ? "!text-white" : ""}>{c.link.label}</TextLink>
            </div>
          </Reveal>
        </div>

        <div className={cn("relative lg:col-span-7", c.flip ? "lg:order-1 lg:col-start-1" : "lg:col-start-6")}>
          <motion.span
            aria-hidden
            style={{ y: numY }}
            className={cn(
              "pointer-events-none absolute -top-6 select-none text-[clamp(8rem,22vw,18rem)] font-semibold leading-none tracking-[-0.06em]",
              c.flip ? "right-0" : "left-0",
              c.dark ? "text-white/[0.05]" : "text-ink/[0.045]",
            )}
          >
            {c.n}
          </motion.span>
          {image ? (
            <motion.div style={{ y: photoY, scale: photoScale }} className="relative mx-auto w-full max-w-[720px] will-change-transform">
              <div
                className="relative w-full overflow-hidden rounded-tile bg-soft shadow-product"
                // A print needs the photo at its own aspect ratio so the spot stays on the garment.
                style={{ aspectRatio: c.photoPrint && image.width && image.height ? `${image.width} / ${image.height}` : "4 / 5" }}
              >
                <Image src={image.url} alt={image.alt} fill sizes="(min-width: 1024px) 720px, 92vw" className="object-cover" />
                {c.photoPrint && <PrintOverlay text={c.photoPrint.text} fontId={c.photoPrint.fontId} color={c.photoPrint.color} spot={c.photoPrint.spot} />}
              </div>
            </motion.div>
          ) : (
          <motion.div style={{ y, rotate, scale }} className="relative mx-auto aspect-square w-full max-w-[640px] will-change-transform">
            <Garment
              type={c.type}
              color={c.color}
              className="h-full w-full shadow-product"
              customization={c.text && { text: c.text.text, fontId: c.text.fontId, textColor: c.text.color, printSize: "large", location: "front" }}
            />
          </motion.div>
          )}
        </div>
      </Container>
    </section>
  );
}

export function Story({ media = {}, startHref }: { media?: HomeMedia; startHref: string }) {
  return (
    <div>
      {chapters.map((c) => (
        <ChapterSection key={c.n} c={c} image={media[c.slot]} href={c.slot === "compose" ? startHref : c.link.href} />
      ))}
    </div>
  );
}
