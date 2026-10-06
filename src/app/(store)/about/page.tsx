import type { Metadata } from "next";
import Image from "next/image";
import { Container, Eyebrow } from "@/components/ui/Layout";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Garment } from "@/components/product/Garment";
import { PrintOverlay } from "@/components/home/PrintOverlay";
import { getCommerce, getHomeMedia } from "@/lib/commerce/server";

export const metadata: Metadata = { title: "About" };

const process = [
  { n: "01", title: "You design", body: "Choose a piece, add your words, place them where you like." },
  { n: "02", title: "We print", body: "Premium inks cured into the fabric, one piece at a time." },
  { n: "03", title: "We check", body: "Every garment is inspected by hand before it’s folded." },
  { n: "04", title: "It ships", body: "Packed in recycled paper and on its way within days." },
];

// The footer links to /about#delivery, #care and #returns, so these ids are part of the site's contract.
const info = [
  { id: "delivery", title: "Delivery", body: "Every piece is made to order. Production takes 4–6 working days, followed by 2–4 days in transit. Shipping costs are shown at checkout before you pay." },
  { id: "care", title: "Care guide", body: "Wash cold, inside out. Tumble dry low and avoid ironing directly over the print for the longest-lasting result." },
  { id: "returns", title: "Returns", body: "Because each piece is made for you, custom items can’t be returned unless they arrive faulty. If something isn’t right, we’ll make it right." },
];

const principles = ["Made to order", "Printed by hand", "Checked by eye"];

/** Anchored sections clear the sticky header (its height changes per breakpoint) with a little air. */
const anchorOffset = "scroll-mt-[calc(var(--header-h)+2rem)]";

