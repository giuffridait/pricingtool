"use server";

import type { PricingContext } from "../types";
import type { BasketLine, BasketResult } from "../engine/basket";
import { resolveBasket } from "../engine/basket";

export interface BasketRequest {
  lines: BasketLine[];
  shared: Omit<PricingContext, "skuId" | "quantity">;
}

export async function calculateBasketAction(req: BasketRequest): Promise<{ result?: BasketResult; error?: string }> {
  try {
    const result = await resolveBasket(req.lines, req.shared);
    return { result };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
