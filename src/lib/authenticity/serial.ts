import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Serial numbers stamped on each piece: `WH-<order digits>-<line>-<CHECK>`, e.g. WH-1001-1-7KQ4MX.
 *
 * - order digits: the digits of the Shopify order name (#1001 → 1001), no leading zero, 1–10 digits.
 * - line: the 1-based position of the line item in the order (1–50, matching lineItems(first: 50)).
 * - CHECK: the first 6 Crockford base32 characters of HMAC-SHA256(key, "atelier-serial-v1:<digits>:<line>").
 *
 * The check makes serials unforgeable without the server key: order numbers are sequential, so without it
 * anyone could mint a "valid" serial. A wrong check is rejected here, before any store lookup.
 * Server-only (node:crypto). The browser reaches this through POST /api/authenticity/verify.
 */

export const SERIAL_PREFIX = "WH";
/** The HMAC label. Changing it invalidates every serial ever stamped. */
export const SERIAL_LABEL = "atelier-serial-v1";
export const CHECK_LENGTH = 6;
export const MAX_LINE = 50;
/** Longest raw input we will look at (a canonical serial is at most 23 characters). */
export const MAX_SERIAL_INPUT = 40;

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export interface ParsedSerial {
  orderDigits: string;
  lineNo: number;
  check: string;
  /** The serial in its printed form. */
  canonical: string;
}

function crockford(bytes: Uint8Array, length: number): string {
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5 && out.length < length) {
      out += CROCKFORD[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
    buffer &= (1 << bits) - 1;
    if (out.length >= length) break;
  }
  return out;
}

export function serialCheck(orderDigits: string, lineNo: number, key: string): string {
  const mac = createHmac("sha256", key).update(`${SERIAL_LABEL}:${orderDigits}:${lineNo}`).digest();
  return crockford(mac, CHECK_LENGTH);
}

const ORDER_DIGITS = /^[1-9]\d{0,9}$/;

/** The serial to stamp on line `lineNo` (1-based) of the order named `orderName` ("#1001" or "1001"). */
export function issueSerial(orderName: string, lineNo: number, key: string): string | null {
  const digits = orderName.replace(/\D/g, "");
  if (!ORDER_DIGITS.test(digits) || !Number.isInteger(lineNo) || lineNo < 1 || lineNo > MAX_LINE) return null;
  return `${SERIAL_PREFIX}-${digits}-${lineNo}-${serialCheck(digits, lineNo, key)}`;
}

/**
 * Reads what a customer typed. Case and spaces don't matter, and typographic dashes count as dashes, but the
 * dashes themselves are required (without them "WH-1001-1" and "WH-100-11" would read the same).
 * In the check group only, Crockford look-alikes are forgiven: O → 0, I and L → 1.
 */
export function parseSerial(input: string): ParsedSerial | null {
  if (typeof input !== "string" || input.length > MAX_SERIAL_INPUT * 2) return null;
  const s = input
    .normalize("NFKC")
    .replace(/[‐-―−]/g, "-")
    .replace(/\s+/g, "")
    .toUpperCase();
  if (!s || s.length > MAX_SERIAL_INPUT) return null;

  const m = /^WH-(\d{1,10})-(\d{1,2})-([0-9A-Z]{6})$/.exec(s);
  if (!m) return null;
  const [, orderDigits, line, rawCheck] = m;
  if (!ORDER_DIGITS.test(orderDigits) || !/^[1-9]\d?$/.test(line)) return null;
  const lineNo = Number(line);
  if (lineNo > MAX_LINE) return null;

  const check = rawCheck.replace(/O/g, "0").replace(/[IL]/g, "1");
  if (![...check].every((c) => CROCKFORD.includes(c))) return null;

  return { orderDigits, lineNo, check, canonical: `${SERIAL_PREFIX}-${orderDigits}-${lineNo}-${check}` };
}

/** True when the parsed serial was signed with `key`. Constant-time. */
export function checkMatches(serial: ParsedSerial, key: string): boolean {
  const expected = Buffer.from(serialCheck(serial.orderDigits, serial.lineNo, key));
  const given = Buffer.from(serial.check);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
