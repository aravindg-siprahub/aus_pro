"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Product } from "@/types/commerce";
import { commerce } from "@/lib/commerce";
import { formatPrice } from "@/lib/pricing";
import { Garment } from "@/components/product/Garment";
import { Photo } from "@/components/product/ProductPhoto";

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    let live = true;
    commerce.listProducts({ query: q || undefined }).then((r) => live && setResults(q ? r : r.slice(0, 4)));
    return () => {
      live = false;
    };
  }, [q]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          className="fixed inset-0 z-[60] bg-canvas"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="mx-auto max-w-[900px] px-5 pt-6 sm:px-8 sm:pt-14">
            <div className="flex items-center gap-4 border-b border-line pb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-mute">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search tees, polos, hoodies"
                aria-label="Search products"
                className="w-full bg-transparent text-[22px] tracking-[-0.02em] outline-none placeholder:text-mute/60 sm:text-[28px]"
              />
              <button onClick={onClose} className="rounded-full px-3 py-1.5 text-[14px] text-mute hover:text-ink">
                Close
              </button>
            </div>
            <p className="mt-8 text-[13px] font-medium uppercase tracking-[0.1em] text-mute">{q ? "Results" : "Popular"}</p>
            <ul className="mt-4 grid gap-1" aria-live="polite">
              {results?.length === 0 && <li className="py-8 text-mute">No results for “{q}”. Try “polo” or “hoodie”.</li>}
              {results?.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/product/${p.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-4 rounded-2xl p-2 transition-colors hover:bg-soft"
                  >
                    {p.images ? (
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-soft">
                        {p.images[0] ? <Photo src={p.images[0].url} alt="" sizes="64px" /> : null}
                      </div>
                    ) : (
                      <div className="h-16 w-16 shrink-0 rounded-xl bg-soft p-1.5">
                        <Garment type={p.category} color={p.colors[0].hex} className="h-full w-full" />
                      </div>
                    )}
                    <span className="flex-1 text-[17px] font-medium">{p.name}</span>
                    <span className="text-[15px] text-mute">{formatPrice(p.basePrice)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
