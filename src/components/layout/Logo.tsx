import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * The WAHAU mark: a W drawn as one stitch-like line inside a fine ring, with a gold needle point above it.
 * Uses currentColor, so it follows the theme; the gold is the accent token.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      <circle cx="16" cy="16" r="14.75" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8.5 11.5 12 21.5l4-7.5 4 7.5 3.5-10" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
      <circle cx="16" cy="8" r="1.4" className="fill-accent" />
    </svg>
  );
}

/** Mark + wordmark. The wordmark is wide-tracked heavy capitals with the middle A set off in gold. */
export function Logo({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  const lg = size === "lg";
  return (
    <Link
      href="/"
      aria-label="WAHAU, home"
      className={cn("group inline-flex items-center text-ink", lg ? "gap-4" : "gap-2.5", className)}
    >
      <LogoMark
        className={cn(
          "shrink-0 transition-transform duration-700 ease-[var(--ease-premium)] group-hover:rotate-[-8deg] motion-reduce:transition-none",
          lg ? "h-14 w-14" : "h-7 w-7 sm:h-8 sm:w-8",
        )}
      />
      <span
        aria-hidden
        className={cn(
          "font-display font-extrabold uppercase leading-none",
          lg ? "text-[clamp(2.5rem,7vw,5rem)] tracking-[0.2em]" : "text-[17px] tracking-[0.32em] sm:text-[19px]",
        )}
      >
        WAH<span className="text-accent">A</span>U
      </span>
    </Link>
  );
}
