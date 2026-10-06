"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { swapIn } from "@/lib/motion";
import type { ShippingInfo } from "@/types/commerce";
import { useCart } from "@/features/cart/CartProvider";
import { commerce } from "@/lib/commerce";
import { formatPrice, shippingLabel } from "@/lib/pricing";
import { getShopConfig } from "@/lib/shop-config";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Controls";
import { EmptyState, ErrorBanner, Skeleton } from "@/components/ui/Feedback";
import { CartThumb } from "@/components/product/CartThumb";
import { CustomizationSummary } from "@/features/customizer/CustomizationSummary";
import { cn } from "@/lib/cn";

type Step = 1 | 2 | 3;
const STEPS = ["Shipping", "Payment", "Review"] as const;

const EMPTY: ShippingInfo = {
  email: "", firstName: "", lastName: "", address: "", apartment: "", city: "", region: "", postalCode: "", country: "United States", phone: "",
};

function validate(s: ShippingInfo) {
  const e: Partial<Record<keyof ShippingInfo, string>> = {};
  if (!/^\S+@\S+\.\S+$/.test(s.email)) e.email = "Enter a valid email address.";
  if (!s.firstName.trim()) e.firstName = "Enter your first name.";
  if (!s.lastName.trim()) e.lastName = "Enter your last name.";
  if (!s.address.trim()) e.address = "Enter your street address.";
  if (!s.city.trim()) e.city = "Enter your city.";
  if (!s.region.trim()) e.region = "Enter your state or region.";
  if (s.postalCode.trim().length < 3) e.postalCode = "Enter a valid postal code.";
  return e;
}

