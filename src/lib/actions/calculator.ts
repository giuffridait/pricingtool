"use server";

import type { PricingContext, ResolvedPrice } from "../types";
import type { PresentationResult } from "../engine/presentation";
import { resolvePrice } from "../engine/price";
import { buildPresentation } from "../engine/presentation";
import { loadCatalog, resolveNode, nodeIds } from "../engine/catalog";
import { discounts, presentationPolicies, historicalMetrics } from "../repo";

export async function calculatePriceAction(
  ctx: PricingContext,
): Promise<{ result?: ResolvedPrice; presentation?: PresentationResult; error?: string }> {
  try {
    const result = await resolvePrice(ctx);

    const [catalog, allDiscounts, allPolicies, allHistory] = await Promise.all([
      loadCatalog(),
      discounts.all(),
      presentationPolicies.all(),
      historicalMetrics.all(),
    ]);
    const node = resolveNode(catalog, ctx.skuId);
    const ids = node ? nodeIds(node) : null;

    const candidates = allPolicies
      .filter((p) => p.businessUnitId === ctx.businessUnitId)
      .filter((p) => !p.shopId || p.shopId === ctx.shopId)
      .sort((a, b) => (a.shopId ? 0 : 1) - (b.shopId ? 0 : 1) || (a.currency === result.currency ? 0 : 1) - (b.currency === result.currency ? 0 : 1));
    const policy = candidates[0];

    const presentation = ids
      ? await buildPresentation(
          result,
          ids,
          allDiscounts,
          allHistory,
          { market: ctx.market, customerGroup: ctx.customerGroup, date: ctx.date, quantity: ctx.quantity },
          policy,
        )
      : undefined;

    return { result, presentation };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
