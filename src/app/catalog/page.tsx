import { businessUnits, shops } from "@/lib/repo";
import { loadCatalog } from "@/lib/engine/catalog";
import { priceOverrides } from "@/lib/repo";
import { PageHeader, Card } from "@/components/ui";
import PriceOverrideEditor from "@/components/PriceOverrideEditor";

export default async function CatalogPage() {
  const [bus, allShops, catalog, overrides] = await Promise.all([
    businessUnits.all(),
    shops.all(),
    loadCatalog(),
    priceOverrides.all(),
  ]);

  return (
    <div>
      <PageHeader
        title="Catalog & pricing"
        description="Author base prices and overrides at product-group, product, variant, and SKU level, per business unit and (optionally) per shop. A child level with no override inherits from its parent; floor/ceiling walk the same chain."
      />
      <div className="space-y-4">
        {catalog.productGroups.map((pg) => (
          <Card key={pg.id} title={`Product group: ${pg.name}`}>
            <div className="pl-0 mb-2">
              <PriceOverrideEditor
                level="productGroup"
                refId={pg.id}
                businessUnits={bus}
                shops={allShops}
                overrides={overrides.filter((o) => o.level === "productGroup" && o.refId === pg.id)}
              />
            </div>
            <div className="pl-4 border-l border-black/10 dark:border-white/10 space-y-3">
              {catalog.products
                .filter((p) => p.productGroupId === pg.id)
                .map((product) => (
                  <div key={product.id}>
                    <div className="text-sm font-medium">
                      {product.name} <span className="text-neutral-500 text-xs">({product.productType})</span>
                    </div>
                    <PriceOverrideEditor
                      level="product"
                      refId={product.id}
                      businessUnits={bus}
                      shops={allShops}
                      overrides={overrides.filter((o) => o.level === "product" && o.refId === product.id)}
                    />
                    <div className="pl-4 border-l border-black/10 dark:border-white/10 space-y-2 mt-1">
                      {catalog.variants
                        .filter((v) => v.productId === product.id)
                        .map((variant) => (
                          <div key={variant.id}>
                            <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                              {variant.name} <span className="text-neutral-400">({variant.appearance})</span>
                            </div>
                            <PriceOverrideEditor
                              level="variant"
                              refId={variant.id}
                              businessUnits={bus}
                              shops={allShops}
                              overrides={overrides.filter((o) => o.level === "variant" && o.refId === variant.id)}
                            />
                            <div className="pl-4 border-l border-black/10 dark:border-white/10 space-y-1 mt-1">
                              {catalog.skus
                                .filter((s) => s.variantId === variant.id)
                                .map((sku) => (
                                  <div key={sku.id}>
                                    <div className="text-xs text-neutral-500">
                                      {sku.name} · cost basis {sku.costBasis.toFixed(2)}
                                    </div>
                                    <PriceOverrideEditor
                                      level="sku"
                                      refId={sku.id}
                                      businessUnits={bus}
                                      shops={allShops}
                                      overrides={overrides.filter((o) => o.level === "sku" && o.refId === sku.id)}
                                    />
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
