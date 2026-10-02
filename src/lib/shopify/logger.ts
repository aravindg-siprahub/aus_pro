type Level = "info" | "warn" | "error";

const secrets = new Set<string>();
const SENSITIVE_KEY = /secret|token|authorization|password|cookie|x-shopify-access/i;

/** Register a value (client secret, access token) that must never appear in logs. */
export function registerSecret(value: string | undefined | null) {
  if (value && value.length >= 8) secrets.add(value);
}

/** Replace any registered secret inside a string. */
export function scrub(text: string): string {
  let out = text;
  for (const s of secrets) out = out.split(s).join("[redacted]");
  return out;
}

function clean(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return scrub(value).slice(0, 300);
  if (value === null || typeof value !== "object") return value;
  if (depth > 2) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 10).map((v) => clean(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SENSITIVE_KEY.test(k) ? "[redacted]" : clean(v, depth + 1)]),
  );
}

let sink: ((line: string) => void) | null = null;
/** Redirects log lines (used by tests to inspect them). Pass null to restore normal output. */
export function setLogSink(fn: ((line: string) => void) | null) {
  sink = fn;
}

/** One JSON line per event. Callers pass identifiers and counts, never request bodies. */
export function log(level: Level, event: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event: `shopify.${event}`, ...(clean(fields) as object) });
  // Written to the process streams rather than console.* so Next's dev overlay doesn't treat an expected,
  // already-handled Shopify failure as an application crash. The terminal still shows every line.
  if (sink) sink(line);
  else (level === "info" ? process.stdout : process.stderr).write(`${line}\n`);
}

export function errorSummary(e: unknown) {
  if (e instanceof Error) return { name: e.name, message: scrub(e.message).slice(0, 300) };
  return { name: "UnknownError" };
}
