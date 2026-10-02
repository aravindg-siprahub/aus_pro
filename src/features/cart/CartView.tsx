"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "./CartProvider";
import { CartThumb } from "@/components/product/CartThumb";
import { CustomizationSummary } from "@/features/customizer/CustomizationSummary";
import { QuantityStepper } from "@/components/ui/Controls";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { MobileDock, useViewportSide } from "@/components/ui/MobileDock";
import { FREE_SHIPPING_THRESHOLD, formatPrice, shippingLabel } from "@/lib/pricing";
import { getShopConfig } from "@/lib/shop-config";

export function CartView() {
  const { items, totals, hydrated, setQuantity, remove } = useCart();
  // Until the summary is reached on small screens, keep the total and checkout at hand.
  const [summaryRef, summarySide] = useViewportSide<HTMLElement>();
  const dock = summarySide === "below";

  if (!hydrated) {
    return (
      <div className="space-y-4 pt-14 sm:pt-20" aria-busy="true" aria-label="Loading your bag">
        <Skeleton className="mb-10 h-14 w-2/3 max-w-md" />
        <Skeleton className="h-44" /><Skeleton className="h-44" />
      </div>
    );
  }
  if (items.length === 0) {
    return <EmptyState title="Your bag is empty." description="When you add something, it will appear here." actionHref="/shop" actionLabel="Continue shopping" />;
  }

  // With Shopify, shipping and tax are calculated on its checkout, so the local free-shipping rule doesn't apply.
  const estimated = getShopConfig().provider === "shopify";
  const remaining = estimated ? 0 : FREE_SHIPPING_THRESHOLD - totals.subtotal;

  const count = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <>
    <header className="pb-10 pt-14 sm:pb-14 sm:pt-20">
      <h1 className="display-lg">Your bag total is {formatPrice(totals.total)}.</h1>
      <p className="lead mt-4">
        {count} {count === 1 ? "item" : "items"} · {estimated ? "Shipping and tax are calculated at checkout." : remaining > 0 ? `Add ${formatPrice(remaining)} more for free shipping.` : "Free shipping included."}
      </p>
    </header>
    <div className="grid gap-12 pb-20 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-20">
      <ul className="divide-y divide-line-soft border-t border-line-soft">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.li
              key={item.id}
              layout
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="flex gap-4 py-8 sm:gap-8 sm:py-10">
                <Link href={`/product/${item.productSlug}`} tabIndex={-1} aria-hidden className="group/thumb shrink-0 overflow-hidden rounded-2xl">
                  <CartThumb item={item} className="h-28 w-28 transition-transform duration-700 ease-[var(--ease-premium)] group-hover/thumb:scale-[1.04] sm:h-44 sm:w-44" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[17px] font-semibold tracking-[-0.015em] sm:text-[21px]">
                        <Link href={`/product/${item.productSlug}`} className="hover:underline underline-offset-4">{item.title}</Link>
                      </h2>
                      <p className="mt-0.5 text-[14px] text-mute">{item.colorName} · Size {item.size}</p>
                    </div>
                    <p className="text-[17px] font-medium tabular-nums sm:text-[19px]">{formatPrice(item.unitPrice * item.quantity)}</p>
                  </div>

                  {item.customization && (
                    <div className="mt-4 border-l-2 border-line pl-4">
                      <p className="mb-1 text-[12px] font-medium uppercase tracking-[0.08em] text-mute">Custom print</p>
                      <CustomizationSummary customization={item.customization} compact />
                    </div>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-4">
                    <QuantityStepper value={item.quantity} onChange={(n) => setQuantity(item.id, n)} label={`Quantity for ${item.title}`} />
                    {item.customization && (
                      <Link href={`/customize/${item.productSlug}?edit=${encodeURIComponent(item.id)}`} className="text-[14px] text-ink font-medium link-draw">
                        Edit design
                      </Link>
                    )}
                    <button onClick={() => remove(item.id)} className="text-[14px] text-mute hover:text-danger" aria-label={`Remove ${item.title}`}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <aside ref={summaryRef} aria-label="Order summary" className="lg:sticky lg:top-[calc(var(--sticky-top)+2rem)] lg:transition-[top] lg:duration-500 lg:self-start">
        <div className="border-t border-ink pt-6">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.14em] text-mute">Summary</h2>
          <dl className="mt-5 space-y-3 text-[15px]">
            <div className="flex justify-between"><dt className="text-ink-2">Subtotal</dt><dd className="tabular-nums">{formatPrice(totals.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-2">Shipping</dt><dd className="tabular-nums">{shippingLabel(totals.shipping)}</dd></div>
            <div className="flex justify-between border-t border-line pt-4 text-[19px] font-semibold"><dt>{getShopConfig().provider === "shopify" ? "Estimated total" : "Total"}</dt><dd className="tabular-nums">{formatPrice(totals.total)}</dd></div>
          </dl>
          {remaining > 0 && (
            <div className="mt-5" aria-hidden>
              <div className="h-1 overflow-hidden rounded-full bg-line">
                <div className="h-full origin-left rounded-full bg-ink transition-transform duration-700 ease-[var(--ease-premium)]" style={{ transform: `scaleX(${Math.min(1, totals.subtotal / FREE_SHIPPING_THRESHOLD)})` }} />
              </div>
              <p className="mt-2 text-[13px] text-mute">{formatPrice(remaining)} away from free shipping</p>
            </div>
          )}
          <ButtonLink href="/checkout" size="lg" className="mt-6 w-full">Continue to checkout</ButtonLink>
          <ButtonLink href="/shop" variant="ghost" className="mt-2 w-full">Continue shopping</ButtonLink>
        </div>
      </aside>
    </div>
    <MobileDock show={dock}>
      <div>
        <p className="text-[13px] text-mute">Total</p>
        <p className="text-[19px] font-semibold tabular-nums">{formatPrice(totals.total)}</p>
      </div>
      <ButtonLink href="/checkout" className="shrink-0">Checkout</ButtonLink>
    </MobileDock>
    </>
  );
}
