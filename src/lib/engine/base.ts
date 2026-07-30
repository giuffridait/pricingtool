import type { PriceOverride, PricingContext, CatalogLevel } from "../types";
import type { nodeIds } from "./catalog";

const LEVEL_RANK: Record<CatalogLevel, number> = { sku: 4, variant: 3, product: 2, productGroup: 1 };

export interface BaseResolution {
  price: number;
  currency: string;
  floor?: number;
  ceiling?: number;
  level: CatalogLevel;
  shopSpecific: boolean;
}

// Authored-price resolution only: catalog inheritance + BU/shop overrides,
// no pricing rules/discounts. This is what price-architecture (consistency)
// checks reason about, and what SKU pricing screens show as "the base price".
export function resolveBasePrice(
  allOverrides: PriceOverride[],
  ids: ReturnType<typeof nodeIds>,
  ctx: Pick<PricingContext, "businessUnitId" | "shopId">,
): BaseResolution | null {
  const levelToId: Record<CatalogLevel, string> = {
    productGroup: ids.productGroupId,
    product: ids.productId,
    variant: ids.variantId,
    sku: ids.skuId,
  };
  const ranked = allOverrides
    .filter((o) => o.businessUnitId === ctx.businessUnitId && levelToId[o.level] === o.refId)
    .filter((o) => !o.shopId || o.shopId === ctx.shopId)
    .map((o) => ({ override: o, rank: LEVEL_RANK[o.level] + (o.shopId ? 10 : 0) }))
    .sort((a, b) => b.rank - a.rank);
  if (ranked.length === 0) return null;
  const winner = ranked[0].override;
  const floor = ranked.find((r) => r.override.floor !== undefined)?.override.floor;
  const ceiling = ranked.find((r) => r.override.ceiling !== undefined)?.override.ceiling;
  return { price: winner.price, currency: winner.currency, floor, ceiling, level: winner.level, shopSpecific: !!winner.shopId };
}
