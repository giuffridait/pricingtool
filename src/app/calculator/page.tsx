import { businessUnits, shops } from "@/lib/repo";
import { loadCatalog } from "@/lib/engine/catalog";
import { PageHeader } from "@/components/ui";
import PriceCalculatorForm from "@/components/PriceCalculatorForm";

export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ skuId?: string }>;
}) {
  const { skuId } = await searchParams;
  const [bus, allShops, catalog] = await Promise.all([businessUnits.all(), shops.all(), loadCatalog()]);

  const skuOptions = catalog.skus.map((sku) => {
    const variant = catalog.variants.find((v) => v.id === sku.variantId)!;
    const product = catalog.products.find((p) => p.id === variant.productId)!;
    return { id: sku.id, label: `${product.name} — ${variant.name} — ${sku.name}` };
  });

  return (
    <div>
      <PageHeader
        title="Price & basket calculator"
        description="Runs a live pricing request through the resolution engine and shows the full trace: which base price/override was used, which rule replaced it, which components and discounts applied (and which were excluded by stacking rules), and any floor/ceiling safeguard."
      />
      <PriceCalculatorForm skuOptions={skuOptions} businessUnits={bus} shops={allShops} initialSkuId={skuId} />
    </div>
  );
}
