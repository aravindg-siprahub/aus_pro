"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product, Size } from "@/types/commerce";
import { Garment, type GarmentView } from "@/components/product/Garment";
import { GarmentStage } from "@/components/product/GarmentStage";
import { ProductGallery } from "@/components/product/ProductGallery";
import { Swatch, ChipGroup } from "@/components/ui/Controls";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Layout";
import { MobileDock, useViewportSide } from "@/components/ui/MobileDock";
import { formatPrice, unitPriceFor } from "@/lib/pricing";
import { categoryName } from "@/lib/commerce/mock-data";
import { useCart } from "@/features/cart/CartProvider";
import { buildCartItem, findVariant } from "@/features/cart/helpers";
import { cn } from "@/lib/cn";

type Shot = { id: string; label: string; view: GarmentView; zoom?: boolean };
const SHOTS: Shot[] = [
  { id: "front", label: "Front", view: "front" },
  { id: "back", label: "Back", view: "back" },
  { id: "detail", label: "Detail", view: "front", zoom: true },
];

export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const cart = useCart();
  const [colorId, setColorId] = useState(product.colors[0].id);
  const [size, setSize] = useState<Size>("M");
  const [shot, setShot] = useState(SHOTS[0]);
  const [added, setAdded] = useState(false);
  // On small screens, once the main buttons scroll away, keep Customize within reach.
  const [ctaRef, ctaSide] = useViewportSide<HTMLDivElement>();
  const dock = ctaSide === "above";

  const color = product.colors.find((c) => c.id === colorId)!;
  const variant = findVariant(product, colorId, size);
  const inStock = !!variant?.available;

  const pickColor = (id: string) => {
    setColorId(id);
    if (!findVariant(product, id, size)?.available) {
      setSize(product.sizes.find((s) => findVariant(product, id, s)?.available) ?? "M");
    }
  };

  const addPlain = () => {
    cart.add(buildCartItem(product, colorId, size));
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="grid gap-8 pb-20 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-14 xl:gap-20">
      {/* Gallery: the product is the hero. Shopify photos when we have them; the illustration for the mock catalogue. */}
      {product.images ? (
        <ProductGallery
          images={product.images}
          name={product.name}
          focusUrl={color.imageUrl}
          className="lg:sticky lg:top-[calc(var(--sticky-top)+1rem)] lg:self-start lg:transition-[top] lg:duration-500"
        />
      ) : (
      <div className="flex flex-col lg:sticky lg:top-[calc(var(--sticky-top)+1rem)] lg:transition-[top] lg:duration-500 lg:flex-row lg:gap-4 lg:self-start">
        <div role="tablist" aria-label="Product views" className="order-2 mt-4 flex justify-center gap-2.5 lg:order-1 lg:mt-0 lg:flex-col lg:justify-start">
          {SHOTS.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={shot.id === s.id}
              aria-label={`${s.label} view`}
              onClick={() => setShot(s)}
              className={cn(
                "h-16 w-16 overflow-hidden rounded-2xl bg-soft p-1.5 transition-[opacity,transform] duration-300 ease-[var(--ease-premium)] hover:scale-[1.04] sm:h-[72px] sm:w-[72px]",
                shot.id === s.id ? "opacity-100 outline outline-[1.5px] outline-offset-2 outline-ink" : "opacity-55 hover:opacity-100",
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
          className="order-1 aspect-[4/5] w-full overflow-hidden rounded-tile bg-soft sm:aspect-square lg:order-2 lg:aspect-auto lg:h-[calc(100svh-7rem)] lg:max-h-[860px] lg:min-h-[520px] lg:flex-1"
          innerClassName="p-[7%]"
          garmentClassName="shadow-product"
          title={`${product.name} in ${color.name}, ${shot.label.toLowerCase()} view`}
        />
      </div>
      )}

      {/* Info */}
      <div className="lg:pt-10">
        {product.badge && <Eyebrow className="mb-3">{product.badge}</Eyebrow>}
        <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-mute">{categoryName(product.category)}</p>
        <h1 className="mt-2 text-[clamp(2.25rem,4.4vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.035em]">{product.name}</h1>
        <p className="mt-4 text-[20px] tabular-nums text-ink-2">
          {formatPrice(product.basePrice)} <span className="text-[14px] text-mute">· custom print from {formatPrice(unitPriceFor(product.basePrice, "small"))}</span>
        </p>
        <p className="mt-6 max-w-md text-[17px] leading-relaxed text-ink-2">{product.description}</p>

        <fieldset className="mt-10 border-t border-line-soft pt-8">
          <legend className="mb-2 text-[15px] font-semibold">
            Colour <span className="font-normal text-mute">— {color.name}</span>
          </legend>
          <div role="radiogroup" aria-label="Colour" className="-ml-1 flex flex-wrap">
            {product.colors.map((c) => (
              <Swatch key={c.id} hex={c.hex} label={c.name} selected={c.id === colorId} onSelect={() => pickColor(c.id)} />
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-7">
          <legend className="mb-2 text-[15px] font-semibold">Size</legend>
          <ChipGroup<Size>
            label="Size"
            value={size}
            onChange={setSize}
            columns="grid-cols-3 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6"
            options={product.sizes.map((s) => ({ id: s, label: s, disabled: !findVariant(product, colorId, s)?.available }))}
          />
        </fieldset>

        <div ref={ctaRef} className="mt-10 space-y-3">
          <ButtonLink
            href={`/customize/${product.slug}?color=${colorId}&size=${size}`}
            size="lg"
            className={cn("w-full", !inStock && "pointer-events-none opacity-40")}
          >
            Customize
          </ButtonLink>
          <Button variant="secondary" size="lg" className="w-full" onClick={addPlain} disabled={!inStock}>
            {added ? "Added to bag ✓" : "Add to bag without print"}
          </Button>
          <p className="sr-only" role="status">{added ? "Added to bag" : ""}</p>
          {/* Fixed-height row so the confirmation never shifts the layout */}
          <div className="flex h-6 items-center justify-center">
            <button
              className={cn("text-[14px] font-medium text-ink link-draw transition-opacity duration-300", added ? "opacity-100" : "pointer-events-none opacity-0")}
              tabIndex={added ? 0 : -1}
              aria-hidden={!added}
              onClick={() => router.push("/cart")}
            >
              View bag ›
            </button>
          </div>
          {!inStock && <p role="alert" className="text-center text-[14px] text-danger">This size isn’t available in {color.name}.</p>}
        </div>

        <div className="mt-10 border-t border-line-soft">
          {[
            { t: "Materials", c: product.details.material },
            { t: "Fit", c: product.details.fit },
            { t: "Delivery", c: product.details.delivery },
            { t: "Care", c: product.details.care },
          ].map((d) => (
            <details key={d.t} className="group border-b border-line-soft">
              <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                {d.t}
                <span aria-hidden className="text-xl font-light text-mute transition-transform duration-300 group-open:rotate-45">+</span>
              </summary>
              <p className="pb-5 pr-8 text-[15px] leading-relaxed text-ink-2">{d.c}</p>
            </details>
          ))}
        </div>
      </div>

      <MobileDock show={dock}>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{product.name}</p>
          <p className="text-[13px] text-mute">{color.name} · {size} · {formatPrice(product.basePrice)}</p>
        </div>
        <ButtonLink href={`/customize/${product.slug}?color=${colorId}&size=${size}`} className={cn("shrink-0", !inStock && "pointer-events-none opacity-40")}>
          Customize
        </ButtonLink>
      </MobileDock>
    </div>
  );
}
