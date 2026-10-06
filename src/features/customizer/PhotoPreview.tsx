"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Customization, PhotoView } from "@/types/commerce";
import { Photo } from "@/components/product/ProductPhoto";
import { fontById, locationLabel } from "./config";

/** Text width relative to the photo, per print size (the photo stands in for a roughly chest-wide crop). */
const FONT_CQW = { small: 3.4, medium: 5, large: 6.8 } as const;

/**
 * The real Shopify photo with the customer's text laid over the chest. Photos differ in framing, so the
 * customer can drag the text onto the garment. This only moves the preview; the print itself follows the
 * chosen placement, which the Front/Back layout views show exactly.
 */
export function PhotoPreview({ src, alt, design, view }: { src: string; alt: string; design: Customization; view: PhotoView }) {
  const reduce = useReducedMotion();
  const text = design.text.trim();
  // The text is drawn only on the side it's printed on; a back photo sits a little higher (no chest).
  const onThisSide = design.location === view;
  const home = { x: 0.5, y: view === "back" ? 0.36 : 0.44 };
  const f = fontById(design.fontId);

  // Text centre as a fraction of the photo; reset whenever the photo changes.
  const [pos, setPos] = useState(home);
  const [dragging, setDragging] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => setPos({ x: 0.5, y: view === "back" ? 0.36 : 0.44 }), [src, view]);

  // While dragging, follow the pointer anywhere on the page so fast moves never drop the text.
  useEffect(() => {
    if (!dragging) return;
    const move = (e: globalThis.PointerEvent) => moveTo(e);
    const stop = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [dragging]);

  function moveTo(e: { clientX: number; clientY: number }) {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const clamp = (v: number) => Math.min(0.92, Math.max(0.08, v));
    setPos({ x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) });
  }
  const nudge = (dx: number, dy: number) => setPos((p) => ({ x: Math.min(0.92, Math.max(0.08, p.x + dx)), y: Math.min(0.92, Math.max(0.08, p.y + dy)) }));

  return (
    <div ref={box} className="absolute inset-0 overflow-hidden" style={{ containerType: "inline-size" }}>
      <AnimatePresence initial={false}>
        <motion.div
          key={src}
          className="absolute inset-0"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Photo src={src} alt={alt} sizes="(min-width: 1024px) 65vw, 100vw" priority />
        </motion.div>
      </AnimatePresence>

      {text && onThisSide && (
        <>
        <p
          role="slider"
          tabIndex={0}
          aria-label="Text position on the photo (preview only). Drag, or use the arrow keys."
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos.x * 100)}
          aria-valuetext={`${Math.round(pos.x * 100)}% across, ${Math.round(pos.y * 100)}% down`}
          onPointerDown={(e) => { e.preventDefault(); setDragging(true); }}
          onKeyDown={(e) => {
            const step = 0.02;
            const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
            if (map[e.key]) { e.preventDefault(); nudge(...map[e.key]); }
          }}
          className={`absolute w-[60%] -translate-x-1/2 -translate-y-1/2 touch-none select-none break-words rounded-ui text-center leading-[1.05] outline-offset-4 focus-visible:outline-white ${dragging ? "cursor-grabbing outline outline-1 outline-dashed outline-white/70" : "cursor-grab"} hover:outline hover:outline-1 hover:outline-dashed hover:outline-white/70`}
          style={{
            left: `${pos.x * 100}%`,
            top: `${pos.y * 100}%`,
            fontFamily: f.family,
            fontWeight: design.fontId === "sans" ? 700 : 500,
            letterSpacing: design.fontId === "condensed" ? "0.04em" : "-0.01em",
            fontSize: `${FONT_CQW[design.printSize]}cqw`,
            color: design.textColor,
            textShadow: "0 1px 1px rgba(0,0,0,0.12)",
          }}
        >
          {text}
        </p>
        <p className="pointer-events-none absolute left-1/2 top-[4.25rem] -translate-x-1/2 whitespace-nowrap rounded-ui bg-black/55 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white sm:top-20">
          Drag the text onto the garment
        </p>
        </>
      )}

      {text && !onThisSide && (
        <p className="absolute left-1/2 top-1/2 w-max max-w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-ui bg-black/55 px-4 py-2.5 text-center text-[13px] leading-snug text-white">
          {design.location === "back" || design.location === "front"
            ? `Printed on the ${locationLabel(design.location).toLowerCase()}. Switch to ${locationLabel(design.location)} to see it.`
            : `Printed on the ${locationLabel(design.location).toLowerCase()}, scaled to fit the sleeve.`}
        </p>
      )}
    </div>
  );
}
