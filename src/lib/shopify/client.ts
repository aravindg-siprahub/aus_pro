import { getShopifyConfig } from "./config";
import { ShopifyError } from "./errors";
import { errorSummary, log } from "./logger";
import { getAccessToken } from "./token";

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string; extensions?: { code?: string } }[];
  extensions?: { cost?: { requestedQueryCost?: number; actualQueryCost?: number; throttleStatus?: { currentlyAvailable: number; restoreRate: number } } };
}

export interface GraphQLOptions {
  /** Short name used in logs, e.g. "products.list". */
  operation: string;
  /**
   * Reads can be retried on any transient failure. Mutations are only retried when Shopify
   * says the request was rejected before running (HTTP 429 or a THROTTLED error), so a retry
   * can never create a duplicate.
   */
  idempotent: boolean;
}

const MAX_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const backoff = (attempt: number) => 300 * 2 ** attempt + Math.random() * 150;

// Rate-limit awareness: remember the bucket level from the last response and pause if it is low.
let bucket: { available: number; restoreRate: number; at: number } | null = null;
const LOW_WATER = 100;

async function waitForBudget() {
  if (!bucket || bucket.restoreRate <= 0) return;
  const restored = ((Date.now() - bucket.at) / 1000) * bucket.restoreRate;
  const available = bucket.available + restored;
  if (available >= LOW_WATER) return;
  await sleep(Math.min(3000, ((LOW_WATER - available) / bucket.restoreRate) * 1000));
}

export async function shopifyGraphQL<T>(query: string, variables: Record<string, unknown>, opts: GraphQLOptions): Promise<T> {
  const cfg = getShopifyConfig();
  const url = `https://${cfg.shopDomain}/admin/api/${cfg.apiVersion}/graphql.json`;
  let refreshedAfter401 = false;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const last = attempt === MAX_ATTEMPTS - 1;
    await waitForBudget();
    const token = await getAccessToken(cfg);
    const started = Date.now();

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-Shopify-Access-Token": token },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(cfg.timeoutMs),
        cache: "no-store",
      });
    } catch (e) {
      const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      log("warn", "graphql.network_error", { operation: opts.operation, attempt, timeout: timedOut });
      if (!opts.idempotent || last) throw new ShopifyError(timedOut ? "timeout" : "network", `${opts.operation}: request failed`);
      await sleep(backoff(attempt));
      continue;
    }

    const durationMs = Date.now() - started;
    log("info", "graphql.response", { operation: opts.operation, status: res.status, durationMs, attempt });

    if (res.status === 401 && !refreshedAfter401) {
      // The cached token may have been revoked; get a fresh one once.
      refreshedAfter401 = true;
      await getAccessToken(cfg, { forceRefresh: true });
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      throw new ShopifyError("auth", `${opts.operation}: HTTP ${res.status}`, undefined, { reason: res.status === 403 ? "access_denied" : "token_rejected" });
    }
    if (res.status === 429) {
      if (last) throw new ShopifyError("throttled", `${opts.operation}: HTTP 429`);
      const retryAfter = Number(res.headers.get("Retry-After"));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 5000) : backoff(attempt));
      continue;
    }
    if (res.status >= 500) {
      if (!opts.idempotent || last) throw new ShopifyError("http", `${opts.operation}: HTTP ${res.status}`);
      await sleep(backoff(attempt));
      continue;
    }
    if (!res.ok) throw new ShopifyError("http", `${opts.operation}: HTTP ${res.status}`);

    let json: GraphQLResponse<T>;
    try {
      json = (await res.json()) as GraphQLResponse<T>;
    } catch (e) {
      log("error", "graphql.bad_json", { operation: opts.operation, ...errorSummary(e) });
      throw new ShopifyError("http", `${opts.operation}: response was not JSON`);
    }

    const cost = json.extensions?.cost;
    if (cost?.throttleStatus) {
      bucket = { available: cost.throttleStatus.currentlyAvailable, restoreRate: cost.throttleStatus.restoreRate, at: Date.now() };
    }

    if (json.errors?.length) {
      const throttled = json.errors.some((er) => er.extensions?.code === "THROTTLED");
      if (throttled && !last) {
        await sleep(backoff(attempt) + 500);
        continue;
      }
      const codes = json.errors.map((er) => er.extensions?.code ?? "ERROR");
      log("error", "graphql.errors", { operation: opts.operation, codes, messages: json.errors.map((er) => er.message) });
      const denied = json.errors.find((er) => er.extensions?.code === "ACCESS_DENIED");
      if (denied) {
        // Shopify names the missing permission in the message, e.g. "Required access: `read_customers` access scope".
        const scope = /`((?:read|write)_[a-z_]+)`/.exec(denied.message)?.[1];
        throw new ShopifyError("auth", `${opts.operation}: ACCESS_DENIED`, undefined, { reason: "missing_scope", scope });
      }
      throw new ShopifyError(throttled ? "throttled" : "graphql", `${opts.operation}: ${codes.join(",")}`);
    }
    if (!json.data) throw new ShopifyError("graphql", `${opts.operation}: empty response`);
    return json.data;
  }
  throw new ShopifyError("http", `${opts.operation}: retries exhausted`);
}
