import type { DiscountScope } from "../types";

// Catalog scopes are hierarchical containment, not flat equality: a scope of
// {productId: X} covers every variant/SKU under product X. The most specific
// non-empty field on the scope determines both eligibility and rank.

export function scopeSpecificity(
  scope: DiscountScope,
  ids: { productGroupId: string; productId: string; variantId: string; skuId: string },
): number | null {
  if (scope.skuId) return scope.skuId === ids.skuId ? 4 : null;
  if (scope.variantId) return scope.variantId === ids.variantId ? 3 : null;
  if (scope.productId) return scope.productId === ids.productId ? 2 : null;
  if (scope.productGroupId) return scope.productGroupId === ids.productGroupId ? 1 : null;
  return 0; // empty scope = applies globally
}
