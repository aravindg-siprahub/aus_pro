"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCart } from "./CartProvider";
import { CartThumb } from "@/components/product/CartThumb";
import { CustomizationSummary } from "@/features/customizer/CustomizationSummary";
import { QuantityStepper } from "@/components/ui/Controls";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Layout";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { MobileDock, useViewportSide } from "@/components/ui/MobileDock";
import { FREE_SHIPPING_THRESHOLD, formatPrice, shippingLabel } from "@/lib/pricing";
import { getShopConfig } from "@/lib/shop-config";

export function CartView() {
  const reduce = useReducedMotion();
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
    <header className="pb-12 pt-14 sm:pb-16 sm:pt-20">
      <Eyebrow accent>Bag · {count} {count === 1 ? "piece" : "pieces"}</Eyebrow>
      <h1 className="display-lg mt-5">Your <em>bag</em>.</h1>
      <p className="lead mt-5 max-w-xl">
        {estimated ? "Shipping and tax are calculated at checkout." : remaining > 0 ? `Add ${formatPrice(remaining)} more for free shipping.` : "Free shipping included."}
      </p>
    </header>
    <div className="grid grid-cols-[minmax(0,1fr)] gap-14 pb-24 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-20">
      <ul className="divide-y divide-line-soft border-y border-line-soft">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.li
              key={item.id}
              layout={!reduce}
              exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="flex gap-5 py-8 sm:gap-8 sm:py-10">
                <Link href={`/product/${item.productSlug}`} tabIndex={-1} aria-hidden className="group/thumb block shrink-0 overflow-hidden rounded-tile">
                  <CartThumb
                    item={item}
                    className="aspect-[4/5] w-24 transition-transform duration-[900ms] ease-[var(--ease-premium)] group-hover/thumb:scale-[1.03] motion-reduce:transition-none sm:w-40"
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-[15px] font-medium leading-snug sm:text-[17px]">
                        <Link href={`/product/${item.productSlug}`} className="link-draw">{item.title}</Link>
                      </h2>
                      <p className="mt-1 text-[13px] text-mute">{item.colorName} · Size {item.size}</p>
                    </div>
                    <p className="shrink-0 text-[15px] tabular-nums sm:text-[17px]">{formatPrice(item.unitPrice * item.quantity)}</p>
                  </div>

                  {item.customization && (
                    <div className="mt-5 border-l border-line pl-4">
                      <p className="eyebrow mb-2">Custom print</p>
                      <CustomizationSummary customization={item.customization} compact />
                    </div>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 pt-6">
                    <QuantityStepper value={item.quantity} onChange={(n) => setQuantity(item.id, n)} label={`Quantity for ${item.title}`} />
                    {item.customization && (
                      <Link
                        href={`/customize/${item.productSlug}?edit=${encodeURIComponent(item.id)}`}
                        className="link-draw py-2 text-[13px] font-medium text-ink"
                      >
                        Edit design
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="link-draw py-2 text-[13px] text-mute transition-colors hover:text-ink"
                      aria-label={`Remove ${item.title}`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <aside ref={summaryRef} aria-label="Order summary" className="lg:sticky lg:top-[calc(var(--sticky-top)+2rem)] lg:self-start lg:transition-[top] lg:duration-500 motion-reduce:transition-none">
        <div className="border-t border-ink pt-6">
          <h2 className="eyebrow">Summary</h2>
          <dl className="mt-6 text-[14px]">
            <div className="flex justify-between gap-4 py-3"><dt className="text-ink-2">Subtotal</dt><dd className="tabular-nums">{formatPrice(totals.subtotal)}</dd></div>
            <div className="flex justify-between gap-4 border-t border-line-soft py-3"><dt className="text-ink-2">Shipping</dt><dd className="tabular-nums">{shippingLabel(totals.shipping)}</dd></div>
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4 text-[17px] font-medium">
              <dt>{estimated ? "Estimated total" : "Total"}</dt>
              <dd className="text-[19px] tabular-nums tracking-[-0.01em]">{formatPrice(totals.total)}</dd>
            </div>
          </dl>
          {remaining > 0 && (
            <div className="mt-6" aria-hidden>
              <div className="h-px overflow-hidden bg-line">
                <div className="h-full origin-left bg-accent transition-transform duration-700 ease-[var(--ease-premium)] motion-reduce:transition-none" style={{ transform: `scaleX(${Math.min(1, totals.subtotal / FREE_SHIPPING_THRESHOLD)})` }} />
              </div>
              <p className="mt-3 text-[12px] text-mute">{formatPrice(remaining)} away from free shipping</p>
            </div>
          )}
          <ButtonLink href="/checkout" size="lg" className="mt-8 w-full">Continue to checkout</ButtonLink>
          <ButtonLink href="/shop" variant="ghost" className="mt-2 w-full">Continue shopping</ButtonLink>
          <p className="mt-6 text-center text-[12px] leading-relaxed text-mute">
            {estimated ? "Payment is taken on Shopify’s secure checkout." : "Each piece is made to order before it ships."}
          </p>
        </div>
      </aside>
    </div>
    <MobileDock show={dock}>
      <div>
        <p className="eyebrow">{estimated ? "Estimated total" : "Total"}</p>
        <p className="mt-0.5 text-[17px] font-medium tabular-nums">{formatPrice(totals.total)}</p>
      </div>
      <ButtonLink href="/checkout" className="shrink-0">Checkout</ButtonLink>
    </MobileDock>
    </>
  );
}
