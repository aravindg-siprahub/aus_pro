"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ElementType } from "react";
import { EASE } from "@/lib/motion";

type Part = string | { text: string; className?: string };

/**
 * Headline that rises in word by word from behind a mask. Plays once, either on mount
 * or when scrolled into view. Screen readers get the plain sentence.
 */
export function RevealText({
  as: Tag = "h2",
  parts,
  className,
  id,
  onMount = false,
  delay = 0,
  stagger = 0.045,
}: {
  as?: ElementType;
  parts: Part[];
  className?: string;
  id?: string;
  onMount?: boolean;
  delay?: number;
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  const segments = parts.map((p) => (typeof p === "string" ? { text: p } : p));
  const label = segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
  const total = segments.reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0);
  let index = 0;

  const play = reduce ? {} : onMount ? { animate: "shown" } : { whileInView: "shown", viewport: { once: true, margin: "-12% 0px" } };

  return (
    <Tag id={id} className={className} aria-label={label}>
      <motion.span aria-hidden initial={reduce ? false : "hidden"} {...play} className="block">
        {segments.map((seg, si) =>
          seg.text
            .split(/\s+/)
            .filter(Boolean)
            .map((word, wi) => {
              const i = index++;
              return (
                <span key={`${si}-${wi}`} className={`-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-top ${seg.className ?? ""}`}>
                  <motion.span
                    className="inline-block"
                    variants={{ hidden: { y: "105%", opacity: 0 }, shown: { y: "0%", opacity: 1 } }}
                    transition={{ duration: 0.8, ease: EASE, delay: delay + i * stagger }}
                  >
                    {word}
                  </motion.span>
                  {i < total - 1 ? " " : null}
                </span>
              );
            }),
        )}
      </motion.span>
    </Tag>
  );
}
