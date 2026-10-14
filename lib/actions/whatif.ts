"use server";

import { revalidatePath } from "next/cache";
import { newId } from "../store";
import type { PricingContext, ResolvedPrice } from "../types";
import { resolvePrice } from "../engine/price";
import { createVersion } from "../engine/versions";
import { priceOverrides } from "../repo";

export async function loadCurrentPriceAction(ctx: PricingContext): Promise<{ result?: ResolvedPrice; error?: string }> {
  try {
    const result = await resolvePrice(ctx);
    return { result };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// Runs the hypothetical price through the *real* engine (rules, components,
// discounts, stacking groups, floor/ceiling safeguard) rather than a parallel
// approximation - see PricingContext.overridePrice.
export async function checkWorstCaseAction(ctx: PricingContext, hypotheticalPrice: number): Promise<{ result?: ResolvedPrice; error?: string }> {
  try {
    const result = await resolvePrice({ ...ctx, overridePrice: hypotheticalPrice });
    return { result };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export interface DraftChangeInput {
  skuId: string;
  businessUnitId: string;
  shopId?: string;
  price: number;
  currency: string;
}

// Creates a draft (not auto-activated) - hands off to the normal versioning
// flow instead of touching the live price. Preserves an existing sku-level
// override's floor/ceiling rather than inventing or clearing them; this
// panel only proposes a price.
export async function draftPriceChangeAction(input: DraftChangeInput): Promise<{ versionId: string }> {
  const existing = (await priceOverrides.all()).find(
    (o) => o.level === "sku" && o.refId === input.skuId && o.businessUnitId === input.businessUnitId && (o.shopId ?? "") === (input.shopId ?? ""),
  );
  const id = existing?.id ?? newId("po");
  const versionId = newId("ver");
  await createVersion(
    "priceOverride",
    id,
    {
      id,
      level: "sku",
      refId: input.skuId,
      businessUnitId: input.businessUnitId,
      shopId: input.shopId || undefined,
      price: input.price,
      currency: input.currency,
      floor: existing?.floor,
      ceiling: existing?.ceiling,
      versionId,
    },
    { id: versionId, note: `Drafted from What-If & Break-Even: ${input.currency} ${input.price.toFixed(2)}` },
  );
  revalidatePath("/versions");
  revalidatePath("/whatif");
  return { versionId };
}
