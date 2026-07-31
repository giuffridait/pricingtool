import { priceLists, businessUnits } from "@/lib/repo";
import { loadCatalog } from "@/lib/engine/catalog";
import { PageHeader } from "@/components/ui";
import PriceListEditor from "@/components/PriceListEditor";

export default async function PriceListsPage() {
  const [allPriceLists, bus, catalog] = await Promise.all([priceLists.all(), businessUnits.all(), loadCatalog()]);

  const skuOptions = catalog.skus.map((sku) => {
    const variant = catalog.variants.find((v) => v.id === sku.variantId)!;
    const product = catalog.products.find((p) => p.id === variant.productId)!;
    return { id: sku.id, label: `${product.name} — ${variant.name} — ${sku.name}` };
  });

  return (
    <div>
      <PageHeader
        title="B2B / customer-group price lists"
        description="Reusable named price lists for customer groups, with validity dates, currency, and priority versus standard pricing. A matching list replaces the catalog base price for that customer group - test it in the Price Calculator by setting the Customer group field to a list's customer group."
      />
      <PriceListEditor priceLists={allPriceLists} skuOptions={skuOptions} businessUnits={bus} />
    </div>
  );
}
