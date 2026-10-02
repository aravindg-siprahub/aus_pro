import Image from "next/image";
import { Garment } from "@/components/product/Garment";
import { Container } from "@/components/ui/Layout";
import { Reveal } from "@/components/ui/Reveal";
import { RevealText } from "@/components/ui/RevealText";
import type { FontId, HomeMedia, HomeSlot, PrintLocation } from "@/types/commerce";
import { PrintOverlay, type PrintSpot } from "./PrintOverlay";

interface Item {
  loc: PrintLocation;
  label: string;
  text: string;
  fontId: FontId;
  view: "front" | "back";
  slot: HomeSlot;
  /** Where the print sits in the slot's photo, in a 4:5 frame (object-cover, centred). */
  spot: PrintSpot;
  /** The right sleeve reuses the side photo, mirrored. */
  mirror?: boolean;
}

const items: Item[] = [
  { loc: "front", label: "Front", text: "Atelier", fontId: "sans", view: "front", slot: "place-front", spot: { x: 0.5, y: 0.5, size: 7 } },
  { loc: "back", label: "Back", text: "Est. 2026", fontId: "serif", view: "back", slot: "place-back", spot: { x: 0.5, y: 0.34, size: 8 } },
  { loc: "left-sleeve", label: "Left sleeve", text: "N°9", fontId: "serif", view: "front", slot: "place-sleeve", spot: { x: 0.31, y: 0.6, size: 4.6, rotate: -8 } },
  { loc: "right-sleeve", label: "Right sleeve", text: "Yours", fontId: "script", view: "front", slot: "place-sleeve", spot: { x: 0.69, y: 0.6, size: 4.6, rotate: 8 }, mirror: true },
];

export function Placements({ media = {} }: { media?: HomeMedia }) {
  return (
    <section className="overflow-hidden py-24 sm:py-32 lg:py-40" aria-labelledby="placements-title">
      <Container size="wide">
        <RevealText
          id="placements-title"
          parts={["Anywhere you like.", { text: "Four places to make your mark.", className: "text-mute" }]}
          className="display-lg max-w-2xl"
        />
      </Container>
      <div className="no-scrollbar mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 sm:px-8 lg:mx-auto lg:grid lg:max-w-[1440px] lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-12">
        {items.map((it, i) => {
          const image = media[it.slot];
          return (
            <Reveal key={it.loc} delay={i * 0.07} className="w-[72vw] max-w-[340px] shrink-0 snap-center lg:w-auto lg:max-w-none">
              <figure className="group">
                {image ? (
                  <div className="relative aspect-[4/5] overflow-hidden rounded-tile bg-soft">
                    <div className="absolute inset-0 transition-transform duration-700 ease-[var(--ease-premium)] group-hover:scale-[1.04]">
                      <Image
                        src={image.url}
                        alt={`${image.alt}, with a ${it.label.toLowerCase()} print`}
                        fill
                        sizes="(min-width: 1024px) 25vw, 72vw"
                        className="object-cover"
                        style={it.mirror ? { transform: "scaleX(-1)" } : undefined}
                      />
                      <PrintOverlay text={it.text} fontId={it.fontId} color="#1b1a18" spot={it.spot} />
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[4/5] overflow-hidden rounded-tile bg-soft p-[10%]">
                    <Garment
                      type="round-neck"
                      color="#f2f0eb"
                      view={it.view}
                      customization={{ text: it.text, fontId: it.fontId, textColor: "#181716", printSize: it.view === "front" && it.loc !== "front" ? "large" : "medium", location: it.loc }}
                      className="h-full w-full transition-transform duration-700 ease-[var(--ease-premium)] group-hover:scale-[1.05]"
                      title={`Tee with a ${it.label.toLowerCase()} print`}
                    />
                  </div>
                )}
                <figcaption className="mt-4 flex items-baseline justify-between px-1">
                  <span className="text-[17px] font-semibold tracking-[-0.01em]">{it.label}</span>
                  <span className="text-[13px] tabular-nums text-mute">0{i + 1}</span>
                </figcaption>
              </figure>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
