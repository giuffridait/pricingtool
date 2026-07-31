import { businessUnits, shops } from "@/lib/repo";
import { loadCatalog } from "@/lib/engine/catalog";
import { PageHeader } from "@/components/ui";
import BasketCalculatorForm from "@/components/BasketCalculatorForm";

export default async function BasketPage() {
  const [bus, allShops, catalog] = await Promise.all([businessUnits.all(), shops.all(), loadCatalog()]);

  const skuOptions = catalog.skus.map((sku) => {
    const variant = catalog.variants.find((v) => v.id === sku.variantId)!;
    const product = catalog.products.find((p) => p.id === variant.productId)!;
    return { id: sku.id, label: `${product.name} — ${variant.name} — ${sku.name}` };
  });

  return (
    <div>
      <PageHeader
        title="Basket calculator"
        description="Resolves a multi-line order: each line through the same engine as the Price Calculator, then bundles and mix-and-match sets consume matching units at a fixed price, and finally an order-value basket discount applies on top - stacking against line-level discounts by priority."
      />
      <BasketCalculatorForm skuOptions={skuOptions} businessUnits={bus} shops={allShops} />
    </div>
  );
}
