import { presentationPolicies, businessUnits, shops } from "@/lib/repo";
import { loadCatalog } from "@/lib/engine/catalog";
import { PageHeader } from "@/components/ui";
import PresentationPolicyEditor from "@/components/PresentationPolicyEditor";
import PresentationPreview from "@/components/PresentationPreview";

export default async function PresentationPage() {
  const [policies, bus, allShops, catalog] = await Promise.all([
    presentationPolicies.all(),
    businessUnits.all(),
    shops.all(),
    loadCatalog(),
  ]);

  const skuOptions = catalog.skus.map((sku) => {
    const variant = catalog.variants.find((v) => v.id === sku.variantId)!;
    const product = catalog.products.find((p) => p.id === variant.productId)!;
    return { id: sku.id, label: `${product.name} — ${variant.name} — ${sku.name}` };
  });
  const productOptions = catalog.products.map((p) => ({ id: p.id, label: p.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer-facing price & discount presentation"
        description="Presentation is configured separately from the paid price: RRP strikethrough, discount badges, psychological rounding, and savings messaging. A policy controls how a resolved price gets displayed - it never changes what's actually charged."
      />
      <PresentationPolicyEditor policies={policies} businessUnits={bus} shops={allShops} />
      <PresentationPreview skuOptions={skuOptions} productOptions={productOptions} businessUnits={bus} shops={allShops} />
    </div>
  );
}
