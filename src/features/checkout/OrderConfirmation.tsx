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
    <div className="mx-auto max-w-2xl pb-24 pt-16 sm:pt-24">
      <div className="text-center">
        <motion.div
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success text-white"
          aria-hidden
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <motion.path
              d="m5 12.5 4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.25, duration: 0.5, ease: "easeOut" }}
            />
          </svg>
        </motion.div>
        <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
          {awaiting ? (
            <>
              <h1 className="display-lg mt-8" role="status">Almost there.</h1>
              <p className="lead mt-3">We’re waiting for your payment to be confirmed. This page updates on its own.</p>
              {order.paymentUrl && (
                <ButtonLink href={order.paymentUrl} size="lg" className="mt-8">Complete payment</ButtonLink>
              )}
            </>
          ) : (
            <>
              <h1 className="display-lg mt-8" role="status">Thank you.</h1>
              <p className="lead mt-3">
                Your order is confirmed.{order.shipping.email ? ` A receipt is on its way to ${order.shipping.email}.` : ""}
              </p>
            </>
          )}
          <p className="mt-6 text-[13px] uppercase tracking-[0.14em] text-mute">{awaiting ? "Draft reference" : "Order number"}</p>
          <p className="mt-1 text-[24px] font-semibold tabular-nums tracking-tight">{order.number}</p>
        </motion.div>
      </div>

      {!awaiting && (
        <div className="mt-14 rounded-tile bg-soft p-6 sm:p-8">
          <p className="text-[13px] font-medium uppercase tracking-[0.1em] text-mute">Estimated delivery</p>
          <p className="mt-1 text-[19px] font-semibold">
            {formatDate(order.estimatedDelivery.from)} – {formatDate(order.estimatedDelivery.to)}
          </p>
          <p className="mt-1 text-[14px] text-mute">Placeholder estimate. Each piece is made to order before it ships.</p>
        </div>
      )}

      <ul className={`${awaiting ? "mt-14" : "mt-10"} divide-y divide-line-soft border-y border-line-soft`}>
        {order.items.map((i) => (
          <li key={i.id} className="flex gap-5 py-6">
            <CartThumb item={i} className="h-28 w-28 sm:h-32 sm:w-32" />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-[17px] font-semibold">{i.title}</p>
                  <p className="text-[14px] text-mute">{i.colorName} · Size {i.size} · Qty {i.quantity}</p>
                </div>
                <p className="tabular-nums">{formatPrice(i.unitPrice * i.quantity)}</p>
              </div>
              {i.customization && <CustomizationSummary customization={i.customization} compact className="mt-3" />}
            </div>
          </li>
        ))}
      </ul>

      <dl className="ml-auto mt-6 max-w-xs space-y-2 text-[15px]">
        <div className="flex justify-between"><dt className="text-ink-2">Subtotal</dt><dd className="tabular-nums">{formatPrice(order.totals.subtotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-2">Shipping</dt><dd className="tabular-nums">{shippingLabel(order.totals.shipping, awaiting)}</dd></div>
        <div className="flex justify-between border-t border-line pt-3 text-[19px] font-semibold"><dt>{awaiting ? "Estimated total" : "Total"}</dt><dd className="tabular-nums">{formatPrice(order.totals.total)}</dd></div>
      </dl>

      <div className="mt-12 text-center">
        <ButtonLink href="/shop" size="lg">Continue shopping</ButtonLink>
      </div>
    </div>
  );
}
