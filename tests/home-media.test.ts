import { test } from "node:test";
import assert from "node:assert/strict";
import { mapHomeFiles } from "@/lib/shopify/home-media";

const cdn = (n: string) => `https://cdn.shopify.com/s/files/1/0001/files/${n}.jpg`;

test("home media: files are matched to slots by their alt-text marker, newest first", () => {
  const media = mapHomeFiles([
    { alt: "atelier-home:hero | A white tee on a hanger", image: { url: cdn("hero-new"), width: 2400, height: 1600 } },
    { alt: "atelier-home:hero | An older hero", image: { url: cdn("hero-old"), width: 10, height: 10 } },
    { alt: "atelier-home:band|A rail", image: { url: cdn("band") } },
  ]);
  assert.deepEqual(media.hero, { url: cdn("hero-new"), alt: "A white tee on a hanger", width: 2400, height: 1600 });
  assert.deepEqual(media.band, { url: cdn("band"), alt: "A rail", width: null, height: null });
});

test("home media: unmarked files, unknown slots and non-Shopify URLs are ignored", () => {
  const media = mapHomeFiles([
    { alt: "A product photo", image: { url: cdn("p") } },
    { alt: "atelier-home:banner | not a slot", image: { url: cdn("x") } },
    { alt: "atelier-home:made | elsewhere", image: { url: "https://evil.example/made.jpg" } },
    { alt: "atelier-home:canvas | no image yet", image: null },
    {},
  ]);
  assert.deepEqual(media, {});
});
