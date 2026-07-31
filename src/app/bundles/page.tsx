import { bundles, mixAndMatchSets, businessUnits } from "@/lib/repo";
import { loadCatalog } from "@/lib/engine/catalog";
import { PageHeader } from "@/components/ui";
import BundleEditor from "@/components/BundleEditor";
import MixAndMatchEditor from "@/components/MixAndMatchEditor";

export default async function BundlesPage() {
  const [allBundles, allSets, bus, catalog] = await Promise.all([
    bundles.all(),
    mixAndMatchSets.all(),
    businessUnits.all(),
    loadCatalog(),
  ]);

  const skuOptions = catalog.skus.map((sku) => {
    const variant = catalog.variants.find((v) => v.id === sku.variantId)!;
    const product = catalog.products.find((p) => p.id === variant.productId)!;
    return { id: sku.id, label: `${product.name} — ${variant.name} — ${sku.name}` };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bundles & mix-and-match"
        description="Bundle / set pricing is composition-based: it fires only when the basket contains at least the exact SKUs and quantities required, pricing just those matched units at a fixed bundle price - any extra units price normally. Mix-and-match is group-based: any N units from a group (a whole product group, or a hand-picked list of products) for a flat set price. Both are evaluated in the Basket Calculator, which supports multiple order lines."
      />
      <BundleEditor bundles={allBundles} skuOptions={skuOptions} businessUnits={bus} />
      <MixAndMatchEditor sets={allSets} productGroups={catalog.productGroups} products={catalog.products} businessUnits={bus} />
    </div>
  );
}
