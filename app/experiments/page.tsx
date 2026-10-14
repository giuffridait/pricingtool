import { experiments, businessUnits } from "@/lib/repo";
import { loadCatalog, resolvePriceRole } from "@/lib/engine/catalog";
import { PageHeader } from "@/components/ui";
import ExperimentEditor from "@/components/ExperimentEditor";

export default async function ExperimentsPage() {
  const [allExperiments, bus, catalog] = await Promise.all([experiments.all(), businessUnits.all(), loadCatalog()]);

  const skuOptions = catalog.skus.map((sku) => {
    const variant = catalog.variants.find((v) => v.id === sku.variantId)!;
    const product = catalog.products.find((p) => p.id === variant.productId)!;
    return { id: sku.id, label: `${product.name} — ${variant.name} — ${sku.name}`, kvi: resolvePriceRole(product, sku) === "kvi" };
  });

  return (
    <div>
      <PageHeader
        title="Price experiments (A/B tests)"
        description="Define a control vs. challenger price for a SKU/market. The challenger is authored using the same price entities and must pass its margin floor before it's allowed to start."
        path="/experiments"
      />
      <ExperimentEditor experiments={allExperiments} skuOptions={skuOptions} businessUnits={bus} />
    </div>
  );
}
