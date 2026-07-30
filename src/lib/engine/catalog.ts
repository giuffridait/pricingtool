import type { ProductGroup, Product, Variant, Sku } from "../types";
import { productGroups, products, variants, skus } from "../repo";

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
