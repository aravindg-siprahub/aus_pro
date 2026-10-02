import { getProviderMode } from "@/lib/commerce/server";
import { errorSummary, log } from "@/lib/shopify/logger";
import { MOCK_PROBLEM, describeProblem, type AdminProblem } from "./problems";

export type AdminResult<T> = { ok: true; data: T } | { ok: false; problem: AdminProblem };

/**
 * Runs an admin data load and turns every failure into something the page can render.
 * In mock mode it reports "not connected" rather than inventing store data.
 */
export async function loadAdmin<T>(operation: string, fn: () => Promise<T>): Promise<AdminResult<T>> {
  if (getProviderMode() !== "shopify") return { ok: false, problem: MOCK_PROBLEM };
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    log("error", "admin.load_failed", { operation, ...errorSummary(e) });
    return { ok: false, problem: describeProblem(e) };
  }
}