export default async function AboutPage() {
  // Real photos from Shopify Files (the same ones the home page uses); the mock catalogue keeps its drawings.
  const [media, products] = await Promise.all([getHomeMedia(), getCommerce().listProducts()]);
  const story = media["place-front"];
  const made = media.made;
  // "Create your piece" opens the customizer for a real product, as on the home page; an empty store goes to the shop.
  const createHref = products[0] ? `/customize/${products[0].slug}` : "/shop";

  return (
    <>
      {/* Opening spread: the statement beside a worn piece */}
      <section id="story" aria-labelledby="story-title" className={`${anchorOffset} pb-24 pt-14 sm:pb-32 sm:pt-20 lg:pb-40 lg:pt-24`}>
        <Container size="wide" className="grid gap-14 lg:grid-cols-12 lg:items-end lg:gap-12">
          <Reveal className="lg:col-span-6 lg:pb-4 xl:col-span-5">
            <Eyebrow accent>Our story</Eyebrow>
            <h1 id="story-title" className="display-xl mt-6 max-w-[11ch]">
              Clothing that <em>speaks</em> for you.
            </h1>
            <p className="lead mt-8 max-w-md">
              WAHAU began with a simple belief: what you wear should say something only you can say. We make
              well-cut essentials and give you the tools to make them personal.
            </p>
            <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-line-soft pt-6">
              {principles.map((p) => (
                <li key={p} className="eyebrow">{p}</li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1} y={32} className="lg:col-span-6 xl:col-span-6 xl:col-start-7">
            <figure>
              {story ? (
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-tile bg-soft lg:max-h-[82svh]">
                  <Image
                    src={story.url}
                    alt={`${story.alt}, printed with “Since day one”`}
                    fill
                    priority
                    sizes="(min-width: 1440px) 660px, (min-width: 1024px) 48vw, 100vw"
                    className="object-cover"
                  />
                  {/* The worn tee is centred in the photo, so the chest sits at the frame's centre */}
                  <PrintOverlay text="Since day one" fontId="serif" color="#1b1a18" spot={{ x: 0.5, y: 0.5, size: 6.5 }} />
                </div>
              ) : (
                <div className="relative aspect-[4/5] overflow-hidden rounded-tile bg-soft p-[10%]">
                  <Garment
                    type="oversized"
                    color="#cbc4b8"
                    className="h-full w-full shadow-product"
                    customization={{ text: "Since day one", fontId: "serif", textColor: "#181716", printSize: "large", location: "front" }}
                  />
                </div>
              )}
              <figcaption className="mt-4 flex items-baseline justify-between gap-6 text-[13px] text-mute">
                <span>“Since day one” — set in serif, front placement.</span>
                <span className="eyebrow shrink-0">Fig. 01</span>
              </figcaption>
            </figure>
          </Reveal>
        </Container>
      </section>

      {/* Process: the photograph of the work beside four hairline-topped steps */}
      <section aria-labelledby="process-title" className="border-t border-line-soft py-24 sm:py-32 lg:py-40">
        <Container size="wide" className="grid gap-14 lg:grid-cols-12 lg:gap-12">
          {made && (
            <Reveal y={32} className="lg:col-span-6">
              <figure className="lg:sticky lg:top-[calc(var(--sticky-top)+2rem)]">
                <div className="relative aspect-[4/5] overflow-hidden rounded-tile bg-soft sm:aspect-[3/2] lg:aspect-[4/5]">
                  <Image src={made.url} alt={made.alt} fill sizes="(min-width: 1440px) 660px, (min-width: 1024px) 48vw, 100vw" className="object-cover" />
                </div>
                <figcaption className="mt-4 flex items-baseline justify-between gap-6 text-[13px] text-mute">
                  <span>Every print is pulled by hand.</span>
                  <span className="eyebrow shrink-0">Fig. 02</span>
                </figcaption>
              </figure>
            </Reveal>
          )}

          <div className={made ? "lg:col-span-5 lg:col-start-8" : "lg:col-span-12"}>
            <Reveal>
              <Eyebrow accent>The process</Eyebrow>
              <h2 id="process-title" className="display-lg mt-6 max-w-[12ch]">
                Made once. <em className="text-ink-2">Made for you.</em>
              </h2>
              <p className="lead mt-6 max-w-sm">Every print is pulled by hand, cured into the cotton and checked before it leaves us.</p>
            </Reveal>

            <ol className={`mt-16 grid gap-x-10 sm:grid-cols-2 sm:gap-y-12 lg:mt-20 ${made ? "lg:grid-cols-1 lg:gap-y-0" : "lg:grid-cols-4"}`}>
              {process.map((p, i) => (
                <li key={p.n}>
                  <Reveal
                    delay={i * 0.06}
                    className={`grid grid-cols-[3.5rem_1fr] gap-x-4 border-t border-line py-7 sm:block sm:py-0 sm:pt-6 ${made ? "lg:grid lg:py-8" : ""}`}
                  >
                    <p className="pt-1.5 font-mono text-[12px] tracking-[0.08em] text-accent tabular-nums">{p.n}</p>
                    <div className={`sm:mt-5 ${made ? "lg:mt-0" : ""}`}>
                      <h3 className="display-sm">{p.title}</h3>
                      <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-ink-2">{p.body}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* The practical details: delivery, care, returns */}
      <section aria-labelledby="details-title" className="border-t border-line-soft py-24 sm:py-32 lg:py-40">
        <Container size="wide" className="grid gap-12 lg:grid-cols-12 lg:gap-12">
          <Reveal className="lg:col-span-4">
            <Eyebrow accent>Good to know</Eyebrow>
            <h2 id="details-title" className="display-md mt-6 max-w-[10ch]">
              The <em>details</em>.
            </h2>
          </Reveal>
          <div className="lg:col-span-7 lg:col-start-6">
            {info.map((b, i) => (
              <Reveal key={b.id} delay={i * 0.06}>
                <section
                  id={b.id}
                  aria-labelledby={`${b.id}-title`}
                  className={`${anchorOffset} grid gap-3 border-t border-line py-8 sm:grid-cols-[11rem_1fr] sm:gap-10 sm:py-10 ${i === info.length - 1 ? "border-b" : ""}`}
                >
                  <h3 id={`${b.id}-title`} className="display-sm">{b.title}</h3>
                  <p className="max-w-[58ch] text-[16px] leading-relaxed text-ink-2">{b.body}</p>
                </section>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Closing invitation */}
      <section aria-labelledby="closing-title" className="border-t border-line-soft py-24 sm:py-32 lg:py-40">
        <Container size="narrow">
          <Reveal className="flex flex-col items-center text-center">
            <Eyebrow accent>Begin</Eyebrow>
            <h2 id="closing-title" className="display-lg mt-6 max-w-[14ch]">
              Something only <em>you</em> could say.
            </h2>
            <p className="lead mt-6 max-w-md">Start from the collection, or begin with a blank piece and make it yours.</p>
            <div className="mt-11 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <ButtonLink href="/shop" size="lg">Explore the collection</ButtonLink>
              <ButtonLink href={createHref} size="lg" variant="secondary">Create your piece</ButtonLink>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
