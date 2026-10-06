import { getCommerce } from "@/lib/commerce/server";
import { colorName, fontById, locationLabel, sizeLabel } from "@/features/customizer/config";
import type { FontId, PrintLocation, PrintSize } from "@/types/commerce";
import type { AuthenticPiece } from "./types";

type Env = Record<string, string | undefined>;

/**
 * Sample serials, so visitors can see what a verified piece looks like before they own one.
 * They contain letters where a real serial has the order number, so they can never collide with a stamped
 * serial, and every answer is labelled as a sample. They are described with real catalogue products.
 * Turn them off with AUTHENTICITY_SAMPLES=off once real serials are in circulation.
 */
interface Sample {
  serial: string;
  /** Which catalogue product (by position) the sample shows. */
  productIndex: number;
  size: string;
  quantity: number;
  issuedAt: string;
  print: { text: string; font: FontId; placement: PrintLocation; size: PrintSize; ink: string } | null;
}

const SAMPLES: Sample[] = [
  { serial: "WH-SAMPLE-1", productIndex: 0, size: "M", quantity: 1, issuedAt: "2026-03-14", print: { text: "Since day one", font: "serif", placement: "front", size: "medium", ink: "#111111" } },
  { serial: "WH-SAMPLE-2", productIndex: 1, size: "L", quantity: 1, issuedAt: "2026-05-02", print: { text: "No. 09", font: "mono", placement: "back", size: "large", ink: "#d9a21b" } },
  { serial: "WH-SAMPLE-3", productIndex: 2, size: "S", quantity: 2, issuedAt: "2026-08-21", print: null },
];

export function samplesEnabled(env: Env = process.env): boolean {
  return env.AUTHENTICITY_SAMPLES?.trim().toLowerCase() !== "off";
}

/** The sample serials to suggest on /authenticity (empty when switched off). */
export function sampleSerials(env: Env = process.env): string[] {
  return samplesEnabled(env) ? SAMPLES.map((s) => s.serial) : [];
}

const normalise = (input: string) => input.normalize("NFKC").replace(/[‐-―−]/g, "-").replace(/\s+/g, "").toUpperCase();

/** The sample piece for this serial, or null when it isn't a sample (or samples are off). */
export async function lookupSample(input: string, env: Env = process.env): Promise<{ serial: string; piece: AuthenticPiece } | null> {
  if (!samplesEnabled(env) || typeof input !== "string" || input.length > 40) return null;
  const sample = SAMPLES.find((s) => s.serial === normalise(input));
  if (!sample) return null;

  const products = await getCommerce().listProducts();
  const product = products.length ? products[sample.productIndex % products.length] : null;
  const colour = product?.colors[0];
  // The colour's own front photo, else the first front photo (the card logic, kept server-side here).
  const images = product?.images ?? [];
  const imageUrl =
    images.find((img) => img.url === colour?.imageUrl)?.url ??
    images.find((img) => img.view === "front" && img.colorId === colour?.id)?.url ??
    images.find((img) => img.view === "front")?.url;
  const p = sample.print;
  return {
    serial: sample.serial,
    piece: {
      product: product?.name ?? "WAHAU piece",
      productHandle: product?.slug ?? null,
      colour: colour?.name ?? null,
      size: sample.size,
      quantity: sample.quantity,
      issuedAt: sample.issuedAt,
      image: imageUrl && product ? { url: imageUrl, alt: `${product.name} in ${colour?.name ?? ""}`.trim() } : null,
      print: p
        ? { text: p.text, typeface: fontById(p.font).label, placement: locationLabel(p.placement), size: sizeLabel(p.size), ink: `${colorName(p.ink)} (${p.ink})` }
        : null,
      demo: true,
    },
  };
}
