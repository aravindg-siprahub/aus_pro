import type { Metadata } from "next";
import { Container } from "@/components/ui/Layout";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import Image from "next/image";
import { Garment } from "@/components/product/Garment";
import { PrintOverlay } from "@/components/home/PrintOverlay";
import { getHomeMedia } from "@/lib/commerce/server";

export const metadata: Metadata = { title: "About" };

const process = [
  { n: "01", title: "You design", body: "Choose a piece, add your words, place them where you like." },
  { n: "02", title: "We print", body: "Premium inks cured into the fabric, one piece at a time." },
  { n: "03", title: "We check", body: "Every garment is inspected by hand before it’s folded." },
  { n: "04", title: "It ships", body: "Packed in recycled paper and on its way within days." },
];

const info = [
  { id: "delivery", title: "Delivery", body: "Every piece is made to order. Production takes 4–6 working days, followed by 2–4 days in transit. Shipping costs are shown at checkout before you pay." },
  { id: "care", title: "Care guide", body: "Wash cold, inside out. Tumble dry low and avoid ironing directly over the print for the longest-lasting result." },
  { id: "returns", title: "Returns", body: "Because each piece is made for you, custom items can’t be returned unless they arrive faulty. If something isn’t right, we’ll make it right." },
];

export default async function AboutPage() {
  // Real photos from Shopify Files (the same ones the home page uses); the mock catalogue keeps its drawings.
  const media = await getHomeMedia();
  const story = media["place-front"];
  const made = media.made;

  return (
    <>
      <section id="story" className="scroll-mt-24 pb-20 pt-16 sm:pb-28 sm:pt-24">
        <Container size="wide" className="grid items-center gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-6">
            <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-accent">Our story</p>
            <h1 className="display-xl mt-5 max-w-[11ch]">Clothing that speaks for you.</h1>
            <p className="lead mt-7 max-w-md">
              Atelier Nine began with a simple belief: what you wear should say something only you can say. We make
              well-cut essentials and give you the tools to make them personal.
            </p>
          </Reveal>
          <Reveal delay={0.1} y={40} className="lg:col-span-6">
            {story ? (
              <div className="relative aspect-[4/5] max-h-[78svh] w-full overflow-hidden rounded-tile bg-soft shadow-product lg:aspect-square">
                <Image src={story.url} alt={`${story.alt}, printed with “Since day one”`} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
                {/* The worn tee is centred in the photo, so the chest sits at the frame's centre */}
                <PrintOverlay text="Since day one" fontId="serif" color="#1b1a18" spot={{ x: 0.5, y: 0.5, size: 6.5 }} />
              </div>
            ) : (
              <div className="relative aspect-square overflow-hidden rounded-tile bg-soft p-[10%]">
                <Garment
                  type="oversized"
                  color="#cbc4b8"
                  className="h-full w-full shadow-product"
                  customization={{ text: "Since day one", fontId: "serif", textColor: "#181716", printSize: "large", location: "front" }}
                />
              </div>
            )}
          </Reveal>
        </Container>
      </section>

      <section className="bg-night py-24 text-white sm:py-32" aria-labelledby="process-title">
        <Container size="wide">
          <div className="grid items-end gap-10 lg:grid-cols-12">
            <Reveal className="lg:col-span-5">
              <h2 id="process-title" className="display-lg max-w-3xl">
                Made once. <span className="text-white/45">Made for you.</span>
              </h2>
              <p className="mt-5 max-w-sm text-[16px] leading-relaxed text-white/55">Every print is pulled by hand, cured into the cotton and checked before it leaves us.</p>
            </Reveal>
            {made && (
              <Reveal delay={0.1} y={40} className="lg:col-span-7">
                <div className="relative aspect-[3/2] overflow-hidden rounded-tile bg-white/5">
                  <Image src={made.url} alt={made.alt} fill sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" />
                </div>
              </Reveal>
            )}
          </div>
          <ol className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {process.map((p, i) => (
              <li key={p.n}>
                <Reveal delay={i * 0.07} className="border-t border-white/15 pt-6">
                  <p className="text-[13px] tabular-nums text-white/40">{p.n}</p>
                  <h3 className="mt-6 text-[22px] font-semibold tracking-[-0.025em]">{p.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/55">{p.body}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="py-24 sm:py-32">
        <Container size="wide">
          <div className="grid gap-x-12 gap-y-14 md:grid-cols-3">
            {info.map((b, i) => (
              <Reveal key={b.id} delay={i * 0.07}>
                <section id={b.id} className="scroll-mt-24">
                  <h2 className="text-[26px] font-semibold tracking-[-0.03em]">{b.title}</h2>
                  <p className="mt-3 text-[16px] leading-relaxed text-ink-2">{b.body}</p>
                </section>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-20 text-center sm:mt-28">
            <ButtonLink href="/shop" size="lg">Shop the collection</ButtonLink>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
