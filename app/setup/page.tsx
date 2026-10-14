import {
  rules,
  discounts,
  components,
  commissions,
  priceOverrides,
  pricingCalendars,
  businessUnits,
  shops,
} from "@/lib/repo";
import { loadCatalog } from "@/lib/engine/catalog";
import { PageHeader } from "@/components/ui";
import PricingSetupWizard from "@/components/PricingSetupWizard";
import type { ScopeOption } from "@/components/DiscountEditor";

export default async function SetupPage() {
  const [allRules, allDiscounts, allComponents, allCommissions, allOverrides, calendars, bus, allShops, catalog] = await Promise.all([
    rules.all(),
    discounts.all(),
    components.all(),
    commissions.all(),
    priceOverrides.all(),
    pricingCalendars.all(),
    businessUnits.all(),
    shops.all(),
    loadCatalog(),
  ]);

  const scopeOptions: ScopeOption[] = [
    ...catalog.productGroups.map((g) => ({ label: `Group: ${g.name}`, level: "productGroup" as const, id: g.id })),
    ...catalog.products.map((p) => ({ label: `Product: ${p.name}`, level: "product" as const, id: p.id })),
    ...catalog.variants.map((v) => ({ label: `Variant: ${v.name}`, level: "variant" as const, id: v.id })),
    ...catalog.skus.map((s) => ({ label: `SKU: ${s.name}`, level: "sku" as const, id: s.id })),
  ];

  return (
    <div>
      <PageHeader
        title="Guided pricing setup"
        description="Set up pricing for a catalog level - product group, product, variant, or SKU - in the order the engine actually resolves it: base price, then the rules that attach discounts/components/commissions, then a live preview. Pick the broadest level that should share this pricing; it applies to every SKU beneath it via inheritance, so this scales to a large catalog without per-SKU setup. For mass repricing of SKUs that already have prices, use Bulk Operations instead. (This reflects what the engine actually does - unlike the Final-Price Composer, which documents an intended, not-yet-wired model.)"
        path="/setup"
      />
      <PricingSetupWizard
        catalog={catalog}
        scopeOptions={scopeOptions}
        rules={allRules}
        discounts={allDiscounts}
        components={allComponents}
        commissions={allCommissions}
        priceOverrides={allOverrides}
        calendars={calendars}
        businessUnits={bus}
        shops={allShops}
      />
    </div>
  );
}
