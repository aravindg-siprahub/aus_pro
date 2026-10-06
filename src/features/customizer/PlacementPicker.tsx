"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { GarmentType, PrintLocation } from "@/types/commerce";
import { Garment } from "@/components/product/Garment";
import { cn } from "@/lib/cn";
import { SPRING } from "@/lib/motion";
import { contrastRatio, luminance } from "@/lib/color";
import { LOCATIONS } from "./config";

/** The print mark on the small diagrams: a warm ink, a print colour rather than UI chrome. */
const ACCENT = "#a8532d";

/** Print location as a choice of four small garments, each marking where the print sits. */
export function PlacementPicker({
  type,
  color,
  value,
  onChange,
}: {
  type: GarmentType;
  color: string;
  value: PrintLocation;
  onChange: (l: PrintLocation) => void;
}) {
  const reduce = useReducedMotion();
  // The mark uses the accent unless it would disappear into the garment colour.
  const mark = contrastRatio(ACCENT, color) >= 2 ? ACCENT : luminance(color) < 0.25 ? "#ffffff" : "#181716";
  return (
    <div role="radiogroup" aria-label="Print location" className="grid grid-cols-4 gap-2 sm:gap-3">
      {LOCATIONS.map((l) => {
        const on = l.id === value;
        return (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(l.id)}
            className="group/p relative flex flex-col items-center gap-2 rounded-tile pb-3 pt-2 text-center"
          >
            {/* A quiet tile behind the choice, with a hairline frame: no fill colour beyond the soft panel */}
            <span aria-hidden className="absolute inset-0 rounded-tile ring-1 ring-inset ring-line-soft transition-[box-shadow] duration-300 group-hover/p:ring-line" />
            {on && (
              <motion.span
                layoutId="placement-active"
                transition={reduce ? { duration: 0 } : SPRING}
                className="absolute inset-0 rounded-tile bg-soft ring-1 ring-inset ring-ink"
                aria-hidden
              />
            )}
            <span className="relative block aspect-square w-full p-1.5 transition-transform duration-500 ease-[var(--ease-premium)] group-hover/p:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover/p:scale-100">
              <Garment
                type={type}
                color={color}
                view={l.id === "back" ? "back" : "front"}
                customization={{ text: "Aa", fontId: "sans", textColor: mark, printSize: "large", location: l.id }}
                className={cn("h-full w-full transition-opacity duration-300", on ? "opacity-100" : "opacity-60 group-hover/p:opacity-100")}
                title=""
              />
            </span>
            <span
              className={cn(
                "relative px-1 text-[10px] font-medium uppercase leading-tight tracking-[0.12em] transition-colors sm:text-[11px]",
                on ? "text-ink" : "text-mute group-hover/p:text-ink",
              )}
            >
              {l.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
