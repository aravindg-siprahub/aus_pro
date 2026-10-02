"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ComponentProps } from "react";
import { Garment } from "./Garment";
import { cn } from "@/lib/cn";

/**
 * Layers garments so a change of colour or side crossfades instead of snapping.
 * Only opacity and scale animate.
 */
export function GarmentStage({
  className,
  innerClassName,
  garmentClassName,
  ...garment
}: ComponentProps<typeof Garment> & { innerClassName?: string; garmentClassName?: string }) {
  const reduce = useReducedMotion();
  const key = `${garment.type}-${garment.color}-${garment.view ?? "front"}-${garment.zoom ? "z" : ""}`;
  return (
    <div className={cn("relative", className)}>
      <AnimatePresence initial={false}>
        <motion.div
          key={key}
          className={cn("absolute inset-0 grid place-items-center", innerClassName)}
          initial={reduce ? false : { opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Garment {...garment} className={cn("h-full w-full", garmentClassName)} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
