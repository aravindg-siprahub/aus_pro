"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "./Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { VerifyDialogTrigger } from "@/features/authenticity/VerifyDialog";
import { useCart } from "@/features/cart/CartProvider";
import { cn } from "@/lib/cn";
import { SPRING } from "@/lib/motion";

export const NAV = [
  { href: "/", label: "Home", also: [] },
  { href: "/shop", label: "Shop", also: ["/product"] },
  { href: "/collections", label: "Collections", also: [] },
  { href: "/customize", label: "Customise", also: [] },
] as const;

const isActive = (pathname: string, n: (typeof NAV)[number]) =>
  n.href === "/" ? pathname === "/" : [n.href, ...n.also].some((h) => pathname === h || pathname.startsWith(h + "/"));

export function Header() {
  const pathname = usePathname();
  const { count } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  // The customizer pins its preview under the bar, so the bar stays put there.
  const pinned = pathname.startsWith("/customize/");

  // Tuck the bar away while reading down; bring it back on any upward scroll.
  useEffect(() => {
    let last = window.scrollY;
    let travel = 0;
    const on = () => {
      const y = window.scrollY;
      const dy = y - last;
      last = y;
      setScrolled(y > 8);
      if (pinned || y <= 120) return setHidden(false);
      travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy;
      if (travel > 24) setHidden(true);
      else if (travel < -8) setHidden(false);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [pinned]);

  // Sticky elements below the bar read this to follow it up and down.
  useEffect(() => {
    document.documentElement.dataset.header = hidden ? "hidden" : "shown";
  }, [hidden]);

  // Keyboard users tabbing into a hidden bar get it back.
  const reveal = () => setHidden(false);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-ui focus:bg-ink focus:px-4 focus:py-2 focus:text-on-ink">
        Skip to content
      </a>
      <header
        onFocusCapture={reveal}
        style={{ transform: hidden ? "translateY(-100%)" : undefined }}
        className={cn(
          "sticky top-0 z-50 bg-canvas transition-[transform,box-shadow] duration-500 ease-[var(--ease-premium)] motion-reduce:transition-none",
          scrolled && "shadow-[0_1px_0_var(--t-line-soft)]",
        )}
      >
        <div className="relative mx-auto flex h-14 max-w-[1440px] items-center justify-between px-5 sm:h-16 sm:px-8 lg:px-12">
          <Logo />

          <nav aria-label="Primary" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 md:flex lg:gap-4">
            {NAV.map((n) => {
              const active = isActive(pathname, n);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative px-3 py-2 text-[13px] tracking-[0.04em] transition-colors duration-300 hover:text-ink",
                    active ? "text-ink" : "text-mute",
                  )}
                >
                  {n.label}
                  {active && (
                    <motion.span layoutId="nav-active" transition={SPRING} className="absolute inset-x-3 bottom-1 h-px bg-ink" aria-hidden />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="-mr-2 flex items-center gap-1">
            {/* Authenticity: a shield that opens the verify pop-up */}
            <VerifyDialogTrigger
              label="Verify authenticity"
              className={cn(
                "grid h-10 w-10 place-items-center transition-colors duration-300 hover:text-ink",
                pathname === "/authenticity" ? "text-ink" : "text-ink-2",
              )}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.3 7.5 9.5 4.4-1.2 7.5-4.9 7.5-9.5V6L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="m8.75 12 2.25 2.25 4.25-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </VerifyDialogTrigger>
            <ThemeToggle />
            <Link
              href="/cart"
              aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
              aria-current={pathname === "/cart" ? "page" : undefined}
              className="relative flex h-10 min-w-10 items-center justify-center gap-1.5 px-2 text-ink-2 transition-colors duration-300 hover:text-ink"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 8h14l-1 12H6L5 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M9 8V7a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <AnimatePresence initial={false}>
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="text-[12px] font-medium tabular-nums text-ink"
                    aria-hidden
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </div>
        </div>

        {/* Phones and small tablets: the four sections stay one tap away, no menu to open */}
        {/* (An inset hairline, not a border, so the bar stays exactly --header-h tall.) */}
        <nav aria-label="Sections" className="shadow-[inset_0_1px_0_var(--t-line-soft)] md:hidden">
          <ul className="mx-auto flex h-11 max-w-[1440px] items-stretch justify-between px-5 sm:justify-center sm:gap-10 sm:px-8">
            {NAV.map((n) => {
              const active = isActive(pathname, n);
              return (
                <li key={n.href} className="flex">
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center text-[13px] tracking-[0.02em] transition-colors duration-300",
                      active ? "text-ink" : "text-mute active:text-ink",
                    )}
                  >
                    {n.label}
                    {active && <motion.span layoutId="tab-active" transition={SPRING} className="absolute inset-x-0 bottom-0 h-px bg-ink" aria-hidden />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
    </>
  );
}
