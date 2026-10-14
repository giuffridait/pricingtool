"use server";

import { revalidatePath } from "next/cache";
import { newId } from "../store";
import type { RoundingMode, PricingContext } from "../types";
import type { PresentationResult } from "../engine/presentation";
import { saveVersioned, deleteVersioned } from "./helpers";
import { resolvePrice } from "../engine/price";
import { buildPresentation } from "../engine/presentation";
import { loadCatalog } from "../engine/catalog";
import { discounts, presentationPolicies, historicalMetrics } from "../repo";

export interface PresentationPolicyInput {
  id?: string;
  name: string;
  businessUnitId: string;
  shopId?: string;
  currency: string;
  roundingMode: RoundingMode;
  charmEnding?: number;
  showRrpStrikethrough: boolean;
  showDiscountBadge: boolean;
  showFromPrice: boolean;
  showNextTierMessage: boolean;
  showOmnibusReference: boolean;
}

export async function savePresentationPolicyAction(input: PresentationPolicyInput) {
  const id = input.id ?? newId("pp");
  await saveVersioned(
    "presentationPolicy",
    id,
    (versionId) => ({
      id,
      name: input.name,
      businessUnitId: input.businessUnitId,
      shopId: input.shopId || undefined,
      currency: input.currency,
      roundingMode: input.roundingMode,
      charmEnding: input.roundingMode === "charm" ? input.charmEnding : undefined,
      showRrpStrikethrough: input.showRrpStrikethrough,
      showDiscountBadge: input.showDiscountBadge,
      showFromPrice: input.showFromPrice,
      showNextTierMessage: input.showNextTierMessage,
      showOmnibusReference: input.showOmnibusReference,
      versionId,
    }),
    { note: `Saved presentation policy "${input.name}"` },
  );
  revalidatePath("/presentation");
  revalidatePath("/calculator");
}

export async function deletePresentationPolicyAction(id: string) {
  await deleteVersioned("presentationPolicy", id, "Removed presentation policy");
  revalidatePath("/presentation");
  revalidatePath("/calculator");
}

// "From €X" tile pricing: resolves every SKU under a product and returns the
// presentation for whichever one is cheapest - what a product-listing tile
// would show before the shopper picks a variant/size.
export async function previewFromPriceAction(
  productId: string,
  shared: Omit<PricingContext, "skuId">,
): Promise<{ presentation?: PresentationResult; skuId?: string; error?: string }> {
  try {
    const [catalog, allDiscounts, allPolicies, allHistory] = await Promise.all([
      loadCatalog(),
      discounts.all(),
      presentationPolicies.all(),
      historicalMetrics.all(),
    ]);
    const productSkus = catalog.skus.filter((sku) => {
      const variant = catalog.variants.find((v) => v.id === sku.variantId);
      return variant?.productId === productId;
    });
    if (productSkus.length === 0) return { error: "No SKUs found for this product" };

    const candidates = allPolicies
      .filter((p) => p.businessUnitId === shared.businessUnitId)
      .filter((p) => !p.shopId || p.shopId === shared.shopId)
      .sort((a, b) => (a.shopId ? 0 : 1) - (b.shopId ? 0 : 1));
    const policy = candidates[0];

    let cheapest: { presentation: PresentationResult; skuId: string } | null = null;
    for (const sku of productSkus) {
      const resolved = await resolvePrice({ ...shared, skuId: sku.id });
      const node = catalog.variants.find((v) => v.id === sku.variantId);
      if (!node) continue;
      const product = catalog.products.find((p) => p.id === node.productId);
      if (!product) continue;
      const ids = { productGroupId: product.productGroupId, productId: product.id, variantId: node.id, skuId: sku.id };
      const presentation = await buildPresentation(
        resolved,
        ids,
        allDiscounts,
        allHistory,
        { market: shared.market, customerGroup: shared.customerGroup, date: shared.date, quantity: shared.quantity },
        policy,
      );
      if (!cheapest || presentation.displayPrice < cheapest.presentation.displayPrice) {
        cheapest = { presentation, skuId: sku.id };
      }
    }
    if (!cheapest) return { error: "Could not resolve a price for any SKU in this product" };
    return { presentation: cheapest.presentation, skuId: cheapest.skuId };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
