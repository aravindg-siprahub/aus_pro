"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Order } from "@/types/commerce";
import { commerce } from "@/lib/commerce";
import { Container, PageHeader } from "@/components/ui/Layout";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { formatDate, formatPrice } from "@/lib/pricing";

const itemCount = (o: Order) => {
  const n = o.items.reduce((c, i) => c + i.quantity, 0);
  return `${n} ${n === 1 ? "piece" : "pieces"}`;
};

export default function AccountPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  useEffect(() => {
    commerce.listOrders().then(setOrders);
  }, []);

  return (
    <Container size="narrow">
      <PageHeader eyebrow="Account" title={<>Your <em>orders</em>.</>} description="Sign-in arrives in a later phase. For now, orders placed on this device appear here." />
      <div className="pb-24" aria-busy={orders === null}>
        {orders === null ? (
          <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
        ) : orders.length === 0 ? (
          <EmptyState title="No orders yet." description="When you place an order it will show up here." actionHref="/shop" actionLabel="Start shopping" />
        ) : (
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/order/${o.id}`} className="group flex items-center justify-between gap-4 py-6 sm:py-7">
                  <div className="min-w-0">
                    <p className="break-all font-mono text-[15px] uppercase tracking-[0.08em]">{o.number}</p>
                    <p className="mt-1.5 text-[13px] text-mute">
                      {formatDate(o.placedAt, { dateStyle: "medium" })} · {itemCount(o)}
                      {o.status === "awaiting_payment" && <> · <span className="text-accent">Awaiting payment</span></>}
                    </p>
                  </div>
                  <p className="flex shrink-0 items-center gap-3 text-[15px] tabular-nums">
                    {formatPrice(o.totals.total)}
                    <span aria-hidden className="text-mute transition-[transform,color] duration-300 ease-[var(--ease-premium)] group-hover:translate-x-1 group-hover:text-ink motion-reduce:transition-none">→</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}
