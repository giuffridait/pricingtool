import type { Discount, DiscountScope, PriceOverride, PricingRule, Shop } from "../types";
import { resolveBasePrice } from "./base";
import type { CatalogIndex } from "./catalog";
import { nodeIds } from "./catalog";
import { computeBreakEven, UNREALISTIC_UPLIFT_THRESHOLD_PERCENT } from "./breakeven";

// Cross-SKU sanity checks: built-in detectors (not user-authored rules) that
// scan the whole catalog for anomalies. Detection only - never blocks a save.

export interface SanityFinding {
  id: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

export function runSanityChecks(
  catalog: CatalogIndex,
  overrides: PriceOverride[],
  rules: PricingRule[],
  discounts: Discount[],
  shops: Shop[],
  businessUnitId: string,
): SanityFinding[] {
  const findings: SanityFinding[] = [];

  // 1. Size ordering within a variant: a larger size should never resolve cheaper than a smaller one.
  for (const variant of catalog.variants) {
    const skusInVariant = catalog.skus
      .filter((s) => s.variantId === variant.id)
      .map((s) => ({ sku: s, sizeIdx: SIZE_ORDER.indexOf(s.size) }))
      .filter((x) => x.sizeIdx >= 0)
      .sort((a, b) => a.sizeIdx - b.sizeIdx);
    for (let i = 1; i < skusInVariant.length; i++) {
      const smaller = skusInVariant[i - 1];
      const larger = skusInVariant[i];
      const product = catalog.products.find((p) => p.id === variant.productId);
      if (!product) continue;
      const ids = { productGroupId: product.productGroupId, productId: product.id, variantId: variant.id, skuId: "" };
      const smallerPrice = resolveBasePrice(overrides, { ...ids, skuId: smaller.sku.id }, { businessUnitId });
      const largerPrice = resolveBasePrice(overrides, { ...ids, skuId: larger.sku.id }, { businessUnitId });
      if (smallerPrice && largerPrice && largerPrice.price < smallerPrice.price) {
        findings.push({
          id: `size-order-${larger.sku.id}`,
          severity: "critical",
          message: `${variant.name}: ${larger.sku.size} (${largerPrice.price.toFixed(2)}) is cheaper than ${smaller.sku.size} (${smallerPrice.price.toFixed(2)}).`,
        });
      }
    }
  }

  // 2. Sale/rule price above the catalog base price (acting as RRP).
  for (const rule of rules) {
    if (rule.effect.type !== "setPrice" || rule.effect.price === undefined) continue;
    const target = targetSkuForScope(catalog, rule.scope);
    if (!target) continue;
    const ids = nodeIdsForSku(catalog, target.id);
    if (!ids) continue;
    const base = resolveBasePrice(overrides, ids, { businessUnitId });
    if (base && rule.effect.price > base.price) {
      findings.push({
        id: `sale-above-rrp-${rule.id}`,
        severity: "warning",
        message: `Rule "${rule.name}" sets price ${rule.effect.price.toFixed(2)}, above the catalog base price ${base.price.toFixed(2)} it overrides.`,
      });
    }
  }

  // 3. Broken/overlapping volume tiers: duplicate or non-increasing minQty thresholds.
  for (const discount of discounts) {
    if (discount.type !== "volumeTier" || !discount.tiers) continue;
    const seen = new Set<number>();
    for (const tier of discount.tiers) {
      if (seen.has(tier.minQty)) {
        findings.push({
          id: `overlapping-tiers-${discount.id}`,
          severity: "warning",
          message: `Discount "${discount.name}" has overlapping tiers: more than one tier starts at qty ${tier.minQty}.`,
        });
        break;
      }
      seen.add(tier.minQty);
    }
  }

  // 4. Missing market-specific price: a shop whose settlement currency differs from
  // the BU-wide default falls back silently unless a shop-specific override exists.
  for (const shop of shops) {
    for (const productGroup of catalog.productGroups) {
      if (shop.businessUnitId !== businessUnitId) continue;
      const ids = { productGroupId: productGroup.id, productId: "", variantId: "", skuId: "" };
      const resolved = resolveBasePrice(overrides, ids, { businessUnitId, shopId: shop.id });
      if (resolved && !resolved.shopSpecific && resolved.currency !== shop.currency) {
        findings.push({
          id: `missing-market-price-${shop.id}-${productGroup.id}`,
          severity: "warning",
          message: `${productGroup.name} has no ${shop.currency} price for ${shop.name} - falls back to ${resolved.currency} default.`,
        });
      }
    }
  }

  // 5. Discounts whose configured depth would need an unrealistic volume
  // increase to break even, given the target SKU's floor as a margin proxy
  // (no real cost feed exists yet - see computeBreakEven). Skips anything
  // without a floor rather than guessing a cost, and skips mechanics
  // (volumeTier/bogo/basketValue) that don't reduce to a single new price.
  for (const discount of discounts) {
    if (discount.type !== "percentOff" && discount.type !== "amountOff" && discount.type !== "fixedPrice") continue;
    const target = targetSkuForScope(catalog, discount.scope);
    if (!target) continue;
    const ids = nodeIdsForSku(catalog, target.id);
    if (!ids) continue;
    const base = resolveBasePrice(overrides, ids, { businessUnitId });
    if (!base?.floor) continue;
    const newPrice =
      discount.type === "fixedPrice"
        ? (discount.value ?? base.price)
        : discount.type === "amountOff"
          ? base.price - (discount.value ?? 0)
          : base.price * (1 - (discount.value ?? 0) / 100);
    const result = computeBreakEven(base.price, newPrice, base.floor);
    if (!result) {
      findings.push({
        id: `breakeven-impossible-${discount.id}-${businessUnitId}`,
        severity: "critical",
        message: `Discount "${discount.name}" would price below its floor (${base.floor.toFixed(2)}) - no volume increase breaks even on a loss.`,
      });
    } else if (result.requiredVolumeUpliftPercent > UNREALISTIC_UPLIFT_THRESHOLD_PERCENT) {
      findings.push({
        id: `breakeven-unrealistic-${discount.id}-${businessUnitId}`,
        severity: "warning",
        message: `Discount "${discount.name}" needs a ${result.requiredVolumeUpliftPercent.toFixed(0)}% volume increase to break even (floor-based margin proxy).`,
      });
    }
  }

  return findings;
}

// Shared by checks 2 and 5: resolves the single SKU a rule/discount scope
// targets (most specific field on the scope wins, matching scopeSpecificity
// in the pricing engine), taking the first SKU found under that scope.
function targetSkuForScope(catalog: CatalogIndex, scope: DiscountScope) {
  if (scope.skuId) return catalog.skus.find((s) => s.id === scope.skuId);
  if (scope.variantId) return catalog.skus.find((s) => s.variantId === scope.variantId);
  if (scope.productId) return catalog.skus.find((s) => catalog.variants.find((v) => v.id === s.variantId)?.productId === scope.productId);
  if (scope.productGroupId)
    return catalog.skus.find((s) => {
      const v = catalog.variants.find((v) => v.id === s.variantId);
      const p = v && catalog.products.find((p) => p.id === v.productId);
      return p?.productGroupId === scope.productGroupId;
    });
  return undefined;
}

function nodeIdsForSku(catalog: CatalogIndex, skuId: string): ReturnType<typeof nodeIds> | null {
  const sku = catalog.skus.find((s) => s.id === skuId);
  if (!sku) return null;
  const variant = catalog.variants.find((v) => v.id === sku.variantId);
  if (!variant) return null;
  const product = catalog.products.find((p) => p.id === variant.productId);
  if (!product) return null;
  return { productGroupId: product.productGroupId, productId: product.id, variantId: variant.id, skuId: sku.id };
}