export function Checkout() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { items, totals, hydrated, clear } = useCart();
  const [step, setStep] = useState<Step>(1);
  const [info, setInfo] = useState<ShippingInfo>(EMPTY);
  const [errors, setErrors] = useState<ReturnType<typeof validate>>({});
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const top = useRef<HTMLDivElement>(null);

  const set = (k: keyof ShippingInfo) => (e: { target: { value: string } }) => {
    setInfo((i) => ({ ...i, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const go = (s: Step) => {
    setStep(s);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submitShipping = (ev: React.FormEvent) => {
    ev.preventDefault();
    const v = validate(info);
    setErrors(v);
    if (Object.keys(v).length) {
      const first = Object.keys(v)[0];
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    go(2);
  };

  const place = async () => {
    setError(null);
    setPlacing(true);
    try {
      const result = await commerce.startCheckout({ items, shipping: info });
      if (result.type === "order") {
        clear();
        router.replace(`/order/${result.order.id}`);
      } else {
        // Shopify's hosted checkout takes the payment. The bag is cleared on the confirmation
        // page once the order is paid, so an abandoned payment doesn't lose the customer's bag.
        window.location.assign(result.url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn’t place your order. Please try again.");
      setPlacing(false);
    }
  };

  const hosted = getShopConfig().provider === "shopify";

  if (!hydrated) return <Skeleton className="h-96" />;
  if (items.length === 0 && !placing) {
    return <EmptyState title="Nothing to check out." description="Add something to your bag first." actionHref="/shop" actionLabel="Continue shopping" />;
  }

  return (
    <div ref={top} className="grid scroll-mt-24 grid-cols-[minmax(0,1fr)] gap-12 pb-16 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-20">
      <div>
        {/* Progress: numbered steps joined by hairlines; the current step is underlined, finished ones ticked. */}
        <ol className="mb-14 flex items-center gap-1.5 sm:gap-3" aria-label="Checkout progress">
          {STEPS.map((label, i) => {
            const n = (i + 1) as Step;
            const done = n < step;
            const current = n === step;
            return (
              <li key={label} className="flex min-w-0 items-center gap-1.5 sm:gap-3" aria-current={current ? "step" : undefined}>
                <button
                  type="button"
                  disabled={!done}
                  onClick={() => go(n)}
                  aria-label={done ? `${label}, completed. Go back to ${label.toLowerCase()}` : undefined}
                  className={cn(
                    "group flex min-h-10 items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors duration-300 sm:text-[12px] sm:tracking-[0.16em]",
                    current ? "text-ink" : done ? "text-ink-2 hover:text-ink" : "text-mute",
                  )}
                >
                  <span className={cn("tabular-nums", done ? "text-accent" : current ? "text-ink" : "text-mute")} aria-hidden>
                    {done ? "✓" : `0${n}`}
                  </span>
                  <span className={cn("relative pb-0.5", current && "after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-ink")}>{label}</span>
                </button>
                {i < STEPS.length - 1 && <span className="h-px w-3 shrink-0 bg-line sm:w-12" aria-hidden />}
              </li>
            );
          })}
        </ol>

        <motion.div key={step} {...(reduce ? {} : swapIn)}>
            {step === 1 && (
              <form onSubmit={submitShipping} noValidate className="space-y-5">
                <h2 className="display-sm">Where should we <em>send</em> it?</h2>
                <p className="eyebrow !mt-8">Contact</p>
                <Field id="f-email" label="Email" error={errors.email}>{(a) => <Input {...a} type="email" autoComplete="email" value={info.email} onChange={set("email")} />}</Field>
                <p className="eyebrow !mt-10">Delivery address</p>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="f-firstName" label="First name" error={errors.firstName}>{(a) => <Input {...a} autoComplete="given-name" value={info.firstName} onChange={set("firstName")} />}</Field>
                  <Field id="f-lastName" label="Last name" error={errors.lastName}>{(a) => <Input {...a} autoComplete="family-name" value={info.lastName} onChange={set("lastName")} />}</Field>
                </div>
                <Field id="f-address" label="Address" error={errors.address}>{(a) => <Input {...a} autoComplete="address-line1" value={info.address} onChange={set("address")} />}</Field>
                <Field id="f-apartment" label="Apartment, suite (optional)">{(a) => <Input {...a} autoComplete="address-line2" value={info.apartment} onChange={set("apartment")} />}</Field>
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field id="f-city" label="City" error={errors.city}>{(a) => <Input {...a} autoComplete="address-level2" value={info.city} onChange={set("city")} />}</Field>
                  <Field id="f-region" label="State / Region" error={errors.region}>{(a) => <Input {...a} autoComplete="address-level1" value={info.region} onChange={set("region")} />}</Field>
                  <Field id="f-postalCode" label="Postal code" error={errors.postalCode}>{(a) => <Input {...a} autoComplete="postal-code" value={info.postalCode} onChange={set("postalCode")} />}</Field>
                </div>
                <Field id="f-country" label="Country">
                  {(a) => (
                    <Select {...a} value={info.country} onChange={set("country")} autoComplete="country-name">
                      {["United States", "Canada", "United Kingdom", "Australia", "India", "Germany", "France"].map((c) => <option key={c}>{c}</option>)}
                    </Select>
                  )}
                </Field>
                <div className="!mt-10 border-t border-line-soft pt-8">
                  <Button type="submit" size="lg" className="w-full sm:w-auto">Continue to payment</Button>
                </div>
              </form>
            )}

            {step === 2 && (
              <div className="space-y-8">
                <h2 className="display-sm">Payment</h2>
                <div className="border-y border-line-soft py-7">
                  <p className="text-[16px] font-medium">{hosted ? "Secure payment on Shopify." : "Payments are switched off."}</p>
                  <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-2">
                    {hosted
                      ? "After you review your order you’ll be taken to Shopify’s secure checkout to pay. Shipping and tax are calculated there. We never see or store your card details."
                      : "This is a prototype. No card details are collected and nothing will be charged. In the next phase, secure payment will be handled by the payment provider."}
                  </p>
                  <div className="mt-6 flex items-center gap-3 rounded-ui px-4 py-3.5 text-[14px] ring-1 ring-inset ring-ink">
                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full ring-1 ring-ink" aria-hidden>
                      <span className="h-2 w-2 rounded-full bg-ink" />
                    </span>
                    {hosted ? "Pay securely on Shopify" : "Mock payment — no charge"}
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" className="w-full sm:w-auto" onClick={() => go(3)}>Review order</Button>
                  <Button size="lg" variant="ghost" onClick={() => go(1)}>Back to shipping</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8">
                <h2 className="display-sm">Review your <em>order</em>.</h2>
                <div className="grid border-y border-line-soft sm:grid-cols-2">
                  <div className="py-6 sm:pr-8">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="eyebrow">Ship to</h3>
                      <button type="button" className="link-draw text-[13px] font-medium text-ink" onClick={() => go(1)} aria-label="Edit shipping address">Edit</button>
                    </div>
                    <address className="mt-3 break-words text-[15px] not-italic leading-relaxed text-ink-2">
                      {info.firstName} {info.lastName}<br />{info.address}{info.apartment ? `, ${info.apartment}` : ""}<br />{info.city}, {info.region} {info.postalCode}<br />{info.country}
                    </address>
                  </div>
                  <div className="border-t border-line-soft py-6 sm:border-l sm:border-t-0 sm:pl-8">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="eyebrow">Payment</h3>
                      <button type="button" className="link-draw text-[13px] font-medium text-ink" onClick={() => go(2)} aria-label="Edit payment">Edit</button>
                    </div>
                    <p className="mt-3 text-[15px] text-ink-2">{hosted ? "Secure payment on Shopify" : "Mock payment — no charge"}</p>
                    <p className="break-words text-[15px] text-ink-2">{info.email}</p>
                  </div>
                </div>
                {error && <ErrorBanner>{error}</ErrorBanner>}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" loading={placing} onClick={place} className="w-full sm:w-auto sm:min-w-64">
                    {placing
                      ? hosted ? "Preparing secure checkout…" : "Placing order…"
                      : hosted ? `Continue to payment · ${formatPrice(totals.total)}` : `Place order · ${formatPrice(totals.total)}`}
                  </Button>
                  <Button size="lg" variant="ghost" disabled={placing} onClick={() => go(2)}>Back</Button>
                </div>
                <p className="max-w-xl text-[13px] leading-relaxed text-mute">
                  {hosted ? "You’ll complete payment on Shopify’s secure checkout. Your bag is kept until your order is confirmed." : "By placing this mock order you’re only simulating a purchase."}
                </p>
              </div>
            )}
        </motion.div>
      </div>

      <aside aria-label="Order summary" className="lg:sticky lg:top-[calc(var(--sticky-top)+2rem)] lg:self-start lg:transition-[top] lg:duration-500 motion-reduce:transition-none">
        <div className="border-t border-ink pt-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="eyebrow">Order summary</h2>
            <Link href="/cart" className="link-draw text-[13px] font-medium text-ink">Edit bag</Link>
          </div>
          <ul className="mt-6 divide-y divide-line-soft">
            {items.map((i) => (
              <li key={i.id} className="flex gap-4 py-5 first:pt-0">
                <div className="relative shrink-0">
                  <CartThumb item={i} className="aspect-[4/5] w-16" />
                  <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] tabular-nums text-on-ink" aria-hidden>
                    {i.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium leading-snug">{i.title}<span className="sr-only">, quantity {i.quantity}</span></p>
                  <p className="mt-0.5 text-[13px] text-mute">{i.colorName} · {i.size}</p>
                  {i.customization && <p className="mt-1 truncate text-[13px] text-ink-2">“{i.customization.text}”</p>}
                </div>
                <p className="shrink-0 text-[14px] tabular-nums">{formatPrice(i.unitPrice * i.quantity)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-2 border-t border-line-soft text-[14px]">
            <div className="flex justify-between gap-4 py-3"><dt className="text-ink-2">Subtotal</dt><dd className="tabular-nums">{formatPrice(totals.subtotal)}</dd></div>
            <div className="flex justify-between gap-4 border-t border-line-soft py-3"><dt className="text-ink-2">Shipping</dt><dd className="tabular-nums">{shippingLabel(totals.shipping)}</dd></div>
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4 text-[17px] font-medium">
              <dt>{getShopConfig().provider === "shopify" ? "Estimated total" : "Total"}</dt>
              <dd className="text-[19px] tabular-nums tracking-[-0.01em]">{formatPrice(totals.total)}</dd>
            </div>
          </dl>
          {step === 3 && items.some((i) => i.customization) && (
            <details className="group mt-6 border-t border-line-soft pt-4 text-[14px]">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                Customization details
                <span aria-hidden className="text-mute transition-transform duration-300 group-open:rotate-45 motion-reduce:transition-none">+</span>
              </summary>
              <div className="mt-3 space-y-5">
                {items.filter((i) => i.customization).map((i) => (
                  <div key={i.id}><p className="eyebrow mb-2">{i.title}</p><CustomizationSummary customization={i.customization!} compact /></div>
                ))}
              </div>
            </details>
          )}
        </div>
      </aside>
    </div>
  );
}
