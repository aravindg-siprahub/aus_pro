import { ShopifyError } from "./errors";
import { log, registerSecret } from "./logger";
import type { ShopifyConfig } from "./config";

/**
 * Client credentials grant (Dev Dashboard apps in the same organization as the store):
 * POST https://{shop}/admin/oauth/access_token → { access_token, scope, expires_in: 86399 }.
 * Tokens last 24 hours, so we cache one per process and renew it shortly before expiry.
 */
interface CachedToken {
  token: string;
  expiresAt: number;
  scopes: string[];
}

const REFRESH_MARGIN_MS = 5 * 60_000;

let cached: CachedToken | null = null;
let inflight: Promise<CachedToken> | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function requestToken(cfg: ShopifyConfig): Promise<CachedToken> {
  registerSecret(cfg.clientSecret);
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });

  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    const started = Date.now();
    try {
      const res = await fetch(`https://${cfg.shopDomain}/admin/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body,
        signal: AbortSignal.timeout(cfg.timeoutMs),
        cache: "no-store",
      });
      lastStatus = res.status;
      log("info", "token.request", { status: res.status, durationMs: Date.now() - started, attempt });

      if (res.ok) {
        const json = (await res.json()) as { access_token?: unknown; scope?: unknown; expires_in?: unknown };
        if (typeof json.access_token !== "string" || !json.access_token) {
          throw new ShopifyError("auth", "token response had no access_token");
        }
        registerSecret(json.access_token);
        const ttl = typeof json.expires_in === "number" && json.expires_in > 0 ? json.expires_in : 86_399;
        return {
          token: json.access_token,
          expiresAt: Date.now() + ttl * 1000,
          scopes: typeof json.scope === "string" ? json.scope.split(",").map((s) => s.trim()).filter(Boolean) : [],
        };
      }
      // 4xx other than 429 means the credentials, domain or app installation are wrong: retrying won't help.
      if (res.status !== 429 && res.status < 500) {
        // The OAuth error code (e.g. invalid_client, app_not_installed) is safe to log and tells the operator what to fix.
        const detail = (await res.json().catch(() => null)) as { error?: unknown; error_description?: unknown } | null;
        log("error", "token.rejected", {
          status: res.status,
          error: typeof detail?.error === "string" ? detail.error : undefined,
          description: typeof detail?.error_description === "string" ? detail.error_description : undefined,
        });
        const oauthError = typeof detail?.error === "string" && /^[a-z_]{3,40}$/.test(detail.error) ? detail.error : undefined;
        throw new ShopifyError("auth", `token endpoint returned ${res.status}`, undefined, {
          reason: res.status === 404 ? "shop_not_found" : oauthError ?? "token_rejected",
        });
      }
    } catch (e) {
      if (e instanceof ShopifyError) throw e;
      const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      log("warn", "token.network_error", { attempt, timeout: timedOut });
      if (attempt === 2) throw new ShopifyError(timedOut ? "timeout" : "network", "token request failed");
    }
    await sleep(300 * 2 ** attempt + Math.random() * 100);
  }
  throw new ShopifyError("auth", `token endpoint returned ${lastStatus}`);
}

export async function getAccessToken(cfg: ShopifyConfig, opts: { forceRefresh?: boolean } = {}): Promise<string> {
  if (!opts.forceRefresh && cached && cached.expiresAt - Date.now() > REFRESH_MARGIN_MS) return cached.token;
  // Concurrent callers share one in-flight request.
  inflight ??= requestToken(cfg)
    .then((t) => (cached = t))
    .finally(() => {
      inflight = null;
    });
  return (await inflight).token;
}

export function getGrantedScopes(): string[] {
  return cached?.scopes ?? [];
}

/** When the cached token expires (epoch ms), or null if none is cached. The token itself is never exposed. */
export function getTokenExpiry(): number | null {
  return cached?.expiresAt ?? null;
}

export function clearTokenCache() {
  cached = null;
  inflight = null;
}
