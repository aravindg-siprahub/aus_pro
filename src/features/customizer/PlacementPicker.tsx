"use client";

import { motion } from "framer-motion";
import type { GarmentType, PrintLocation } from "@/types/commerce";
import { Garment } from "@/components/product/Garment";
import { cn } from "@/lib/cn";
import { SPRING } from "@/lib/motion";
import { contrastRatio, luminance } from "@/lib/color";

const ACCENT = "#a8532d";
import { LOCATIONS } from "./config";

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
  // The mark uses the brand accent unless it would disappear into the garment colour.
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
            className="group/p relative flex flex-col items-center gap-2 rounded-2xl pb-2.5 pt-2 text-center"
          >
            {on && <motion.span layoutId="placement-active" transition={SPRING} className="absolute inset-0 rounded-2xl bg-soft" aria-hidden />}
            <span className="relative block aspect-square w-full p-1.5 transition-transform duration-500 ease-[var(--ease-premium)] group-hover/p:scale-[1.04]">
              <Garment
                type={type}
                color={color}
                view={l.id === "back" ? "back" : "front"}
                customization={{ text: "Aa", fontId: "sans", textColor: mark, printSize: "large", location: l.id }}
                className={cn("h-full w-full transition-opacity duration-300", on ? "opacity-100" : "opacity-60 group-hover/p:opacity-100")}
                title=""
              />
            </span>
            <span className={cn("relative text-[12px] font-medium leading-tight transition-colors", on ? "text-ink" : "text-mute")}>{l.label}</span>
          </button>
        );
      })}
    </div>
  );
}
