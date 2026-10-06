import type { Metadata } from "next";
import Link from "next/link";
import { sampleSerials } from "@/lib/authenticity/samples";
import { Container, Eyebrow } from "@/components/ui/Layout";
import { Reveal } from "@/components/ui/Reveal";
import { VerifyForm } from "@/features/authenticity/VerifyForm";
import { demoSerial } from "@/lib/authenticity/service";
import { errorSummary, log } from "@/lib/shopify/logger";

export const metadata: Metadata = {
  title: "Authenticity",
  description: "Every WAHAU piece is made to order and logged. Verify the serial number stamped on yours.",
};

const POINTS = [
  {
    n: "01",
    title: "Where to find it",
    body: "On the woven label inside the hem: WH, your order number, the piece’s line, then six check characters.",
  },
  {
    n: "02",
    title: "What it confirms",
    body: "That we made the piece, for which order line, in which colour and size, with which print, and when.",
  },
  {
    n: "03",
    title: "Something not right?",
    body: "If a serial doesn’t verify, write to us with your order number. We read every message and will put it right.",
  },
];

/** Keeps only characters a serial can contain, so a shared link can't inject anything odd into the form. */
function cleanSerialParam(raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v) return "";
  return v.replace(/[^A-Za-z0-9\- ]/g, "").trim().slice(0, 40).toUpperCase();
}

function demoHint(): string | null {
  try {
    return demoSerial();
  } catch (e) {
    // A misconfigured provider is reported by the catalogue; the page itself still renders.
    log("warn", "authenticity.demo_hint_unavailable", errorSummary(e));
    return null;
  }
}

export default async function AuthenticityPage({ searchParams }: { searchParams: Promise<{ serial?: string | string[] }> }) {
  const demo = demoHint();
  const samples = sampleSerials();
  // With no serial in the link, open on a verified sample so the page shows what a result looks like.
  const initial = cleanSerialParam((await searchParams).serial) || samples[0] || "";

  return (
    <>
      <section className="pb-20 pt-14 sm:pb-28 sm:pt-24 lg:pb-36 lg:pt-32" aria-labelledby="authenticity-title">
        <Container size="wide" className="grid gap-14 lg:grid-cols-12 lg:gap-12">
          <Reveal className="min-w-0 lg:col-span-5">
            <Eyebrow accent>Authenticity</Eyebrow>
            <h1 id="authenticity-title" className="display-lg mt-6 max-w-[14ch]">
              Every piece, <em>accounted for</em>.
            </h1>
            <p className="lead mt-8 max-w-[42ch]">
              Each piece is made to order and logged the day it is printed. A serial number is stamped on the label
              inside the hem: enter it here to confirm it is ours, and see exactly what was made.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="min-w-0 lg:col-span-6 lg:col-start-7 lg:pt-3">
            {/* A framed panel from tablets up; on phones the form uses the full width */}
            <div className="sm:border sm:border-line-soft sm:px-10 sm:py-11">
              <h2 className="display-sm">Verify authenticity</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-2">Enter the serial number stamped on your piece.</p>
              {/* Keyed by the serial so choosing another sample starts a fresh check */}
              <VerifyForm key={initial} className="mt-8" initialSerial={initial} autoVerify={!!initial} />
              {samples.length > 0 && (
                <div className="mt-8 border-t border-line-soft pt-5">
                  <p className="text-[13px] text-mute">No piece yet? Try a sample serial:</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {samples.map((s) => (
                      <li key={s}>
                        <Link
                          href={`/authenticity?serial=${s}`}
                          scroll={false}
                          aria-current={initial.toUpperCase() === s ? "true" : undefined}
                          className="inline-flex h-9 items-center rounded-ui px-3 font-mono text-[12px] tracking-[0.08em] text-ink-2 ring-1 ring-inset ring-line transition-colors duration-300 hover:text-ink hover:ring-ink aria-[current=true]:text-ink aria-[current=true]:ring-ink"
                        >
                          {s}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {demo && (
                <p className="mt-8 border-t border-line-soft pt-5 text-[13px] leading-relaxed text-mute">
                  Demo store: try <span className="break-all font-mono tracking-[0.08em] text-ink-2">{demo}</span>
                </p>
              )}
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="pb-24 sm:pb-32 lg:pb-40" aria-labelledby="authenticity-points">
        <Container size="wide">
          <h2 id="authenticity-points" className="sr-only">
            About serial numbers
          </h2>
          <Reveal>
            <ol className="grid gap-12 sm:grid-cols-3 sm:gap-10 lg:gap-16">
              {POINTS.map((p) => (
                <li key={p.n} className="min-w-0 border-t border-line-soft pt-6">
                  <p className="font-mono text-[12px] tracking-[0.08em] text-accent" aria-hidden>
                    {p.n}
                  </p>
                  <h3 className="mt-5 text-[15px] font-medium text-ink">{p.title}</h3>
                  <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-ink-2">{p.body}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
