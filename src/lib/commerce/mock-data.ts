import type { Category, CategoryId, Product, ProductColor, Size, Variant } from "@/types/commerce";

export const categories: Category[] = [
  { id: "round-neck", name: "Round Neck", tagline: "The everyday essential." },
  { id: "polo", name: "Polo", tagline: "Quietly sharp." },
  { id: "oversized", name: "Oversized", tagline: "Room to move." },
  { id: "hoodie", name: "Hoodies", tagline: "Heavyweight comfort." },
];

const C: Record<string, ProductColor> = {
  black: { id: "black", name: "Onyx", hex: "#222225" },
  white: { id: "white", name: "Chalk", hex: "#f2f1ee" },
  stone: { id: "stone", name: "Stone", hex: "#cbc4b8" },
  sage: { id: "sage", name: "Sage", hex: "#9aa592" },
  navy: { id: "navy", name: "Midnight", hex: "#243050" },
  clay: { id: "clay", name: "Clay", hex: "#b9775a" },
};

const SIZES: Size[] = ["XS", "S", "M", "L", "XL", "XXL"];

export const DELIVERY =
  "Made to order in 4–6 working days, then shipped in 2–4. Shipping costs are shown at checkout.";
export const CARE = "Machine wash cold, inside out. Tumble dry low. Do not iron over the print.";

function build(
  p: Omit<Product, "variants" | "sizes" | "details" | "colors"> & {
    colorKeys: string[];
    material: string;
    fit: string;
  },
): Product {
  const { colorKeys, material, fit, ...rest } = p;
  const colors = colorKeys.map((k) => C[k]);
  const variants: Variant[] = colors.flatMap((c) =>
    SIZES.map((size) => ({
      id: `${rest.id}-${c.id}-${size}`.toLowerCase(),
      productId: rest.id,
      colorId: c.id,
      size,
      price: rest.basePrice,
      // a sprinkle of realism for the unavailable state
      available: !(rest.id === "p-heavy-tee" && c.id === "sage" && size === "XXL"),
    })),
  );
  return {
    ...rest,
    colors,
    sizes: SIZES,
    variants,
    details: { material, fit, delivery: DELIVERY, care: CARE },
  };
}

export const products: Product[] = [
  build({
    id: "p-essential-tee",
    slug: "essential-crew-tee",
    name: "Essential Crew Tee",
    category: "round-neck",
    tagline: "Soft, balanced, made for your message.",
    description:
      "A 180 gsm combed-cotton crew with a clean neckline and a smooth, even surface — the perfect canvas for print.",
    basePrice: 34,
    colorKeys: ["white", "black", "stone", "navy", "sage"],
    material: "100% combed ring-spun cotton, 180 gsm. Pre-shrunk, bio-washed for softness.",
    fit: "Regular fit. Model is 6′0″ (183 cm) and wears a size M.",
    badge: "Bestseller",
  }),
  build({
    id: "p-heavy-tee",
    slug: "heavyweight-crew-tee",
    name: "Heavyweight Crew Tee",
    category: "round-neck",
    tagline: "A denser cotton with real presence.",
    description:
      "240 gsm cotton with a structured drape and a reinforced collar. Holds its shape wash after wash.",
    basePrice: 42,
    colorKeys: ["black", "white", "clay", "navy"],
    material: "100% cotton, 240 gsm, garment-dyed with a double-needle finish.",
    fit: "Slightly boxy regular fit. Size up for a looser feel.",
  }),
  build({
    id: "p-pique-polo",
    slug: "pique-polo",
    name: "Piqué Polo",
    category: "polo",
    tagline: "Textured, breathable, effortlessly sharp.",
    description:
      "A classic two-button polo in textured cotton piqué with a soft self-fabric collar that stays flat.",
    basePrice: 52,
    colorKeys: ["navy", "white", "black", "sage"],
    material: "100% cotton piqué, 210 gsm. Mother-of-pearl effect buttons.",
    fit: "Tailored regular fit with a slightly longer back hem.",
    badge: "New",
  }),
  build({
    id: "p-knit-polo",
    slug: "knit-collar-polo",
    name: "Knit Collar Polo",
    category: "polo",
    tagline: "Relaxed shape, refined collar.",
    description: "A softer jersey body paired with a ribbed knit collar for an easy, elevated silhouette.",
    basePrice: 56,
    colorKeys: ["stone", "black", "clay"],
    material: "Cotton–modal jersey, 200 gsm, with a ribbed knit collar.",
    fit: "Relaxed fit through the body, regular sleeve.",
  }),
  build({
    id: "p-drop-tee",
    slug: "drop-shoulder-tee",
    name: "Drop Shoulder Tee",
    category: "oversized",
    tagline: "Generous cut, perfectly weighted.",
    description: "A relaxed oversized tee with dropped shoulders and a wide, flat print area.",
    basePrice: 54,
    colorKeys: ["stone", "black", "white", "sage"],
    material: "100% cotton, 230 gsm, enzyme-washed.",
    fit: "Oversized fit. True to size for a roomy look; size down for a more fitted drape.",
    badge: "Bestseller",
  }),
  build({
    id: "p-boxy-tee",
    slug: "boxy-tee",
    name: "Boxy Tee",
    category: "oversized",
    tagline: "Cropped length, wide shoulders.",
    description: "A modern boxy shape with a shorter hem and wide sleeves. Made for statement prints.",
    basePrice: 58,
    colorKeys: ["white", "navy", "clay"],
    material: "100% cotton, 250 gsm, brushed inside.",
    fit: "Boxy oversized fit with a slightly cropped hem.",
  }),
  build({
    id: "p-classic-hoodie",
    slug: "classic-hoodie",
    name: "Classic Hoodie",
    category: "hoodie",
    tagline: "Heavy fleece. Calm silhouette.",
    description: "A pullover hoodie in brushed-back fleece with a roomy double-lined hood and kangaroo pocket.",
    basePrice: 78,
    colorKeys: ["black", "stone", "navy", "sage"],
    material: "80% cotton, 20% recycled polyester fleece, 380 gsm.",
    fit: "Regular fit. Ribbed cuffs and hem.",
  }),
  build({
    id: "p-oversized-hoodie",
    slug: "oversized-hoodie",
    name: "Oversized Hoodie",
    category: "hoodie",
    tagline: "Drop shoulders, endless comfort.",
    description: "Our most generous hoodie. Dropped shoulders, extra-long sleeves and a deep hood.",
    basePrice: 88,
    colorKeys: ["clay", "black", "white"],
    material: "100% cotton French terry, 420 gsm.",
    fit: "Oversized fit. Size down for a regular fit.",
    badge: "New",
  }),
];

export const categoryName = (id: CategoryId) => categories.find((c) => c.id === id)!.name;
