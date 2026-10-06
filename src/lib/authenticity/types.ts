/**
 * The answer to "is this piece genuine?". Shared by the server (which computes it) and the browser
 * (which renders it), so this file holds types only: no secrets, no Node APIs.
 *
 * Privacy: an outcome never carries the customer's name, email, address, phone, order totals or any
 * Shopify id. Anyone holding the garment can read it, so it describes the piece and nothing else.
 */

export interface AuthenticPrint {
  text: string;
  typeface: string | null;
  placement: string | null;
  size: string | null;
  ink: string | null;
}

export interface AuthenticPiece {
  product: string;
  productHandle: string | null;
  colour: string | null;
  size: string | null;
  /** Pieces made on this order line (one serial covers the whole line). */
  quantity: number;
  /** The day the order was placed, YYYY-MM-DD (date only). */
  issuedAt: string;
  /** A Shopify CDN photo of the product, when there is one. */
  image: { url: string; alt: string } | null;
  print: AuthenticPrint | null;
  /** Set on sample serials and the demo catalogue's piece: shown as "Sample", never a real piece. */
  demo?: true;
}

export type VerifyOutcome =
  | { status: "authentic"; serial: string; piece: AuthenticPiece }
  /** The serial was genuine but its order was cancelled. */
  | { status: "void" }
  /** Well-formed and correctly signed, but no matching order line exists (or it is beyond our read window). */
  | { status: "not_found" }
  /** Malformed, or the check characters don't match. */
  | { status: "invalid" };

export type VerifyStatus = VerifyOutcome["status"];
