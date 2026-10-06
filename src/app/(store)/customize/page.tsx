import type { Metadata } from "next";
import Link from "next/link";
import { getCommerce, getPublicShopConfig } from "@/lib/commerce/server";
import { sizeRange } from "@/lib/commerce/availability";
import { Container, Eyebrow } from "@/components/ui/Layout";
import { Garment } from "@/components/product/Garment";
import { NoPhoto, Photo } from "@/components/product/ProductPhoto";
import { EmptyState } from "@/components/ui/Feedback";
import { TextLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import type { Product } from "@/types/commerce";

export const metadata: Metadata = {
  title: "Customise",
  description: "Choose a piece, add your words, typeface, colour and placement, and we print it to order.",
};

const STEPS = [
  { n: "01", title: "Choose", text: "Pick the piece, the colour and your size." },
  { n: "02", title: "Design", text: "Add your words, then choose the typeface, ink colour and where it sits." },
  { n: "03", title: "Wear", text: "We print it to order and send it to you, made for no one else." },
] as const;

/**
 * The tile photo: the product's first front photo, else its first photo. (The same rule as leadImageUrl, which lives
 * in a client module and so can't be called while rendering on the server.)
 */
const coverOf = (p: Product) => p.images?.find((img) => img.view === "front") ?? p.images?.[0];

export default async function CustomizeLandingPage() {
  const [products, { currency }] = await Promise.all([getCommerce().listProducts(), getPublicShopConfig()]);
  // Prices are formatted here rather than with formatPrice, whose store currency is set for client rendering.
  const price = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n);

  return (
    <Container size="wide" className="pb-24 sm:pb-32 lg:pb-40">
      <header className="grid gap-y-8 pb-16 pt-12 sm:pb-24 sm:pt-20 lg:grid-cols-12 lg:items-end lg:gap-x-12 lg:pt-28">
        <div className="lg:col-span-7">
          <Eyebrow accent>Customise</Eyebrow>
          <h1 className="display-xl mt-6">
            Choose your <em>canvas</em>.
          </h1>
        </div>
        <p className="lead max-w-md lg:col-span-4 lg:col-start-9 lg:pb-2">
          Pick a piece, then make it yours: add your words, choose the typeface, the ink colour and where it sits. We print
          it to order, just for you.
        </p>
      </header>

      <section aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="sr-only">How it works</h2>
        <ol className="grid gap-y-10 sm:grid-cols-3 sm:gap-x-8 lg:gap-x-12">
          {STEPS.map((s) => (
            <li key={s.n} className="border-t border-line pt-6">
              <p className="eyebrow !text-accent tabular-nums" aria-hidden>{s.n}</p>
              <h3 className="mt-4 text-[15px] font-medium tracking-[0.01em]">
                <span className="sr-only">Step {Number(s.n)}: </span>
                {s.title}
              </h3>
              <p className="mt-2 max-w-xs text-[14px] leading-relaxed text-mute">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="pieces" className="mt-24 sm:mt-32 lg:mt-40">
        <div className="flex items-end justify-between gap-6">
          <h2 id="pieces" className="display-md">
            Start with a <em>piece</em>
          </h2>
          {products.length > 0 && (
            <p className="shrink-0 pb-1 text-[13px] tabular-nums text-mute">
              {products.length} {products.length === 1 ? "piece" : "pieces"}
            </p>
          )}
        </div>

        {products.length === 0 ? (
          <EmptyState
            title="New pieces are on their way."
            description="There’s nothing to customise just yet. Check back soon."
            actionHref="/"
            actionLabel="Back to home"
          />
        ) : (
          <ul className="mt-10 grid gap-y-14 sm:mt-14 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-16 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-20">
            {products.map((p, i) => {
              const cover = coverOf(p);
              const sizes = sizeRange(p.sizes);
              const colours = `${p.colors.length} ${p.colors.length === 1 ? "colour" : "colours"}`;
              return (
                <li key={p.id} className="min-w-0">
                  <Reveal delay={Math.min(i, 2) * 0.08}>
                    <Link href={`/customize/${p.slug}`} className="group block rounded-tile focus-visible:outline-offset-4">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-tile bg-soft">
                        <div className="absolute inset-0 transition-transform duration-[900ms] ease-[var(--ease-premium)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:!scale-100">
                          {!p.images ? (
                            /* Demo catalogue only: the garment drawing stands in for photography */
                            <div className="absolute inset-0 grid place-items-center p-[10%]">
                              <Garment type={p.category} color={p.colors[0]?.hex ?? "#cbc4b8"} className="h-full w-full shadow-product" title="" />
                            </div>
                          ) : cover ? (
                            <Photo
                              src={cover.url}
                              alt=""
                              sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
                              priority={i === 0}
                            />
                          ) : (
                            <NoPhoto name={p.name} />
                          )}
                        </div>
                      </div>
                      <div className="mt-5 flex items-baseline justify-between gap-4">
                        <h3 className="min-w-0 text-[15px] font-medium tracking-[-0.005em]">{p.name}</h3>
                        <p className="shrink-0 text-[14px] tabular-nums text-ink-2">
                          <span className="text-mute">From </span>
                          {price(p.basePrice)}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                        <p className="text-[13px] text-mute">
                          {colours}
                          {sizes && <> · {sizes}</>}
                        </p>
                        <span className="inline-flex items-center gap-2 text-[13px] font-medium text-ink">
                          <span className="link-draw">Design this</span>
                          <span aria-hidden className="transition-transform duration-300 ease-[var(--ease-premium)] group-hover:translate-x-1 motion-reduce:transition-none">
                            →
                          </span>
                        </span>
                      </div>
                    </Link>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {products.length > 0 && (
        <div className="mt-24 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-line-soft pt-8 sm:mt-32">
          <p className="text-[14px] text-mute">Prefer to look around first?</p>
          <TextLink href="/shop">See the full collection</TextLink>
        </div>
      )}
    </Container>
  );
}
