import { Fragment } from "react";
import { businessUnits, shops, priceOverrides } from "@/lib/repo";
import { loadCatalog } from "@/lib/engine/catalog";
import { resolveBasePrice } from "@/lib/engine/base";
import { PageHeader, Card, Badge } from "@/components/ui";
import PriceOverrideEditor from "@/components/PriceOverrideEditor";

function effectiveBadge(
  overrides: Parameters<typeof resolveBasePrice>[0],
  ids: { productGroupId: string; productId: string; variantId: string; skuId: string },
  businessUnitId: string,
) {
  const resolved = resolveBasePrice(overrides, ids, { businessUnitId });
  if (!resolved) return <Badge tone="critical">no price</Badge>;
  return (
    <span className="text-sm">
      <span className="font-medium">
        {resolved.currency} {resolved.price.toFixed(2)}
      </span>{" "}
      <Badge tone={resolved.shopSpecific ? "active" : resolved.level === "sku" || resolved.level === "variant" ? "approved" : "draft"}>
        {resolved.shopSpecific ? "shop override" : resolved.level}
      </Badge>
      {resolved.floor !== undefined && <span className="text-neutral-400 text-xs"> · floor {resolved.floor}</span>}
      {resolved.ceiling !== undefined && <span className="text-neutral-400 text-xs"> · ceiling {resolved.ceiling}</span>}
    </span>
  );
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQuery } = await searchParams;
  const [bus, allShops, catalog, overrides] = await Promise.all([
    businessUnits.all(),
    shops.all(),
    loadCatalog(),
    priceOverrides.all(),
  ]);

  const query = (rawQuery ?? "").trim().toLowerCase();
  const allRows = catalog.skus.map((sku) => {
    const variant = catalog.variants.find((v) => v.id === sku.variantId)!;
    const product = catalog.products.find((p) => p.id === variant.productId)!;
    const productGroup = catalog.productGroups.find((g) => g.id === product.productGroupId)!;
    return { sku, variant, product, productGroup };
  });
  const rows = query
    ? allRows.filter((r) => [r.productGroup.name, r.product.name, r.variant.name, r.sku.name].some((n) => n.toLowerCase().includes(query)))
    : allRows;
  const searching = query.length > 0;

  const groupIds = [...new Set(rows.map((r) => r.productGroup.id))];

  return (
    <div>
      <PageHeader
        title="Catalog & pricing"
        description="Author base prices and overrides at product-group, product, variant, and SKU level, per business unit and (optionally) per shop. Each row shows the effective price and which level actually supplies it - a child level with no override inherits from its parent, and floor/ceiling walk the same chain."
        path="/catalog"
      />

      <form className="mb-4">
        <input
          type="search"
          name="q"
          defaultValue={rawQuery ?? ""}
          placeholder="Search product group, product, variant, or SKU…"
          className="border border-black/10 dark:border-white/10 rounded px-3 py-1.5 text-sm bg-transparent w-full max-w-md"
        />
      </form>

      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-500 italic">No catalog items match &quot;{rawQuery}&quot;.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {groupIds.map((pgId) => {
            const productGroup = rows.find((r) => r.productGroup.id === pgId)!.productGroup;
            const groupRows = rows.filter((r) => r.productGroup.id === pgId);
            const productIds = [...new Set(groupRows.map((r) => r.product.id))];
            const groupIds4 = { productGroupId: productGroup.id, productId: "", variantId: "", skuId: "" };

            return (
              <Card key={productGroup.id}>
                <details open={searching}>
                  <summary className="cursor-pointer flex items-center justify-between flex-wrap gap-2 list-none">
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{productGroup.name}</span>
                      <span className="text-xs text-neutral-400">{bus.find((b) => b.id === productGroup.businessUnitId)?.name}</span>
                      <span className="text-xs text-neutral-400">· {productIds.length} product{productIds.length === 1 ? "" : "s"}</span>
                    </span>
                    {effectiveBadge(overrides, groupIds4, productGroup.businessUnitId)}
                  </summary>

                  <div className="mt-3 pl-3 border-l border-black/10 dark:border-white/10 space-y-1">
                    <PriceOverrideEditor
                      level="productGroup"
                      refId={productGroup.id}
                      businessUnits={bus}
                      shops={allShops.filter((s) => s.businessUnitId === productGroup.businessUnitId)}
                      overrides={overrides.filter((o) => o.level === "productGroup" && o.refId === productGroup.id)}
                    />
                  </div>

                  <div className="mt-3 space-y-2">
                    {productIds.map((productId) => {
                      const product = groupRows.find((r) => r.product.id === productId)!.product;
                      const productRows = groupRows.filter((r) => r.product.id === productId);
                      const productIds4 = { productGroupId: productGroup.id, productId: product.id, variantId: "", skuId: "" };
                      const variantIds = [...new Set(productRows.map((r) => r.variant.id))];

                      return (
                        <details key={product.id} open={searching} className="rounded border border-black/5 dark:border-white/5 p-2">
                          <summary className="cursor-pointer flex items-center justify-between flex-wrap gap-2 list-none">
                            <span>
                              {product.name} <span className="text-xs text-neutral-400">({product.productType})</span>
                            </span>
                            {effectiveBadge(overrides, productIds4, productGroup.businessUnitId)}
                          </summary>

                          <div className="mt-2 pl-3 border-l border-black/10 dark:border-white/10">
                            <PriceOverrideEditor
                              level="product"
                              refId={product.id}
                              businessUnits={bus}
                              shops={allShops.filter((s) => s.businessUnitId === productGroup.businessUnitId)}
                              overrides={overrides.filter((o) => o.level === "product" && o.refId === product.id)}
                            />
                          </div>

                          <table className="w-full text-sm mt-2">
                            <tbody>
                              {variantIds.map((variantId) => {
                                const variant = productRows.find((r) => r.variant.id === variantId)!.variant;
                                const variantSkuRows = productRows.filter((r) => r.variant.id === variantId);
                                const variantIds4 = { productGroupId: productGroup.id, productId: product.id, variantId: variant.id, skuId: "" };
                                return (
                                  <Fragment key={variant.id}>
                                    <tr className="border-t border-black/5 dark:border-white/5">
                                      <td className="py-1.5 pr-2 font-medium">
                                        {variant.name} <span className="text-xs text-neutral-400">({variant.appearance})</span>
                                      </td>
                                      <td className="py-1.5">{effectiveBadge(overrides, variantIds4, productGroup.businessUnitId)}</td>
                                      <td className="py-1.5">
                                        <PriceOverrideEditor
                                          level="variant"
                                          refId={variant.id}
                                          businessUnits={bus}
                                          shops={allShops.filter((s) => s.businessUnitId === productGroup.businessUnitId)}
                                          overrides={overrides.filter((o) => o.level === "variant" && o.refId === variant.id)}
                                        />
                                      </td>
                                    </tr>
                                    {variantSkuRows.map(({ sku }) => {
                                      const skuIds4 = { productGroupId: productGroup.id, productId: product.id, variantId: variant.id, skuId: sku.id };
                                      return (
                                        <tr key={sku.id} className="border-t border-black/5 dark:border-white/5 text-neutral-600 dark:text-neutral-400">
                                          <td className="py-1.5 pr-2 pl-4">
                                            {sku.name} <span className="text-xs text-neutral-400">· cost {sku.costBasis.toFixed(2)}</span>
                                          </td>
                                          <td className="py-1.5">{effectiveBadge(overrides, skuIds4, productGroup.businessUnitId)}</td>
                                          <td className="py-1.5">
                                            <PriceOverrideEditor
                                              level="sku"
                                              refId={sku.id}
                                              businessUnits={bus}
                                              shops={allShops.filter((s) => s.businessUnitId === productGroup.businessUnitId)}
                                              overrides={overrides.filter((o) => o.level === "sku" && o.refId === sku.id)}
                                            />
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </details>
                      );
                    })}
                  </div>
                </details>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
