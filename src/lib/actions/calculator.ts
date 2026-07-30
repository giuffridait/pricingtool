"use server";

import type { PricingContext, ResolvedPrice } from "../types";
import { resolvePrice } from "../engine/price";

export async function calculatePriceAction(ctx: PricingContext): Promise<{ result?: ResolvedPrice; error?: string }> {
  try {
    const result = await resolvePrice(ctx);
    return { result };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
