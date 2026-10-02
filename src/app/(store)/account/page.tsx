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
  return `${n} ${n === 1 ? "item" : "items"}`;
};

export default function AccountPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  useEffect(() => {
    commerce.listOrders().then(setOrders);
  }, []);

  return (
    <Container size="narrow">
      <PageHeader eyebrow="Account" title="Your orders." description="Sign-in arrives in a later phase. For now, orders placed on this device appear here." />
      <div className="pb-16">
        {orders === null ? (
          <Skeleton className="h-24" />
        ) : orders.length === 0 ? (
          <EmptyState title="No orders yet." description="When you place an order it will show up here." actionHref="/shop" actionLabel="Start shopping" />
        ) : (
          <ul className="divide-y divide-line-soft">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/order/${o.id}`} className="flex items-center justify-between gap-4 py-6 transition-colors hover:text-accent">
                  <div>
                    <p className="text-[17px] font-semibold">{o.number}</p>
                    <p className="text-[14px] text-mute">{formatDate(o.placedAt, { dateStyle: "medium" })} · {itemCount(o)}</p>
                  </div>
                  <p className="tabular-nums">{formatPrice(o.totals.total)} ›</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}
