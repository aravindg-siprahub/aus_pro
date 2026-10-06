"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Customization, FontId, PrintLocation, PrintSize, Product, Size } from "@/types/commerce";
import { Garment, type GarmentView } from "@/components/product/Garment";
import { GarmentStage } from "@/components/product/GarmentStage";
import { ProductGallery } from "@/components/product/ProductGallery";
import { Swatch, ChipGroup, Field, Input, QuantityStepper } from "@/components/ui/Controls";
import { Button, ButtonLink, TextLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Layout";
import { MobileDock, useViewportSide } from "@/components/ui/MobileDock";
import { formatPrice, unitPriceFor } from "@/lib/pricing";
import { categoryName } from "@/lib/commerce/mock-data";
import { availabilityOf } from "@/lib/commerce/availability";
import { contrastRatio, luminance } from "@/lib/color";
import { useCart } from "@/features/cart/CartProvider";
import { buildCartItem, findVariant } from "@/features/cart/helpers";
import { FONTS, LOCATIONS, MAX_TEXT, PRINT_SIZES, TEXT_COLORS } from "@/features/customizer/config";
import { cn } from "@/lib/cn";

type Shot = { id: string; label: string; view: GarmentView; zoom?: boolean };
const SHOTS: Shot[] = [
  { id: "front", label: "Front", view: "front" },
  { id: "back", label: "Back", view: "back" },
  { id: "detail", label: "Detail", view: "front", zoom: true },
];

type Mode = "plain" | "custom";

/** Ink that reads on the garment by default: white on dark fabric, black on light (as in the studio). */
const defaultInk = (garmentHex: string) => (luminance(garmentHex) < 0.25 ? "#ffffff" : "#111111");

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function ProductDetail({ product }: { product: Product }) {
  const cart = useCart();
  const [colorId, setColorId] = useState(product.colors[0].id);
  const [size, setSize] = useState<Size>(() =>
    findVariant(product, product.colors[0].id, "M")?.available
      ? "M"
      : (product.sizes.find((s) => findVariant(product, product.colors[0].id, s)?.available) ?? "M"),
  );
  const [shot, setShot] = useState(SHOTS[0]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(addedTimer.current), []);

  // Customisation (the same fields the studio edits; the studio adds the live preview)
  const [mode, setMode] = useState<Mode>("plain");
  const [text, setText] = useState("");
  const [fontId, setFontId] = useState<FontId>("sans");
  const [location, setLocation] = useState<PrintLocation>("front");
  const [printSize, setPrintSize] = useState<PrintSize>("medium");
  const [inkChoice, setInkChoice] = useState<string | null>(null);
  const [textError, setTextError] = useState(false);
  const textRef = useRef<HTMLInputElement>(null);

  // On small screens, once the main buttons scroll away, keep Add to cart within reach.
  const [ctaRef, ctaSide] = useViewportSide<HTMLDivElement>();
  const dock = ctaSide === "above";

  const color = product.colors.find((c) => c.id === colorId)!;
  const variant = findVariant(product, colorId, size);
  const inStock = !!variant?.available;
  const custom = mode === "custom";
  const hasText = text.trim().length > 0;
  // Until the customer picks an ink, it follows the garment so the print always reads.
  const ink = inkChoice ?? defaultInk(color.hex);
  const inkName = TEXT_COLORS.find((c) => c.hex === ink)?.name ?? ink;
  const lowContrast = contrastRatio(ink, color.hex) < 1.7;

  const base = variant?.price ?? product.basePrice;
  const surcharge = (p: PrintSize) => unitPriceFor(base, p, true) - base;
  const minSurcharge = Math.min(...PRINT_SIZES.map((p) => surcharge(p.id)));
  // With Custom print chosen the price includes the print, so the figure shown is the one the cart will charge.
  const unit = custom ? unitPriceFor(base, printSize, true) : base;
  const total = unit * quantity;

  const colourStock = availabilityOf(product, colorId);
  const stock: { tone: "in" | "limited" | "out"; label: string } = !inStock
    ? { tone: "out", label: colourStock.status === "sold_out" ? `Sold out in ${color.name}` : `${size} is sold out in ${color.name}` }
    : colourStock.status === "limited"
      ? { tone: "limited", label: "In stock · limited sizes" }
      : { tone: "in", label: "In stock" };

  const pickColor = (id: string) => {
    setColorId(id);
    if (!findVariant(product, id, size)?.available) {
      setSize(product.sizes.find((s) => findVariant(product, id, s)?.available) ?? "M");
    }
  };

  const studioHref = (withDesign: boolean) => {
    const q = new URLSearchParams({ color: colorId, size });
    if (withDesign) {
      if (hasText) q.set("text", text.trim());
      q.set("font", fontId);
      q.set("place", location);
      q.set("print", printSize);
      q.set("ink", ink);
    }
    return `/customize/${product.slug}?${q.toString()}`;
  };

  const focusText = () => {
    const el = textRef.current;
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
    el.focus({ preventScroll: true });
  };

  const addToCart = () => {
    if (!variant?.available) return;
    if (custom && !hasText) {
      setTextError(true);
      focusText();
      return;
    }
    const customization: Customization | undefined = custom
      ? { text, fontId, textColor: ink, printSize, location }
      : undefined;
    cart.add(buildCartItem(product, colorId, size, quantity, customization));
    setAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 4000);
  };

  const studioDisabled = !inStock ? { "aria-disabled": true, tabIndex: -1 } : {};

  return (
    <div className="grid gap-7 pb-24 sm:gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16 lg:pb-32 xl:gap-24">
      {/* Gallery: the product is the hero. Shopify photos when we have them; the illustration for the demo catalogue. */}
      {product.images ? (
        <ProductGallery
          images={product.images}
          name={product.name}
          focusUrl={color.imageUrl}
          className="lg:sticky lg:top-[calc(var(--sticky-top)+1.5rem)] lg:self-start lg:transition-[top] lg:duration-500"
        />
      ) : (
        <div className="flex min-w-0 flex-col lg:sticky lg:top-[calc(var(--sticky-top)+1.5rem)] lg:flex-row lg:gap-5 lg:self-start lg:transition-[top] lg:duration-500">
          <div role="tablist" aria-label="Product views" className="order-2 mt-4 flex gap-2 p-1 lg:order-1 lg:mt-0 lg:w-[88px] lg:shrink-0 lg:flex-col">
            {SHOTS.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={shot.id === s.id}
                aria-label={`${s.label} view`}
                onClick={() => setShot(s)}
                className={cn(
                  "aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-tile bg-soft p-1.5 transition-opacity duration-500 ease-[var(--ease-premium)] motion-reduce:transition-none sm:w-[72px] lg:w-full",
                  shot.id === s.id ? "opacity-100 outline outline-1 outline-offset-2 outline-ink" : "opacity-45 hover:opacity-100",
                )}
              >
                <Garment type={product.category} color={color.hex} view={s.view} zoom={s.zoom} className="h-full w-full" title="" />
              </button>
            ))}
          </div>
          <GarmentStage
            type={product.category}
            color={color.hex}
            view={shot.view}
            zoom={shot.zoom}
            className="order-1 aspect-[4/5] max-h-[54svh] w-full overflow-hidden rounded-tile bg-soft sm:max-h-[74svh] lg:order-2 lg:aspect-auto lg:h-[calc(100svh-var(--sticky-top)-3rem)] lg:max-h-[920px] lg:min-h-[560px] lg:flex-1"
            innerClassName="p-[8%]"
            garmentClassName="shadow-product"
            title={`${product.name} in ${color.name}, ${shot.label.toLowerCase()} view`}
          />
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 lg:max-w-[540px] lg:pt-6">
        <Eyebrow accent>
          {categoryName(product.category)}
          {product.badge && <span className="text-mute"> · {product.badge}</span>}
        </Eyebrow>
        <h1 className="display-md mt-4">{product.name}</h1>

        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className="text-[17px] tabular-nums text-ink" aria-live="polite">
            {formatPrice(unit)}
            {custom && <span className="ml-2 text-[13px] text-mute">incl. print</span>}
          </p>
          <p className="flex items-center gap-2 text-[13px] text-ink-2">
            <span
              aria-hidden
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                stock.tone === "in" && "bg-success",
                stock.tone === "limited" && "bg-accent",
                stock.tone === "out" && "bg-mute",
              )}
            />
            {stock.label}
          </p>
        </div>

        <p className="mt-7 max-w-[46ch] text-[15px] leading-relaxed text-ink-2">{product.description}</p>

        {/* Colour */}
        <div className="mt-10 border-t border-line-soft pt-8">
        <fieldset>
          <Legend label="Colour" value={color.name} />
          <div role="radiogroup" aria-label="Colour" className="-ml-1.5 flex flex-wrap gap-1">
            {product.colors.map((c) => (
              <Swatch key={c.id} hex={c.hex} label={c.name} selected={c.id === colorId} onSelect={() => pickColor(c.id)} />
            ))}
          </div>
        </fieldset>
        </div>

        {/* Size */}
        <fieldset className="mt-8">
          <Legend label="Size" value={size} />
          <ChipGroup<Size>
            label="Size"
            value={size}
            onChange={setSize}
            columns="grid-cols-6"
            options={product.sizes.map((s) => ({ id: s, label: s, disabled: !findVariant(product, colorId, s)?.available }))}
          />
        </fieldset>

        {/* Customisation */}
        <div className="mt-10 border-t border-line-soft pt-8">
        <fieldset>
          <Legend label="Personalise" value={custom ? "Custom print" : "Plain"} />
          <ChipGroup<Mode>
            label="Personalise"
            value={mode}
            onChange={(m) => { setMode(m); if (m === "plain") setTextError(false); }}
            columns="grid-cols-2"
            options={[
              { id: "plain", label: "Plain", hint: "As pictured" },
              { id: "custom", label: "Custom print", hint: minSurcharge > 0 ? `From +${formatPrice(minSurcharge)}` : "Your words" },
            ]}
          />

          {/* Collapses with a row-height transition; inert while closed so nothing hidden takes focus. */}
          <div
            inert={!custom}
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-500 ease-[var(--ease-premium)] motion-reduce:transition-none",
              custom ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            {/* Side padding keeps focus outlines from being clipped by the overflow */}
            <div className="-mx-2 overflow-hidden px-2 pb-1">
              <div className="space-y-8 pt-8">
                <Field
                  id="pd-print-text"
                  label="Your text"
                  error={textError && !hasText ? "Add your text, or choose Plain." : undefined}
                  hint={`${text.length}/${MAX_TEXT} characters`}
                >
                  {(a) => (
                    <Input
                      {...a}
                      ref={textRef}
                      value={text}
                      maxLength={MAX_TEXT}
                      placeholder="Type something worth wearing"
                      autoComplete="off"
                      onChange={(e) => { setText(e.target.value); if (e.target.value.trim()) setTextError(false); }}
                    />
                  )}
                </Field>

                <fieldset>
                  <Legend label="Typeface" value={FONTS.find((f) => f.id === fontId)?.label} small />
                  <div role="radiogroup" aria-label="Typeface" className="grid grid-cols-5 gap-2">
                    {FONTS.map((f) => {
                      const on = f.id === fontId;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          aria-label={f.label}
                          title={f.label}
                          onClick={() => setFontId(f.id)}
                          className={cn(
                            "grid h-14 place-items-center rounded-ui text-[22px] leading-none transition-[background-color,color,box-shadow] duration-300 ease-[var(--ease-premium)]",
                            on ? "bg-ink text-on-ink" : "text-ink ring-1 ring-inset ring-line hover:ring-ink",
                          )}
                        >
                          <span aria-hidden style={{ fontFamily: f.family }}>Aa</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset>
                  <Legend label="Placement" small />
                  <ChipGroup<PrintLocation>
                    label="Placement"
                    value={location}
                    onChange={setLocation}
                    columns="grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4"
                    options={LOCATIONS.map((l) => ({ id: l.id, label: l.label }))}
                  />
                </fieldset>

                <fieldset>
                  <Legend label="Print size" small />
                  <ChipGroup<PrintSize>
                    label="Print size"
                    value={printSize}
                    onChange={setPrintSize}
                    options={PRINT_SIZES.map((p) => {
                      const extra = surcharge(p.id);
                      return { id: p.id, label: p.label, hint: extra > 0 ? `+${formatPrice(extra)}` : "Included" };
                    })}
                  />
                  <p className="mt-2.5 text-[12px] text-mute">
                    {PRINT_SIZES.find((p) => p.id === printSize)?.hint}
                  </p>
                </fieldset>

                <fieldset>
                  <Legend label="Ink" value={inkName} small />
                  <div role="radiogroup" aria-label="Ink colour" className="-ml-1.5 flex flex-wrap gap-1">
                    {TEXT_COLORS.map((c) => (
                      <Swatch key={c.hex} hex={c.hex} label={c.name} selected={ink === c.hex} onSelect={() => setInkChoice(c.hex)} />
                    ))}
                  </div>
                  <div aria-live="polite">
                    {lowContrast && (
                      <p className="mt-3 border-l border-accent pl-3 text-[13px] leading-relaxed text-ink-2">
                        {inkName} ink may be hard to see on {color.name}. Try a contrasting shade.
                      </p>
                    )}
                  </div>
                </fieldset>

                <TextLink href={studioHref(true)}>Preview it in the studio</TextLink>
              </div>
            </div>
          </div>
        </fieldset>
        </div>

        {/* Quantity + add */}
        <div ref={ctaRef} className="mt-10 border-t border-line-soft pt-8">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[13px] font-medium text-ink">Quantity</p>
            <QuantityStepper value={quantity} onChange={(n) => setQuantity(Math.max(1, Math.min(10, n)))} min={1} max={10} />
          </div>

          <Button size="lg" className="mt-5 w-full" onClick={addToCart} disabled={!inStock}>
            {inStock ? (
              <>
                Add to cart <span aria-hidden className="text-on-ink/50">—</span> <span className="tabular-nums">{formatPrice(total)}</span>
              </>
            ) : (
              "Sold out"
            )}
          </Button>

          {/* Fixed-height row so the confirmation never shifts the layout */}
          <div role="status" className="flex h-11 items-center justify-center gap-4 text-[13px]">
            {added && (
              <>
                <span className="flex items-center gap-2 text-ink-2">
                  <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 text-success" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="m3 8.5 3 3 7-7" strokeLinecap="square" />
                  </svg>
                  Added to cart
                </span>
                <Link href="/cart" className="link-draw font-medium text-ink">View cart</Link>
              </>
            )}
          </div>

          <ButtonLink
            href={studioHref(custom)}
            variant="secondary"
            size="lg"
            className={cn("w-full", !inStock && "pointer-events-none")}
            {...studioDisabled}
          >
            Design in the studio
          </ButtonLink>
          <p className="mt-3 text-center text-[12px] text-mute">Live preview, every placement, every ink.</p>
        </div>

        {/* Details */}
        <div className="mt-14 border-t border-line-soft">
          {[
            { t: "Materials", c: product.details.material },
            { t: "Fit", c: product.details.fit },
            { t: "Delivery", c: product.details.delivery },
            { t: "Care", c: product.details.care },
          ].map((d) => (
            <details key={d.t} className="group border-b border-line-soft">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[14px] font-medium tracking-[0.01em] text-ink [&::-webkit-details-marker]:hidden">
                {d.t}
                <span aria-hidden className="relative h-3 w-3 shrink-0 text-mute transition-colors group-hover:text-ink">
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
                  <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current transition-transform duration-300 ease-[var(--ease-premium)] group-open:scale-y-0 motion-reduce:transition-none" />
                </span>
              </summary>
              <p className="max-w-[52ch] pb-6 pr-8 text-[14px] leading-relaxed text-ink-2">{d.c}</p>
            </details>
          ))}
        </div>
      </div>

      <MobileDock show={dock}>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-ink">{product.name}</p>
          <p className="truncate text-[12px] tabular-nums text-mute">
            {color.name} · {size} · {formatPrice(total)}
          </p>
        </div>
        <Button className="shrink-0" onClick={addToCart} disabled={!inStock}>
          {!inStock ? "Sold out" : added ? "Added" : "Add to cart"}
        </Button>
      </MobileDock>
    </div>
  );
}

/** A fieldset legend: the option name, then the current choice in a quieter tone. */
function Legend({ label, value, small }: { label: string; value?: ReactNode; small?: boolean }) {
  return (
    <legend className="mb-3.5 text-[13px]">
      <span className={cn("font-medium", small ? "text-ink-2" : "text-ink")}>{label}</span>
      {value != null && <span className="text-mute"> — {value}</span>}
    </legend>
  );
}
