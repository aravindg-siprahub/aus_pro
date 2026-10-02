// Fails if anything that handles Shopify credentials ended up in the JavaScript sent to browsers.
// Run after `next build`:  npm run check:bundle
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = ".next/static";
const FORBIDDEN = [
  "SHOPIFY_CLIENT_SECRET",
  "SHOPIFY_CLIENT_ID",
  "SHOPIFY_SHOP_DOMAIN",
  "ADMIN_PASSWORD",
  "atelier-admin-password-check",
  "client_credentials",
  "X-Shopify-Access-Token",
  "admin/oauth/access_token",
  "admin/api/",
  "shpss_",
  "shpat_",
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(js|css|map|html)$/.test(name)) yield p;
  }
}

let scanned = 0;
const hits = [];
try {
  for (const file of files(ROOT)) {
    scanned++;
    const text = readFileSync(file, "utf8");
    for (const needle of FORBIDDEN) if (text.includes(needle)) hits.push(`${file}: contains "${needle}"`);
  }
} catch {
  console.error(`Could not read ${ROOT}. Run "npm run build" first.`);
  process.exit(2);
}

if (hits.length) {
  console.error("Server-only Shopify code reached the browser bundle:\n" + hits.join("\n"));
  process.exit(1);
}
console.log(`OK: scanned ${scanned} client files; no Shopify credential handling found.`);
