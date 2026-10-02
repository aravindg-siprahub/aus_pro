import type { FontId, PrintLocation, PrintSize, Customization } from "@/types/commerce";

export const FONTS: { id: FontId; label: string; family: string; widthFactor: number }[] = [
  { id: "sans", label: "Modern", family: "var(--font-inter), Helvetica, sans-serif", widthFactor: 0.6 },
  { id: "serif", label: "Editorial", family: "var(--font-playfair), Georgia, serif", widthFactor: 0.56 },
  { id: "script", label: "Script", family: "var(--font-caveat), cursive", widthFactor: 0.42 },
  { id: "condensed", label: "Condensed", family: "var(--font-bebas), Impact, sans-serif", widthFactor: 0.4 },
  { id: "mono", label: "Mono", family: "var(--font-mono), monospace", widthFactor: 0.62 },
];

export const TEXT_COLORS = [
  { hex: "#111111", name: "Black" },
  { hex: "#ffffff", name: "White" },
  { hex: "#c8372d", name: "Red" },
  { hex: "#2358b8", name: "Blue" },
  { hex: "#d9a21b", name: "Gold" },
  { hex: "#2f7d4f", name: "Green" },
  { hex: "#7a4fb3", name: "Violet" },
];

export const PRINT_SIZES: { id: PrintSize; label: string; hint: string }[] = [
  { id: "small", label: "Small", hint: "Up to 4″ wide" },
  { id: "medium", label: "Medium", hint: "Up to 8″ wide" },
  { id: "large", label: "Large", hint: "Up to 12″ wide" },
];

export const LOCATIONS: { id: PrintLocation; label: string }[] = [
  { id: "front", label: "Front" },
  { id: "back", label: "Back" },
  { id: "left-sleeve", label: "Left sleeve" },
  { id: "right-sleeve", label: "Right sleeve" },
];

export const MAX_TEXT = 22;

export const DEFAULT_CUSTOMIZATION: Customization = {
  text: "",
  fontId: "sans",
  textColor: "#111111",
  printSize: "medium",
  location: "front",
};

export const fontById = (id: FontId) => FONTS.find((f) => f.id === id) ?? FONTS[0];
export const locationLabel = (id: PrintLocation) => LOCATIONS.find((l) => l.id === id)!.label;
export const colorName = (hex: string) =>
  TEXT_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex;
export const sizeLabel = (id: PrintSize) => PRINT_SIZES.find((s) => s.id === id)!.label;
