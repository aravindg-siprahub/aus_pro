"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Fades <main> in on each route change. It animates the existing element rather than wrapping
 * the page tree (a template wrapper interfered with streamed loading states). Opacity only, so
 * fixed and sticky elements inside pages are unaffected. Skipped for reduced motion.
 */
export function RouteFade() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.getElementById("main")?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 420,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
  }, [pathname]);

  return null;
}
