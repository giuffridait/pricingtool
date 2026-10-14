import { discounts, pricingCalendars, bundles, mixAndMatchSets, businessUnits } from "@/lib/repo";
import { loadCatalog } from "@/lib/engine/catalog";
import { PageHeader } from "@/components/ui";
import DiscountEditor, { type ScopeOption } from "@/components/DiscountEditor";
import BundleEditor from "@/components/BundleEditor";
import MixAndMatchEditor from "@/components/MixAndMatchEditor";

export default async function IncentivesPage() {
  const [all, catalog, calendars, allBundles, allSets, bus] = await Promise.all([
    discounts.all(),
    loadCatalog(),
    pricingCalendars.all(),
    bundles.all(),
    mixAndMatchSets.all(),
    businessUnits.all(),
  ]);

  const scopeOptions: ScopeOption[] = [
    ...catalog.productGroups.map((g) => ({ label: `Group: ${g.name}`, level: "productGroup" as const, id: g.id })),
    ...catalog.products.map((p) => ({ label: `Product: ${p.name}`, level: "product" as const, id: p.id })),
    ...catalog.variants.map((v) => ({ label: `Variant: ${v.name}`, level: "variant" as const, id: v.id })),
    ...catalog.skus.map((s) => ({ label: `SKU: ${s.name}`, level: "sku" as const, id: s.id })),
  ];
  const skuOptions = catalog.skus.map((sku) => {
    const variant = catalog.variants.find((v) => v.id === sku.variantId)!;
    const product = catalog.products.find((p) => p.id === variant.productId)!;
    return { id: sku.id, label: `${product.name} — ${variant.name} — ${sku.name}` };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discounts & incentives"
        description="Every promotional mechanism a shopper experiences as 'a deal' lives here - discounts, bundles, and mix-and-match today, with room to grow into loyalty rewards, referral credits, and similar mechanics. Discounts (coupons, volume tiers, BOGO, basket-value) are reusable entities sharing one model - mechanism/type, value, scope, eligibility, validity, stacking group, priority, badge - matched to a request via a pricing rule (see Rules). Bundles and mix-and-match work differently under the hood (they match a combination of SKUs across the whole basket rather than discounting one line), but they're grouped here because they're the same kind of thing to whoever's setting up a promotion."
        path="/incentives"
      />
      <DiscountEditor discounts={all} scopeOptions={scopeOptions} calendars={calendars} />
      <BundleEditor bundles={allBundles} skuOptions={skuOptions} businessUnits={bus} />
      <MixAndMatchEditor sets={allSets} productGroups={catalog.productGroups} products={catalog.products} businessUnits={bus} />
    </div>
  );
}
