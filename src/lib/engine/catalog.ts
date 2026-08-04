import type { ProductGroup, Product, Variant, Sku, PriceRole, PriceOverride } from "../types";
import { productGroups, products, variants, skus } from "../repo";

export { resolveScopeAncestors, scopeAppliesToAncestors, skusUnderScope, type ScopeAncestors } from "./scopeTree";

// Resolves a SKU's full ancestor chain and the "dimension bag" (productType,
// appearance, size) that catalog nodes contribute to rule/component matching.

export interface CatalogNode {
  sku: Sku;
  variant: Variant;
  product: Product;
  productGroup: ProductGroup;
}

export interface CatalogIndex {
  productGroups: ProductGroup[];
  products: Product[];
  variants: Variant[];
  skus: Sku[];
}

export async function loadCatalog(): Promise<CatalogIndex> {
  const [pgs, prods, vars, sks] = await Promise.all([
    productGroups.all(),
    products.all(),
    variants.all(),
    skus.all(),
  ]);
  return { productGroups: pgs, products: prods, variants: vars, skus: sks };
}

export function resolveNode(catalog: CatalogIndex, skuId: string): CatalogNode | null {
  const sku = catalog.skus.find((s) => s.id === skuId);
  if (!sku) return null;
  const variant = catalog.variants.find((v) => v.id === sku.variantId);
  if (!variant) return null;
  const product = catalog.products.find((p) => p.id === variant.productId);
  if (!product) return null;
  const productGroup = catalog.productGroups.find((g) => g.id === product.productGroupId);
  if (!productGroup) return null;
  return { sku, variant, product, productGroup };
}

export function nodeIds(node: CatalogNode) {
  return {
    productGroupId: node.productGroup.id,
    productId: node.product.id,
    variantId: node.variant.id,
    skuId: node.sku.id,
  };
}

export function nodeDimensions(node: CatalogNode) {
  return {
    productType: node.product.productType,
    appearance: node.variant.appearance,
    size: node.sku.size,
  };
}

// Sku.priceRole overrides Product.priceRole when set; neither set means
// "standard". Same fallback direction as base-price inheritance (child wins
// when it has an opinion, otherwise defer to the parent).
export function resolvePriceRole(product: Product, sku?: Sku): PriceRole {
  return sku?.priceRole ?? product.priceRole ?? "standard";
}

// Resolves whether a price-override touches a KVI-tagged product (or, for a
// sku-level override, a KVI-tagged SKU specifically via inheritance),
// returning a label for display or null if it didn't. Shared by the alerts
// engine and the Versions page so "does this changeset touch a KVI" is
// answered the same way in both places.
export function kviLabelForOverride(catalog: CatalogIndex, override: PriceOverride): string | null {
  if (override.level === "sku") {
    const sku = catalog.skus.find((s) => s.id === override.refId);
    const variant = sku && catalog.variants.find((v) => v.id === sku.variantId);
    const product = variant && catalog.products.find((p) => p.id === variant.productId);
    if (!sku || !product || resolvePriceRole(product, sku) !== "kvi") return null;
    return `${product.name} ${sku.name}`;
  }
  if (override.level === "variant") {
    const variant = catalog.variants.find((v) => v.id === override.refId);
    const product = variant && catalog.products.find((p) => p.id === variant.productId);
    if (!variant || !product || resolvePriceRole(product) !== "kvi") return null;
    return `${product.name} (${variant.name})`;
  }
  if (override.level === "product") {
    const product = catalog.products.find((p) => p.id === override.refId);
    if (!product || resolvePriceRole(product) !== "kvi") return null;
    return product.name;
  }
  const kviProduct = catalog.products.find((p) => p.productGroupId === override.refId && resolvePriceRole(p) === "kvi");
  return kviProduct ? `${kviProduct.name} (via product group)` : null;
}
