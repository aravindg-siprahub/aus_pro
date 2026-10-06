"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Order } from "@/types/commerce";
import { commerce } from "@/lib/commerce";
import { formatDate, formatPrice, shippingLabel } from "@/lib/pricing";
import { useCart } from "@/features/cart/CartProvider";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { CartThumb } from "@/components/product/CartThumb";
import { CustomizationSummary } from "@/features/customizer/CustomizationSummary";

const POLL_MS = 5000;
const POLL_LIMIT = 120; // stop checking after ~10 minutes; the page can still be refreshed
const CLEARED_KEY = "atelier.cleared-orders.v1";

export function OrderConfirmation({ id }: { id: string }) {
  const reduce = useReducedMotion();
  const { clear, hydrated } = useCart();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const awaiting = order?.status === "awaiting_payment";

  useEffect(() => {
    let live = true;
    commerce.getOrder(id).then((o) => live && setOrder(o));
    return () => {
      live = false;
    };
  }, [id]);

  // A hosted checkout confirms asynchronously: keep checking until Shopify reports the order as paid.
  useEffect(() => {
    if (!awaiting) return;
    let polls = 0;
    const t = setInterval(async () => {
      polls++;
      const next = await commerce.getOrder(id);
      if (next) setOrder(next);
      if (polls >= POLL_LIMIT || next?.status !== "awaiting_payment") clearInterval(t);
    }, POLL_MS);
    return () => clearInterval(t);
  }, [awaiting, id]);

  // Once a hosted order is paid, empty the bag exactly once for that order.
  useEffect(() => {
    if (!hydrated || order?.status !== "placed" || id.startsWith("ord_")) return;
    try {
      const done: string[] = JSON.parse(window.localStorage.getItem(CLEARED_KEY) ?? "[]");
      if (done.includes(id)) return;
      window.localStorage.setItem(CLEARED_KEY, JSON.stringify([id, ...done].slice(0, 20)));
      clear();
    } catch {
      /* storage unavailable: leave the bag as it is */
    }
  }, [hydrated, order?.status, id, clear]);

  if (order === undefined) return <Skeleton className="mx-auto mt-20 h-96 max-w-2xl" />;
  if (order === null)
    return <EmptyState title="We couldn’t find that order." description="Check the link, or look for your order from your account page." actionHref="/shop" actionLabel="Continue shopping" />;

  return (
    <div className="mx-auto max-w-2xl pb-28 pt-16 sm:pt-24">
      <div className="text-center">
        {/* A thin outlined tick that draws itself; no fill, no bounce */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={`mx-auto grid h-14 w-14 place-items-center rounded-full ring-1 ring-inset ${awaiting ? "text-accent ring-accent/60" : "text-success ring-success/60"}`}
          aria-hidden
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            {awaiting ? (
              <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <motion.path
                d="m5 12.5 4.5 4.5L19 7.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduce ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.25, duration: 0.6, ease: "easeOut" }}
              />
            )}
          </svg>
        </motion.div>
        <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
          {awaiting ? (
            <>
              <h1 className="display-lg mt-8" role="status">Almost <em>there</em>.</h1>
              <p className="lead mx-auto mt-5 max-w-md">We’re waiting for your payment to be confirmed. This page updates on its own.</p>
              {order.paymentUrl && (
                <ButtonLink href={order.paymentUrl} size="lg" className="mt-9">Complete payment</ButtonLink>
              )}
            </>
          ) : (
            <>
              <h1 className="display-lg mt-8" role="status">Thank <em>you</em>.</h1>
              <p className="lead mx-auto mt-5 max-w-md break-words">
                Your order is confirmed.{order.shipping.email ? ` A receipt is on its way to ${order.shipping.email}.` : ""}
              </p>
            </>
          )}
          <p className="eyebrow mt-10">{awaiting ? "Draft reference" : "Order number"}</p>
          <p className="mt-2 break-all font-mono text-[18px] uppercase tracking-[0.08em] sm:text-[20px]">{order.number}</p>
        </motion.div>
      </div>

      {!awaiting && (
        <div className="mt-16 grid gap-1 border-y border-line-soft py-6 text-center">
          <p className="eyebrow">Estimated delivery</p>
          <p className="mt-1 font-display text-[26px] leading-tight">
            {formatDate(order.estimatedDelivery.from)} – {formatDate(order.estimatedDelivery.to)}
          </p>
          <p className="mt-1 text-[13px] text-mute">Placeholder estimate. Each piece is made to order before it ships.</p>
        </div>
      )}

      <h2 className="eyebrow mt-14">{order.items.length === 1 ? "Your piece" : "Your pieces"}</h2>
      <ul className="mt-4 divide-y divide-line-soft border-y border-line-soft">
        {order.items.map((i) => (
          <li key={i.id} className="flex gap-5 py-6 sm:gap-6">
            <CartThumb item={i} className="aspect-[4/5] w-24 sm:w-28" />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium leading-snug sm:text-[16px]">{i.title}</p>
                  <p className="mt-1 text-[13px] text-mute">{i.colorName} · Size {i.size} · Qty {i.quantity}</p>
                </div>
                <p className="shrink-0 text-[15px] tabular-nums">{formatPrice(i.unitPrice * i.quantity)}</p>
              </div>
              {i.customization && <CustomizationSummary customization={i.customization} compact className="mt-4" />}
            </div>
          </li>
        ))}
      </ul>

      <dl className="ml-auto mt-4 max-w-xs text-[14px]">
        <div className="flex justify-between gap-4 py-3"><dt className="text-ink-2">Subtotal</dt><dd className="tabular-nums">{formatPrice(order.totals.subtotal)}</dd></div>
        <div className="flex justify-between gap-4 border-t border-line-soft py-3"><dt className="text-ink-2">Shipping</dt><dd className="tabular-nums">{shippingLabel(order.totals.shipping, awaiting)}</dd></div>
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4 text-[17px] font-medium">
          <dt>{awaiting ? "Estimated total" : "Total"}</dt>
          <dd className="text-[19px] tabular-nums tracking-[-0.01em]">{formatPrice(order.totals.total)}</dd>
        </div>
      </dl>

      <div className="mt-16 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <ButtonLink href="/shop" size="lg">Continue shopping</ButtonLink>
        <ButtonLink href="/account" size="lg" variant="ghost">View your orders</ButtonLink>
      </div>
    </div>
  );
}
