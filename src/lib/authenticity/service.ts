import { resolveProviderMode } from "@/lib/shopify/config";
import { shopifyGraphQL } from "@/lib/shopify/client";
import { isShopifyCdn } from "@/lib/shopify/mappers";
import { products as mockProducts } from "@/lib/commerce/mock-data";
import { colorName, fontById, locationLabel, sizeLabel } from "@/features/customizer/config";
import { authenticityKey } from "./key";
import { checkMatches, issueSerial, parseSerial } from "./serial";
import { lookupSample } from "./samples";
import type { AuthenticPiece, AuthenticPrint, VerifyOutcome } from "./types";

/**
 * Verifies a serial number end to end (server-only).
 *
 * 1. Parse and check the HMAC. A malformed or forged serial is "invalid" and never reaches Shopify.
 * 2. Look up the order line it names. Shopify mode asks the Admin API; demo mode has one sample piece.
 *
 * Only the piece is described: the order query doesn't even request customer, address or money fields.
 */

/* ── Shopify lookup ── */

/**
 * Needs only the read_orders scope. Note: without Shopify's read_all_orders scope the Admin API only returns
 * orders from the last 60 days, so serials from older orders report "not_found" until that scope is granted.
 */
const AUTHENTICITY_ORDER = /* GraphQL */ `
  query AuthenticityOrder($query: String!) {
    orders(first: 5, query: $query) {
      nodes {
        name createdAt cancelledAt
        lineItems(first: 50) {
          nodes {
            title variantTitle quantity
            product { handle }
            image { url altText }
            customAttributes { key value }
          }
        }
      }
    }
  }
`;

interface RawLine {
  title: string;
  variantTitle: string | null;
  quantity: number;
  product: { handle: string } | null;
  image: { url: string; altText: string | null } | null;
  customAttributes: { key: string; value: string | null }[];
}
interface RawOrder {
  name: string;
  createdAt: string;
  cancelledAt: string | null;
  lineItems: { nodes: RawLine[] };
}

const SIZE_TOKEN = /^(XXS|XS|S|M|L|XL|XXL|XXXL|[2-5]XL|ONE SIZE|OS)$/i;
const clip = (v: string | null | undefined, n = 120) => {
  const t = v?.trim();
  return t ? t.slice(0, n) : null;
};

/** "Black / M" → colour Black, size M. Either part may be missing; "Default Title" means neither. */
export function splitVariantTitle(title: string | null | undefined): { colour: string | null; size: string | null } {
  const t = title?.trim();
  if (!t || /^default title$/i.test(t)) return { colour: null, size: null };
  const parts = t.split("/").map((p) => p.trim()).filter(Boolean);
  const size = parts.find((p) => SIZE_TOKEN.test(p)) ?? null;
  const colour = parts.find((p) => p !== size) ?? null;
  return { colour: clip(colour, 60), size: clip(size, 20) };
}

/** The customer-facing print properties written at checkout (see customizationAttributes). Hidden `_` keys are ignored. */
export function printFromAttributes(attrs: { key: string; value: string | null }[]): AuthenticPrint | null {
  const get = (k: string) => clip(attrs.find((a) => a.key === k)?.value);
  const text = get("Custom text");
  if (!text) return null;
  return { text, typeface: get("Font"), placement: get("Placement"), size: get("Print size"), ink: get("Text colour") };
}

const isoDate = (s: string) => (/^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "");

function pieceFromLine(line: RawLine, createdAt: string): AuthenticPiece {
  const { colour, size } = splitVariantTitle(line.variantTitle);
  const img = line.image && isShopifyCdn(line.image.url) ? { url: line.image.url, alt: clip(line.image.altText, 200) ?? line.title } : null;
  return {
    product: clip(line.title, 120) ?? "WAHAU piece",
    productHandle: line.product?.handle && /^[a-z0-9][a-z0-9-]*$/i.test(line.product.handle) ? line.product.handle : null,
    colour,
    size,
    quantity: Math.max(1, Math.floor(line.quantity) || 1),
    issuedAt: isoDate(createdAt),
    image: img,
    print: printFromAttributes(line.customAttributes ?? []),
  };
}

async function lookupShopify(orderDigits: string, lineNo: number, serial: string): Promise<VerifyOutcome> {
  const data = await shopifyGraphQL<{ orders: { nodes: RawOrder[] } }>(
    AUTHENTICITY_ORDER,
    { query: `name:#${orderDigits} OR name:${orderDigits}` },
    { operation: "AuthenticityOrder", idempotent: true },
  );
  // The search is fuzzy; only an exact match on the order number counts.
  const order = data.orders.nodes.find((o) => o.name.replace(/\D/g, "") === orderDigits);
  if (!order) return { status: "not_found" };
  if (order.cancelledAt) return { status: "void" };
  const line = order.lineItems.nodes[lineNo - 1];
  if (!line) return { status: "not_found" };
  return { status: "authentic", serial, piece: pieceFromLine(line, order.createdAt) };
}

/* ── Demo registry (mock catalogue only) ── */

const DEMO_ORDER = "1001";
const DEMO_LINE = 1;

function demoPiece(): AuthenticPiece {
  const product = mockProducts.find((p) => p.slug === "essential-crew-tee") ?? mockProducts[0];
  const colour = product.colors.find((c) => c.id === "black") ?? product.colors[0];
  const ink = "#ffffff";
  return {
    product: product.name,
    productHandle: product.slug,
    colour: colour.name,
    size: "M",
    quantity: 1,
    issuedAt: "2026-03-14",
    image: null,
    print: {
      text: "Since day one",
      typeface: fontById("serif").label,
      placement: locationLabel("front"),
      size: sizeLabel("medium"),
      ink: `${colorName(ink)} (${ink})`,
    },
    demo: true,
  };
}

/** The sample serial for the demo catalogue, shown as a hint on /authenticity. Null outside demo mode. */
export function demoSerial(): string | null {
  return resolveProviderMode() === "mock" ? issueSerial(DEMO_ORDER, DEMO_LINE, authenticityKey()) : null;
}

/* ── Entry point ── */

/**
 * Throws ConfigError when Shopify mode has no signing key, and ShopifyError when the store can't be reached;
 * every other answer is a VerifyOutcome.
 */
export async function verifySerial(input: string): Promise<VerifyOutcome> {
  // Sample serials answer even before the signing key is configured; they are always labelled as samples.
  const sample = await lookupSample(input);
  if (sample) return { status: "authentic", serial: sample.serial, piece: sample.piece };

  // Something that isn't shaped like a serial is simply invalid, even when the signing key isn't configured.
  const parsed = parseSerial(input);
  if (!parsed) return { status: "invalid" };
  const key = authenticityKey();
  if (!checkMatches(parsed, key)) return { status: "invalid" };

  if (resolveProviderMode() === "mock") {
    return parsed.orderDigits === DEMO_ORDER && parsed.lineNo === DEMO_LINE
      ? { status: "authentic", serial: parsed.canonical, piece: demoPiece() }
      : { status: "not_found" };
  }
  return lookupShopify(parsed.orderDigits, parsed.lineNo, parsed.canonical);
}
