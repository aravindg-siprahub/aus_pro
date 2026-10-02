"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
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
        <ol className="mb-12 flex items-center gap-1.5 text-[14px] sm:gap-2" aria-label="Checkout progress">
          {STEPS.map((label, i) => {
            const n = (i + 1) as Step;
            const done = n < step;
            return (
              <li key={label} className="flex items-center gap-2" aria-current={n === step ? "step" : undefined}>
                <button
                  disabled={!done}
                  onClick={() => go(n)}
                  className={cn("flex items-center gap-2 rounded-full py-1 pr-2 transition-colors", n === step ? "font-semibold text-ink" : done ? "text-ink hover:underline" : "text-mute")}
                >
                  <span className={cn("grid h-6 w-6 place-items-center rounded-full text-[12px]", n === step ? "bg-ink text-white" : done ? "bg-ink/10" : "bg-soft")}>{done ? "✓" : n}</span>
                  {label}
                </button>
                {i < 2 && <span className="h-px w-3 bg-line sm:w-10" aria-hidden />}
              </li>
            );
          })}
        </ol>

        <motion.div key={step} {...swapIn}>
            {step === 1 && (
              <form onSubmit={submitShipping} noValidate className="space-y-5">
                <h2 className="display-md !text-[28px]">Where should we send it?</h2>
                <Field id="f-email" label="Email" error={errors.email}>{(a) => <Input {...a} type="email" autoComplete="email" value={info.email} onChange={set("email")} />}</Field>
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
                <Button type="submit" size="lg" className="mt-3 w-full sm:w-auto">Continue to payment</Button>
              </form>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="display-md !text-[28px]">Payment</h2>
                <div className="rounded-tile bg-soft p-7 sm:p-8">
                  <p className="text-[17px] font-semibold">{hosted ? "Secure payment on Shopify." : "Payments are switched off."}</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
                    {hosted
                      ? "After you review your order you’ll be taken to Shopify’s secure checkout to pay. Shipping and tax are calculated there. We never see or store your card details."
                      : "This is a prototype. No card details are collected and nothing will be charged. In the next phase, secure payment will be handled by the payment provider."}
                  </p>
                  <div className="mt-6 flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3.5 text-[15px]">
                    <span className="grid h-5 w-5 place-items-center rounded-full border-[5px] border-ink bg-white" aria-hidden />
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
                <h2 className="display-md !text-[28px]">Review your order.</h2>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <div className="flex items-baseline justify-between"><h3 className="text-[15px] font-semibold">Ship to</h3><button className="text-[13px] text-ink font-medium link-draw" onClick={() => go(1)}>Edit</button></div>
                    <address className="mt-2 text-[15px] not-italic leading-relaxed text-ink-2">
                      {info.firstName} {info.lastName}<br />{info.address}{info.apartment ? `, ${info.apartment}` : ""}<br />{info.city}, {info.region} {info.postalCode}<br />{info.country}
                    </address>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between"><h3 className="text-[15px] font-semibold">Payment</h3><button className="text-[13px] text-ink font-medium link-draw" onClick={() => go(2)}>Edit</button></div>
                    <p className="mt-2 text-[15px] text-ink-2">{hosted ? "Secure payment on Shopify" : "Mock payment — no charge"}</p>
                    <p className="text-[15px] text-ink-2">{info.email}</p>
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
                <p className="text-[13px] text-mute">
                  {hosted ? "You’ll complete payment on Shopify’s secure checkout. Your bag is kept until your order is confirmed." : "By placing this mock order you’re only simulating a purchase."}
                </p>
              </div>
            )}
        </motion.div>
      </div>

      <aside aria-label="Order summary" className="lg:sticky lg:top-[calc(var(--sticky-top)+2rem)] lg:transition-[top] lg:duration-500 lg:self-start">
        <div className="border-t border-ink pt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[13px] font-medium uppercase tracking-[0.14em] text-mute">Order summary</h2>
            <Link href="/cart" className="text-[13px] text-ink font-medium link-draw">Edit bag</Link>
          </div>
          <ul className="mt-5 divide-y divide-line">
            {items.map((i) => (
              <li key={i.id} className="flex gap-4 py-4 first:pt-0">
                <div className="relative">
                  <CartThumb item={i} className="h-20 w-20" />
                  <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] text-white">{i.quantity}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium">{i.title}</p>
                  <p className="text-[13px] text-mute">{i.colorName} · {i.size}</p>
                  {i.customization && <p className="mt-1 truncate text-[13px] text-ink-2">“{i.customization.text}”</p>}
                </div>
                <p className="text-[15px] tabular-nums">{formatPrice(i.unitPrice * i.quantity)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-2.5 border-t border-line pt-5 text-[15px]">
            <div className="flex justify-between"><dt className="text-ink-2">Subtotal</dt><dd className="tabular-nums">{formatPrice(totals.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-2">Shipping</dt><dd className="tabular-nums">{shippingLabel(totals.shipping)}</dd></div>
            <div className="flex justify-between pt-2 text-[19px] font-semibold"><dt>{getShopConfig().provider === "shopify" ? "Estimated total" : "Total"}</dt><dd className="tabular-nums">{formatPrice(totals.total)}</dd></div>
          </dl>
          {step === 3 && items.some((i) => i.customization) && (
            <details className="mt-5 border-t border-line pt-4 text-[14px]">
              <summary className="cursor-pointer font-medium">Customization details</summary>
              <div className="mt-3 space-y-4">
                {items.filter((i) => i.customization).map((i) => (
                  <div key={i.id}><p className="mb-1 text-mute">{i.title}</p><CustomizationSummary customization={i.customization!} compact /></div>
                ))}
              </div>
            </details>
          )}
        </div>
      </aside>
    </div>
  );
}
