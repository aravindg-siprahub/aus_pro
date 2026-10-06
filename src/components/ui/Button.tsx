"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "light";
type Size = "md" | "lg" | "sm";

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-ui font-medium tracking-[0.01em] whitespace-nowrap select-none " +
  "transition-[background-color,color,box-shadow,opacity,transform] duration-300 ease-[var(--ease-premium)] " +
  "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-40 aria-disabled:opacity-40";

const variants: Record<Variant, string> = {
  /** Solid: warm white on the dark theme, near-black on the light one. */
  primary: "bg-ink text-on-ink hover:bg-ink/85",
  /** For use on photographs, whatever the theme. */
  light: "bg-white text-[#151412] hover:bg-white/85",
  secondary: "bg-transparent text-ink ring-1 ring-inset ring-line hover:ring-ink",
  ghost: "text-ink hover:bg-ink/[0.06]",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-6 text-[14px]",
  lg: "h-[52px] px-8 text-[15px]",
};

interface Common {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  loading?: boolean;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  loading,
  disabled,
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: Common & { href: string; "aria-label"?: string; "aria-disabled"?: boolean; tabIndex?: number }) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </Link>
  );
}

/** Understated text link with a trailing arrow, for secondary actions. */
export function TextLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2 text-[14px] font-medium tracking-[0.01em] text-ink", className)}
    >
      <span className="link-draw">{children}</span>
      <span aria-hidden className="transition-transform duration-300 ease-[var(--ease-premium)] group-hover:translate-x-1">→</span>
    </Link>
  );
}
