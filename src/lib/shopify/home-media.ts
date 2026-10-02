import type { HomeMedia, HomeSlot } from "@/types/commerce";
import { shopifyGraphQL } from "./client";
import { log, errorSummary } from "./logger";
import { isShopifyCdn } from "./mappers";
import { memo } from "./memo";
import { hasGrantedScope } from "./scopes";

export const HOME_SLOTS = ["hero", "canvas", "compose", "made", "place-front", "place-back", "place-sleeve", "band"] as const satisfies readonly HomeSlot[];

/**
 * Home page photos live in Shopify (Content → Files), so the merchant can swap them without a deploy.
 * A file belongs to a slot when its alt text starts with `atelier-home:<slot> |`; the rest of the alt
 * text is what screen readers hear. If two files claim a slot, the newest wins.
 */
const HOME_FILES_QUERY = /* GraphQL */ `
  query HomeFiles {
    files(first: 100, sortKey: CREATED_AT, reverse: true, query: "media_type:IMAGE AND status:READY") {
      nodes { ... on MediaImage { alt image { url width height } } }
    }
  }
`;

interface RawFile { alt?: string | null; image?: { url: string; width?: number | null; height?: number | null } | null }

const MARKER = /^atelier-home:([a-z-]+)\s*\|\s*(.*)$/s;

export function mapHomeFiles(nodes: RawFile[]): HomeMedia {
  const out: HomeMedia = {};
  for (const n of nodes) {
    const m = MARKER.exec(n?.alt?.trim() ?? "");
    const url = n?.image?.url;
    if (!m || !url || !isShopifyCdn(url)) continue;
    const slot = m[1] as HomeSlot;
    if (!(HOME_SLOTS as readonly string[]).includes(slot) || out[slot]) continue;
    out[slot] = { url, alt: m[2].trim(), width: n.image?.width ?? null, height: n.image?.height ?? null };
  }
  return out;
}

/**
 * Cached for five minutes. Needs `read_files`, which is optional: without it (or on any failure) the home
 * page uses product photos instead, so a missing file never breaks the storefront.
 */
export async function getHomeMedia(): Promise<HomeMedia> {
  try {
    // Failures are thrown inside memo so they aren't cached; the next page load tries again.
    return await memo("home.media", 5 * 60_000, async () => {
      if (!(await hasGrantedScope("read_files"))) {
        log("warn", "home_media.no_scope", { scope: "read_files" });
        return {};
      }
      const data = await shopifyGraphQL<{ files: { nodes: RawFile[] } }>(HOME_FILES_QUERY, {}, { operation: "home.files", idempotent: true });
      return mapHomeFiles(data.files.nodes);
    });
  } catch (e) {
    log("error", "home_media.unavailable", errorSummary(e));
    return {};
  }
}
