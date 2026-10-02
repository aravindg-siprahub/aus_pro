import { createHmac, timingSafeEqual } from "node:crypto";
import { getShopifyConfig } from "./config";

/**
 * Order references handed to the browser look like `<numeric draft order id>.<signature>`.
 * Shopify ids are sequential, so without the signature anyone could enumerate other
 * customers' orders. The key is derived from the client secret and never leaves the server.
 */
const PREFIX = "gid://shopify/DraftOrder/";

function sign(id: string, secret: string) {
  return createHmac("sha256", secret).update(`atelier-order-ref-v1:${id}`).digest("base64url").slice(0, 24);
}

export function draftOrderGidToRef(gid: string, secret = getShopifyConfig().clientSecret): string {
  if (!gid.startsWith(PREFIX)) throw new Error("unexpected draft order id");
  const id = gid.slice(PREFIX.length);
  return `${id}.${sign(id, secret)}`;
}

/** Returns the draft order GID if the reference is genuine, otherwise null. */
export function refToDraftOrderGid(ref: string, secret = getShopifyConfig().clientSecret): string | null {
  const m = /^(\d{1,20})\.([A-Za-z0-9_-]{24})$/.exec(ref);
  if (!m) return null;
  const expected = Buffer.from(sign(m[1], secret));
  const given = Buffer.from(m[2]);
  return expected.length === given.length && timingSafeEqual(expected, given) ? `${PREFIX}${m[1]}` : null;
}
