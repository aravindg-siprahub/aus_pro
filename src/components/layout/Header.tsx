"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "./Logo";
import { SearchOverlay } from "./SearchOverlay";
import { useCart } from "@/features/cart/CartProvider";
import { cn } from "@/lib/cn";
import { EASE, SPRING } from "@/lib/motion";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/collections", label: "Collections" },
  { href: "/about", label: "About" },
];

const iconBtn =
  "relative grid h-10 w-10 place-items-center rounded-full text-ink-2 transition-colors duration-300 hover:text-ink";

export function Header() {
  const pathname = usePathname();
  const { count } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const closeSearch = useCallback(() => setSearch(false), []);

  const [hidden, setHidden] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  // The customizer pins its preview under the bar, so the bar stays put there.
  const pinned = pathname.startsWith("/customize");

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
    document.documentElement.dataset.header = hidden && !menu ? "hidden" : "shown";
  }, [hidden, menu]);

  useEffect(() => setMenu(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    if (menu) menuRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menu]);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <header
        style={{ transform: hidden && !menu ? "translateY(-100%)" : undefined }}
        className={cn(
          "sticky top-0 z-50 transition-[transform,background-color,box-shadow] duration-500 ease-[var(--ease-premium)] motion-reduce:transition-none",
          scrolled || menu ? "bg-canvas shadow-[0_1px_0_var(--color-line-soft)]" : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-5 sm:h-16 sm:px-8 lg:px-12">
          <Logo />

          <nav aria-label="Primary" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
            {NAV.map((n) => {
              const active = n.href === "/" ? pathname === "/" : pathname === n.href || pathname.startsWith(n.href + "/");
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative px-4 py-2 text-[14px] tracking-[-0.005em] transition-colors duration-300 hover:text-ink",
                    active ? "text-ink" : "text-mute",
                  )}
                >
                  {n.label}
                  {active && (
                    <motion.span layoutId="nav-active" transition={SPRING} className="absolute inset-x-4 -bottom-px h-px bg-ink" aria-hidden />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-0.5">
            <button className={iconBtn} aria-label="Search" onClick={() => setSearch(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
                <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
            <Link href="/account" className={cn(iconBtn, "hidden sm:grid")} aria-label="Account">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" />
                <path d="M4 20c1.5-4 4.5-5.5 8-5.5s6.5 1.5 8 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </Link>
            <Link href="/cart" className={iconBtn} aria-label={`Bag, ${count} ${count === 1 ? "item" : "items"}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 8h14l-1 12H6L5 8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M9 8V7a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 26 }}
                    className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ink px-1 text-[11px] font-medium text-white"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
            <button
              className={cn(iconBtn, "md:hidden")}
              aria-label={menu ? "Close menu" : "Open menu"}
              aria-expanded={menu}
              aria-controls="mobile-menu"
              onClick={() => setMenu((m) => !m)}
            >
              <span className="relative block h-3 w-5" aria-hidden>
                <span className={cn("absolute left-0 h-[1.5px] w-5 bg-ink transition-all duration-300", menu ? "top-1/2 rotate-45" : "top-0")} />
                <span className={cn("absolute left-0 h-[1.5px] w-5 bg-ink transition-all duration-300", menu ? "top-1/2 -rotate-45" : "bottom-0")} />
              </span>
            </button>
          </div>
        </div>

        {/* Phones and small tablets: the sections stay one tap away, without opening the menu */}
        <nav aria-label="Sections" className={cn("md:hidden", menu && "invisible")}>
          <ul className="no-scrollbar mx-auto flex h-11 max-w-[1440px] items-center gap-1 overflow-x-auto px-3 sm:px-6">
            {NAV.map((n) => {
              const active = n.href === "/" ? pathname === "/" : pathname === n.href || pathname.startsWith(n.href + "/");
              return (
                <li key={n.href} className="shrink-0">
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative block rounded-full px-3.5 py-1.5 text-[14px] transition-colors duration-300",
                      active ? "text-white" : "text-ink-2 active:bg-black/[0.05]",
                    )}
                  >
                    {active && <motion.span layoutId="tab-active" transition={SPRING} className="absolute inset-0 rounded-full bg-ink" aria-hidden />}
                    <span className="relative">{n.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <AnimatePresence>
          {menu && (
            <motion.nav
              ref={menuRef}
              id="mobile-menu"
              aria-label="Mobile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 0.3, ease: EASE }}
              className="fixed inset-x-0 top-14 flex h-[calc(100dvh-3.5rem)] flex-col sm:top-16 sm:h-[calc(100dvh-4rem)] bg-canvas px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 md:hidden"
            >
              <ul>
                {[...NAV, { href: "/account", label: "Account" }].map((n, i) => {
                  const active = n.href === "/" ? pathname === "/" : pathname === n.href || pathname.startsWith(n.href + "/");
                  return (
                    <motion.li
                      key={n.href}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 * i + 0.06, duration: 0.55, ease: EASE }}
                    >
                      <Link
                        href={n.href}
                        aria-current={active ? "page" : undefined}
                        className={cn("flex items-center justify-between py-3.5 text-[34px] font-semibold tracking-[-0.035em] transition-colors", active ? "text-ink" : "text-ink-2")}
                      >
                        {n.label}
                        {active && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="mt-auto flex items-center justify-between border-t border-line-soft pt-5 text-[15px]"
              >
                <button onClick={() => { setMenu(false); setSearch(true); }} className="text-ink-2 hover:text-ink">Search</button>
                <Link href="/cart" className="font-medium text-ink">Bag{count > 0 ? ` (${count})` : ""}</Link>
              </motion.div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
      <SearchOverlay open={search} onClose={closeSearch} />
    </>
  );
}
