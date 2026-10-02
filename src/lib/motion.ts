/**
 * Shared motion tokens. Everything animates opacity, translate or scale only,
 * stays short, and never blocks interaction (no exit-before-enter sequencing).
 */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const DURATION = { fast: 0.25, base: 0.45, slow: 0.9 } as const;

/** For indicators that slide between options (tabs, toggles, nav). */
export const SPRING = { type: "spring", stiffness: 420, damping: 36, mass: 0.8 } as const;

/** Enter-only fade/rise for content that swaps in place (tab panels, steps). */
export const swapIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DURATION.fast, ease: EASE },
} as const;
