import type { PrintSize } from "@/types/commerce";
import { DEFAULT_PRINT_SURCHARGE } from "@/lib/shop-config";

type Env = Record<string, string | undefined>;

const REQUIRED = ["SHOPIFY_SHOP_DOMAIN", "SHOPIFY_CLIENT_ID", "SHOPIFY_CLIENT_SECRET"] as const;

/** A stable Admin API version, pinned so behaviour doesn't change under us. Override with SHOPIFY_API_VERSION. */
export const DEFAULT_API_VERSION = "2026-04";

export type ProviderMode = "shopify" | "mock";

/** Thrown for missing or malformed configuration. Messages name variables, never values. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export interface ShopifyConfig {
  shopDomain: string;
  clientId: string;
  clientSecret: string;
  apiVersion: string;
  timeoutMs: number;
  printSurcharge: Record<PrintSize, number>;
}

function assertServer() {
  if (typeof window !== "undefined") throw new ConfigError("Shopify configuration is only available on the server.");
}

/** Which backend serves the catalogue and checkout. Never reads secrets' values. */
export function resolveProviderMode(env: Env = process.env): ProviderMode {
  const requested = (env.COMMERCE_PROVIDER?.trim() || "auto").toLowerCase();
  if (requested !== "auto" && requested !== "shopify" && requested !== "mock") {
    throw new ConfigError('COMMERCE_PROVIDER must be "auto", "shopify" or "mock".');
  }
  if (requested === "mock") return "mock";
  if (requested === "shopify") return "shopify";
  // auto: any Shopify variable present means the operator intends Shopify, and a partial
  // set is reported as an error by getShopifyConfig() rather than silently using mock data.
  // In production there is no demo fallback at all: a live store missing its settings must fail loudly, not
  // quietly serve sample products. (Demo mode there needs an explicit COMMERCE_PROVIDER=mock.)
  if (env.NODE_ENV === "production") return "shopify";
  return REQUIRED.some((k) => env[k]?.trim()) ? "shopify" : "mock";
}

export function normalizeShopDomain(raw: string): string | null {
  const host = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(host) ? host : null;
}

function readNumber(env: Env, key: string, fallback: number, min: number, max: number): number {
  const raw = env[key]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) throw new ConfigError(`${key} must be a number between ${min} and ${max}.`);
  return n;
}

export function getShopifyConfig(env: Env = process.env): ShopifyConfig {
  assertServer();
  const missing = REQUIRED.filter((k) => !env[k]?.trim());
  if (missing.length) {
    throw new ConfigError(`Missing required environment variable(s): ${missing.join(", ")}. See .env.example.`);
  }
  const shopDomain = normalizeShopDomain(env.SHOPIFY_SHOP_DOMAIN!);
  if (!shopDomain) throw new ConfigError("SHOPIFY_SHOP_DOMAIN must look like your-store.myshopify.com.");

  const apiVersion = env.SHOPIFY_API_VERSION?.trim() || DEFAULT_API_VERSION;
  if (!/^(\d{4}-(01|04|07|10)|unstable)$/.test(apiVersion)) {
    throw new ConfigError("SHOPIFY_API_VERSION must look like 2026-04.");
  }

  return {
    shopDomain,
    clientId: env.SHOPIFY_CLIENT_ID!.trim(),
    clientSecret: env.SHOPIFY_CLIENT_SECRET!.trim(),
    apiVersion,
    timeoutMs: readNumber(env, "SHOPIFY_TIMEOUT_MS", 10_000, 1_000, 30_000),
    printSurcharge: {
      small: readNumber(env, "PRINT_SURCHARGE_SMALL", DEFAULT_PRINT_SURCHARGE.small, 0, 10_000),
      medium: readNumber(env, "PRINT_SURCHARGE_MEDIUM", DEFAULT_PRINT_SURCHARGE.medium, 0, 10_000),
      large: readNumber(env, "PRINT_SURCHARGE_LARGE", DEFAULT_PRINT_SURCHARGE.large, 0, 10_000),
    },
  };
}
