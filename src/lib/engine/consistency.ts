import type { ConsistencyRule, PriceOverride } from "../types";
import { resolveBasePrice } from "./base";
import type { CatalogIndex } from "./catalog";

// Price-architecture validation: checks intended relationships between
// *authored* base prices (never runtime rules/discounts) so it can run at
// save/activation time, before a change ever reaches a live pricing request.

export interface ConsistencyViolation {
  rule: ConsistencyRule;
  message: string;
  severity: "blocking" | "warning";
}

// A representative "canonical" SKU per product/group: first SKU under the
// first variant, used as the BU-wide reference price for that catalog node.
function canonicalSkuIds(catalog: CatalogIndex, productId: string) {
  const variant = catalog.variants.find((v) => v.productId === productId);
  if (!variant) return null;
  const sku = catalog.skus.find((s) => s.variantId === variant.id);
  if (!sku) return null;
  const product = catalog.products.find((p) => p.id === productId);
  if (!product) return null;
  return { productGroupId: product.productGroupId, productId, variantId: variant.id, skuId: sku.id };
}

function productBasePrice(catalog: CatalogIndex, overrides: PriceOverride[], productId: string, businessUnitId: string) {
  const ids = canonicalSkuIds(catalog, productId);
  if (!ids) return null;
  return resolveBasePrice(overrides, ids, { businessUnitId });
}

export function runConsistencyChecks(
  catalog: CatalogIndex,
  overrides: PriceOverride[],
  consistencyRules: ConsistencyRule[],
  businessUnitId: string,
): ConsistencyViolation[] {
  const violations: ConsistencyViolation[] = [];

  for (const rule of consistencyRules) {
    if (rule.type === "minGapPercent" || rule.type === "minGapAbsolute" || rule.type === "ordering") {
      const subject = productBasePrice(catalog, overrides, rule.subjectRefId, businessUnitId);
      const comparator = productBasePrice(catalog, overrides, rule.comparatorRefId, businessUnitId);
      if (!subject || !comparator) continue;
      if (rule.type === "minGapPercent") {
        const required = comparator.price * (1 + rule.threshold / 100);
        if (subject.price < required) {
          violations.push({
            rule,
            severity: rule.severity,
            message: `"${rule.name}": subject price ${subject.price.toFixed(2)} is below required ${required.toFixed(2)} (comparator ${comparator.price.toFixed(2)} + ${rule.threshold}%).`,
          });
        }
      } else if (rule.type === "minGapAbsolute") {
        const required = comparator.price + rule.threshold;
        if (subject.price < required) {
          violations.push({
            rule,
            severity: rule.severity,
            message: `"${rule.name}": subject price ${subject.price.toFixed(2)} is below required ${required.toFixed(2)} (comparator ${comparator.price.toFixed(2)} + ${rule.threshold}).`,
          });
        }
      } else if (rule.type === "ordering" && subject.price < comparator.price) {
        violations.push({
          rule,
          severity: rule.severity,
          message: `"${rule.name}": subject price ${subject.price.toFixed(2)} must be ≥ comparator price ${comparator.price.toFixed(2)}.`,
        });
      }
    } else if (rule.type === "parityDeviation") {
      // comparatorRefId holds a market code; compare the group's default (BU-wide,
      // no shop) price against its price in that market's shop(s).
      continue; // resolved with shop context in runMarketParityCheck (needs shops list)
    }
  }

  return violations;
}

// Separate entry point for parity checks, which need the shops list to find a
// market's shop(s) - kept apart so the pure product-vs-product checks above
// don't need shop data at all.
export function runParityChecks(
  catalog: CatalogIndex,
  overrides: PriceOverride[],
  consistencyRules: ConsistencyRule[],
  businessUnitId: string,
  shops: { id: string; market: string }[],
): ConsistencyViolation[] {
  const violations: ConsistencyViolation[] = [];
  for (const rule of consistencyRules) {
    if (rule.type !== "parityDeviation") continue;
    const productGroupId = rule.subjectRefId;
    const defaultResolved = resolveBasePrice(overrides, { productGroupId, productId: "", variantId: "", skuId: "" }, { businessUnitId });
    const marketShops = shops.filter((s) => s.market === rule.comparatorRefId);
    if (!defaultResolved || marketShops.length === 0) continue;
    for (const shop of marketShops) {
      const shopResolved = resolveBasePrice(overrides, { productGroupId, productId: "", variantId: "", skuId: "" }, { businessUnitId, shopId: shop.id });
      if (!shopResolved) continue;
      const deviationPercent = (Math.abs(shopResolved.price - defaultResolved.price) / defaultResolved.price) * 100;
      if (deviationPercent > rule.threshold) {
        violations.push({
          rule,
          severity: rule.severity,
          message: `"${rule.name}": ${rule.comparatorRefId} price ${shopResolved.price.toFixed(2)} deviates ${deviationPercent.toFixed(1)}% from default ${defaultResolved.price.toFixed(2)} (limit ${rule.threshold}%).`,
        });
      }
    }
  }
  return violations;
}
