import type { Customization } from "@/types/commerce";

/** Two bag lines merge when they have the same variant and the same print. */
export const buildLineId = (variantId: string, customization?: Customization) =>
  `${variantId}:${customization ? JSON.stringify(customization) : "plain"}`;
