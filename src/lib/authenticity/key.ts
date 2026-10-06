import { ConfigError, resolveProviderMode } from "@/lib/shopify/config";
import { registerSecret } from "@/lib/shopify/logger";

type Env = Record<string, string | undefined>;

export const SECRET_VAR = "AUTHENTICITY_SECRET";
export const MIN_SECRET_LENGTH = 32;

/**
 * The demo catalogue signs with a fixed, public key so its sample serial is stable. It can never verify a
 * real piece: demo mode has no store behind it, and Shopify mode never uses this key.
 */
const DEMO_KEY = "atelier-demo-serials-public-key-not-a-secret";

/**
 * The key that signs serial numbers (server-only).
 *
 * Deliberately its own variable, NOT derived from the Shopify client secret: rotating Shopify credentials
 * must never invalidate the serials already stamped on garments. Rotating THIS value does invalidate them,
 * so treat it as permanent.
 *
 * Throws ConfigError (naming the variable, never its value) when Shopify mode lacks a usable secret.
 */
export function authenticityKey(env: Env = process.env): string {
  if (typeof window !== "undefined") throw new ConfigError("Serial keys are only available on the server.");
  if (resolveProviderMode(env) === "mock") return DEMO_KEY;
  const secret = env[SECRET_VAR]?.trim();
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new ConfigError(`${SECRET_VAR} must be set to at least ${MIN_SECRET_LENGTH} characters. See .env.example.`);
  }
  registerSecret(secret);
  return secret;
}

/** The signing key, or null when it isn't configured (for screens that should degrade, like the admin). */
export function authenticityKeyOrNull(env: Env = process.env): string | null {
  try {
    return authenticityKey(env);
  } catch (e) {
    if (e instanceof ConfigError) return null;
    throw e;
  }
}
