import type { Customization, FontId, PrintLocation, PrintSize, ShippingInfo } from "@/types/commerce";
import { FONTS, LOCATIONS, MAX_TEXT, PRINT_SIZES } from "@/features/customizer/config";
import { validationError } from "./errors";

export interface CheckoutLine {
  variantId: string;
  quantity: number;
  customization?: Customization;
}
export interface CheckoutRequest {
  items: CheckoutLine[];
  shipping: ShippingInfo;
}

const MAX_LINES = 20;
const MAX_QTY = 10;

export const COUNTRIES: Record<string, string> = {
  "United States": "US", Canada: "CA", "United Kingdom": "GB", Australia: "AU", India: "IN", Germany: "DE", France: "FR",
};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function text(v: unknown, label: string, { max = 100, min = 0, required = true } = {}): string {
  if (v === undefined || v === null || v === "") {
    if (required) throw validationError(`${label} is required.`);
    return "";
  }
  if (typeof v !== "string") throw validationError(`${label} is not valid.`);
  const s = v.trim();
  if (s.length < min || s.length > max || /[\u0000-\u001f\u007f]/.test(s)) throw validationError(`${label} is not valid.`);
  if (required && s.length === 0) throw validationError(`${label} is required.`);
  return s;
}

export function parseCustomization(v: unknown): Customization {
  if (!isObject(v)) throw validationError("The print details are not valid.");
  const t = text(v.text, "Print text", { max: MAX_TEXT });
  const fontId = v.fontId as FontId;
  const printSize = v.printSize as PrintSize;
  const location = v.location as PrintLocation;
  if (!FONTS.some((f) => f.id === fontId)) throw validationError("The print font is not valid.");
  if (!PRINT_SIZES.some((s) => s.id === printSize)) throw validationError("The print size is not valid.");
  if (!LOCATIONS.some((l) => l.id === location)) throw validationError("The print placement is not valid.");
  const textColor = typeof v.textColor === "string" && /^#[0-9a-fA-F]{6}$/.test(v.textColor) ? v.textColor.toLowerCase() : null;
  if (!textColor) throw validationError("The print colour is not valid.");
  return { text: t, fontId, textColor, printSize, location };
}

export function parseShipping(v: unknown): ShippingInfo {
  if (!isObject(v)) throw validationError("Shipping details are required.");
  const email = text(v.email, "Email", { max: 254 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw validationError("Enter a valid email address.");
  const country = text(v.country, "Country");
  if (!(country in COUNTRIES)) throw validationError("We don't ship to that country yet.");
  return {
    email,
    firstName: text(v.firstName, "First name"),
    lastName: text(v.lastName, "Last name"),
    address: text(v.address, "Address"),
    apartment: text(v.apartment, "Apartment", { required: false }),
    city: text(v.city, "City"),
    region: text(v.region, "State or region"),
    postalCode: text(v.postalCode, "Postal code", { min: 3, max: 12 }),
    country,
    phone: text(v.phone, "Phone", { required: false, max: 30 }),
  };
}

/** Validates an untrusted checkout body. Prices are deliberately not accepted: the server prices every line. */
export function parseCheckoutRequest(body: unknown): CheckoutRequest {
  if (!isObject(body) || !Array.isArray(body.items)) throw validationError("Your bag is empty.");
  if (body.items.length === 0) throw validationError("Your bag is empty.");
  if (body.items.length > MAX_LINES) throw validationError("Your bag has too many items.");

  const items = body.items.map((raw): CheckoutLine => {
    if (!isObject(raw)) throw validationError("An item in your bag is not valid.");
    const variantId = raw.variantId;
    if (typeof variantId !== "string" || !/^gid:\/\/shopify\/ProductVariant\/\d{1,20}$/.test(variantId)) {
      throw validationError("An item in your bag is not valid.");
    }
    const quantity = raw.quantity;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
      throw validationError("An item quantity is not valid.");
    }
    return { variantId, quantity, customization: raw.customization ? parseCustomization(raw.customization) : undefined };
  });

  return { items, shipping: parseShipping(body.shipping) };
}
