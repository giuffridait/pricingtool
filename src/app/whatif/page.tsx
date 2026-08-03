import { businessUnits, shops } from "@/lib/repo";
import { loadCatalog, resolvePriceRole } from "@/lib/engine/catalog";
import { PageHeader } from "@/components/ui";
import WhatIfForm from "@/components/WhatIfForm";

export default async function WhatIfPage({
  searchParams,
}: {
  searchParams: Promise<{ skuId?: string }>;
}) {
  const { skuId } = await searchParams;
  const [bus, allShops, catalog] = await Promise.all([businessUnits.all(), shops.all(), loadCatalog()]);

  const skuOptions = catalog.skus.map((sku) => {
    const variant = catalog.variants.find((v) => v.id === sku.variantId)!;
    const product = catalog.products.find((p) => p.id === variant.productId)!;
    return { id: sku.id, label: `${product.name} — ${variant.name} — ${sku.name}`, kvi: resolvePriceRole(product, sku) === "kvi" };
  });

  return (
    <div>
      <PageHeader
        title="What-if & break-even"
        description="Explore a hypothetical price for a SKU: margin impact, required volume uplift to break even, distance to floor, and what a customer would actually pay once every eligible discount stacks - run through the real pricing engine, not a separate estimate. Margin math uses the SKU's floor as a proxy for cost (there's no real cost feed yet) unless you enter one below."
        path="/whatif"
      />
      <WhatIfForm skuOptions={skuOptions} businessUnits={bus} shops={allShops} initialSkuId={skuId} />
    </div>
  );
}
