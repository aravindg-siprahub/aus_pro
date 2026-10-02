import Link from "next/link";
import Image from "next/image";
import { getCommerce, getHomeMedia, getProviderMode } from "@/lib/commerce/server";
import { NoPhoto, Photo } from "@/components/product/ProductPhoto";
import { Hero } from "@/components/home/Hero";
import { Story } from "@/components/home/Story";
import { Placements } from "@/components/home/Placements";
import { ProductCard } from "@/components/product/ProductCard";
import { Garment } from "@/components/product/Garment";
import { Container } from "@/components/ui/Layout";
import { Reveal } from "@/components/ui/Reveal";
import { RevealText } from "@/components/ui/RevealText";
import { ButtonLink, TextLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const tileColor = { "round-neck": "#f2f0eb", polo: "#243050", oversized: "#9aa592", hoodie: "#b9775a" } as const;

const values = [
  { n: "01", title: "Made to order", body: "Nothing is produced until you design it. Less waste, more intention." },
  { n: "02", title: "Honest materials", body: "Long-staple cotton and heavyweight fleece, chosen for how they feel after a hundred washes." },
  { n: "03", title: "Print that lasts", body: "Premium inks cured into the fabric, so your design stays sharp." },
];

export default async function HomePage() {
  const [products, allCategories, media] = await Promise.all([getCommerce().listProducts(), getCommerce().listCategories(), getHomeMedia()]);
  const live = getProviderMode() === "shopify";
  // With a real store, only link to categories that have products, shown with a real product photo.
  const categories = live ? allCategories.filter((c) => products.some((p) => p.category === c.id)) : allCategories;
  const coverFor = (id: string) => products.find((p) => p.category === id && p.images?.length)?.images?.[0];
  // Spread picks across the catalogue when it's large; with a small (or empty) catalogue just show what exists.
  const featured = products.length >= 7 ? [0, 2, 4, 6].map((i) => products[i]) : products.slice(0, 4);
  // "Start designing" opens the customizer for a real product; with an empty store it goes to the shop.
  const startHref = products[0] ? `/customize/${products[0].slug}` : "/shop";
  const countWord = ["", "One way", "Two ways", "Three ways", "Four ways"][categories.length] ?? `${categories.length} ways`;

  return (
    <>
      <Hero
        image={media.hero}
        product={products[0] && {
          name: products[0].name,
          price: products[0].basePrice,
          href: `/product/${products[0].slug}`,
          customizeHref: `/customize/${products[0].slug}`,
        }}
      />
      <Story media={media} startHref={startHref} />
      <Placements media={media} />

      {featured.length > 0 && (
      <section className="bg-soft py-24 sm:py-32" aria-labelledby="featured-title">
        <Container size="wide">
          <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-6 sm:mb-16">
            <RevealText id="featured-title" parts={["The favourites."]} className="display-lg max-w-[12ch]" />
            <TextLink href="/shop">Shop all</TextLink>
          </Reveal>
          <div className={cn("grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-5 lg:gap-x-6", featured.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
            {featured.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.06}>
                <ProductCard product={p} surface="canvas" />
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
      )}

      {categories.length > 0 && (
      <section className="py-24 sm:py-32 lg:py-40" aria-labelledby="cat-title">
        <Container size="wide">
          <RevealText id="cat-title" parts={[countWord, { text: "to wear it.", className: "text-mute" }]} className="display-lg mb-12 sm:mb-16" />
          <div className={cn("grid gap-3 sm:gap-5", categories.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
            {categories.map((c, i) => (
              <Reveal key={c.id} delay={(i % 2) * 0.08}>
                <Link
                  href={`/shop?category=${c.id}`}
                  className="group relative block aspect-[4/5] overflow-hidden rounded-tile bg-soft sm:aspect-[5/6]"
                >
                  {live ? (
                    <div className="absolute inset-0 transition-transform duration-[900ms] ease-[var(--ease-premium)] group-hover:scale-[1.04]">
                      {(() => {
                        const cover = coverFor(c.id);
                        return cover ? <Photo src={cover.url} alt={cover.alt} sizes="(min-width: 640px) 50vw, 100vw" /> : <NoPhoto name={c.name} />;
                      })()}
                      {/* Keeps the caption legible over any photo */}
                      <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-white/90 to-transparent" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 grid place-items-center p-[14%] pb-[22%] transition-transform duration-[900ms] ease-[var(--ease-premium)] group-hover:scale-[1.05]">
                      <Garment type={c.id} color={tileColor[c.id]} className="h-full w-full shadow-product" title="" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 sm:p-8">
                    <div>
                      <h3 className="text-[26px] font-semibold tracking-[-0.03em] sm:text-[32px]">{c.name}</h3>
                      <p className="mt-0.5 text-[15px] text-mute">{c.tagline}</p>
                    </div>
                    <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-white transition-transform duration-500 ease-[var(--ease-premium)] group-hover:translate-x-1">→</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
      )}

      {media.band && (
        <section aria-labelledby="band-title" className="px-3 pb-3 sm:px-5 sm:pb-5">
          <div className="relative h-[78svh] min-h-[480px] overflow-hidden rounded-tile">
            <Image src={media.band.url} alt={media.band.alt} fill sizes="100vw" className="object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <Container size="wide" className="absolute inset-x-0 bottom-0 pb-10 text-white sm:pb-16">
              <Reveal>
                <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-white/70">Made to order</p>
                <h2 id="band-title" className="display-lg mt-3 max-w-[14ch]">Nothing waits on a shelf.</h2>
                <p className="mt-4 max-w-md text-[17px] leading-relaxed text-white/75">Every piece is cut, printed and checked for one person: you.</p>
              </Reveal>
            </Container>
          </div>
        </section>
      )}

      <section className="bg-night py-24 text-white sm:py-32 lg:py-40" aria-labelledby="values-title">
        <Container size="wide">
          <RevealText id="values-title" parts={["Fewer things.", { text: "Made better, made yours.", className: "text-white/45" }]} className="display-lg max-w-4xl" />
          <div className="mt-16 grid gap-12 sm:mt-24 md:grid-cols-3 md:gap-10">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.08}>
                <div className="border-t border-white/15 pt-6">
                  <p className="text-[13px] tabular-nums text-white/40">{v.n}</p>
                  <h3 className="mt-6 text-[24px] font-semibold tracking-[-0.025em]">{v.title}</h3>
                  <p className="mt-3 max-w-xs text-[16px] leading-relaxed text-white/55">{v.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section aria-labelledby="cta-title" className="py-28 text-center sm:py-40">
        <Container size="narrow">
          <Reveal>
            <RevealText id="cta-title" parts={["Make it yours."]} className="display-xl" />
            <p className="lead mx-auto mt-5 max-w-md">Choose a piece, add your words. It takes about a minute.</p>
            <ButtonLink href={startHref} size="lg" className="mt-9">Start designing</ButtonLink>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
