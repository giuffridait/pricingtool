import type { CatalogLevel, DiscountScope, ProductGroup, Product, Variant, Sku } from "../types";

// Pure catalog-tree helpers with no dependency on ../repo (unlike catalog.ts),
// so they're safe to import from client components - the guided setup
// wizard runs this scope math in the browser against catalog data it
// already has as props.

export interface CatalogIndexLike {
  productGroups: ProductGroup[];
  products: Product[];
  variants: Variant[];
  skus: Sku[];
}

// Resolves the ancestor-id chain for a chosen catalog scope, regardless of
// which level was picked - a productGroup scope only fills in
// productGroupId, a sku scope fills in the whole chain. Used by the guided
// setup wizard to answer "what already applies to everything under this
// scope" without accidentally pulling in a sibling's narrower override.
export interface ScopeAncestors {
  productGroupId?: string;
  productId?: string;
  variantId?: string;
  skuId?: string;
}

export function resolveScopeAncestors(catalog: CatalogIndexLike, level: CatalogLevel, id: string): ScopeAncestors {
  if (level === "productGroup") return { productGroupId: id };
  if (level === "product") {
    const product = catalog.products.find((p) => p.id === id);
    return { productGroupId: product?.productGroupId, productId: id };
  }
  if (level === "variant") {
    const variant = catalog.variants.find((v) => v.id === id);
    const product = variant && catalog.products.find((p) => p.id === variant.productId);
    return { productGroupId: product?.productGroupId, productId: product?.id, variantId: id };
  }
  const sku = catalog.skus.find((s) => s.id === id);
  const variant = sku && catalog.variants.find((v) => v.id === sku.variantId);
  const product = variant && catalog.products.find((p) => p.id === variant.productId);
  return { productGroupId: product?.productGroupId, productId: product?.id, variantId: variant?.id, skuId: id };
}

// True when a rule/discount scope applies to every descendant of the chosen
// scope (i.e. it's scoped at this level or a coarser ancestor of it) -
// narrower scopes belonging to a sibling or a specific child are excluded,
// since those aren't part of *this* level's setup.
export function scopeAppliesToAncestors(scope: DiscountScope, ancestors: ScopeAncestors): boolean {
  if (scope.skuId) return scope.skuId === ancestors.skuId;
  if (scope.variantId) return scope.variantId === ancestors.variantId;
  if (scope.productId) return scope.productId === ancestors.productId;
  if (scope.productGroupId) return scope.productGroupId === ancestors.productGroupId;
  return true; // empty scope = global
}

// All SKUs contained under a chosen catalog scope - the set a guided setup
// step actually affects, and what a live preview samples from.
export function skusUnderScope(catalog: CatalogIndexLike, level: CatalogLevel, id: string): Sku[] {
  if (level === "sku") {
    const sku = catalog.skus.find((s) => s.id === id);
    return sku ? [sku] : [];
  }
  if (level === "variant") return catalog.skus.filter((s) => s.variantId === id);
  if (level === "product") {
    const variantIds = new Set(catalog.variants.filter((v) => v.productId === id).map((v) => v.id));
    return catalog.skus.filter((s) => variantIds.has(s.variantId));
  }
  const productIds = new Set(catalog.products.filter((p) => p.productGroupId === id).map((p) => p.id));
  const variantIds = new Set(catalog.variants.filter((v) => productIds.has(v.productId)).map((v) => v.id));
  return catalog.skus.filter((s) => variantIds.has(s.variantId));
}

// Picks up to n SKUs favoring variety over the catalog's natural array order
// (which tends to cluster same-product, same-variant, different-size SKUs
// that all price identically) - one per distinct product first, then one per
// distinct variant, then whatever's left. Meant as a starting point for a
// live preview; callers can still let someone override the picks.
export function pickDiverseSkus(skus: Sku[], catalog: CatalogIndexLike, n: number): Sku[] {
  if (skus.length <= n) return skus;
  const variantToProduct = new Map(catalog.variants.map((v) => [v.id, v.productId]));
  const picked: Sku[] = [];
  const seenProducts = new Set<string>();
  const seenVariants = new Set<string>();

  for (const sku of skus) {
    if (picked.length >= n) break;
    const productId = variantToProduct.get(sku.variantId);
    if (productId && !seenProducts.has(productId)) {
      seenProducts.add(productId);
      seenVariants.add(sku.variantId);
      picked.push(sku);
    }
  }
  for (const sku of skus) {
    if (picked.length >= n) break;
    if (picked.includes(sku)) continue;
    if (!seenVariants.has(sku.variantId)) {
      seenVariants.add(sku.variantId);
      picked.push(sku);
    }
  }
  for (const sku of skus) {
    if (picked.length >= n) break;
    if (!picked.includes(sku)) picked.push(sku);
  }
  return picked;
}
