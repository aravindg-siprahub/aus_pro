"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Where an element sits relative to the viewport: in view, scrolled past (above), or not reached (below).
 * Returns a callback ref so it also works for elements that mount later.
 */
export function useViewportSide<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null);
  const [side, setSide] = useState<"in" | "above" | "below">("in");
  useEffect(() => {
    if (!el) return;
    const io = new IntersectionObserver(([e]) =>
      setSide(e.isIntersecting ? "in" : e.boundingClientRect.top < 0 ? "above" : "below"),
    );
    io.observe(el);
    return () => io.disconnect();
  }, [el]);
  return [setEl, side] as const;
}

/** A slim bottom bar for small screens that keeps the primary action within reach. */
export function MobileDock({ show, children, className }: { show: boolean; children: ReactNode; className?: string }) {
  return (
    <div
      inert={!show}
      data-dock={show ? "on" : "off"}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-line-soft bg-canvas px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-[transform,opacity] duration-500 ease-[var(--ease-premium)] motion-reduce:transition-none sm:px-8 lg:hidden",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
