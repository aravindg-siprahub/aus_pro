import { test } from "node:test";
import assert from "node:assert/strict";
import { availabilityOf, sizeRange } from "@/lib/commerce/availability";
import type { Product } from "@/types/commerce";

const product = (avail: [string, boolean][]): Product => ({
  id: "p",
  slug: "p",
  name: "P",
  category: "round-neck",
  tagline: "",
  description: "",
  basePrice: 10,
  colors: [{ id: "black", name: "Black", hex: "#000" }, { id: "white", name: "White", hex: "#fff" }],
  sizes: ["S", "M"],
  variants: avail.map(([key, available], i) => {
    const [colorId, size] = key.split("/");
    return { id: `v${i}`, productId: "p", colorId, size: size as "S" | "M", price: 10, available };
  }),
  details: { material: "", fit: "", delivery: "", care: "" },
  images: [],
});

test("availability: all, some or no sizes on offer, for the product or one colour", () => {
  const p = product([["black/S", true], ["black/M", true], ["white/S", false], ["white/M", true]]);
  assert.equal(availabilityOf(p).status, "limited");
  assert.equal(availabilityOf(p, "black").status, "in_stock");
  assert.equal(availabilityOf(p, "white").label, "Limited sizes");
  const none = product([["black/S", false], ["black/M", false]]);
  assert.deepEqual(availabilityOf(none), { status: "sold_out", label: "Sold out" });
  assert.equal(availabilityOf(p, "missing").status, "sold_out", "a colour with no variants can't be bought");
});

test("size range: runs, gaps and single sizes", () => {
  assert.equal(sizeRange(["XS", "S", "M", "L", "XL", "XXL"]), "XS–XXL");
  assert.equal(sizeRange(["L", "S", "M"]), "S–L", "order doesn't matter");
  assert.equal(sizeRange(["S", "M"]), "S · M");
  assert.equal(sizeRange(["S", "M", "XL"]), "S · M · XL");
  assert.equal(sizeRange(["M"]), "M");
  assert.equal(sizeRange([]), "");
});
