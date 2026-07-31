import { rules, discounts, components, commissions, businessUnits, shops, pricingCalendars } from "@/lib/repo";
import { loadCatalog } from "@/lib/engine/catalog";
import { PageHeader } from "@/components/ui";
import RuleEditor from "@/components/RuleEditor";
import type { ScopeOption } from "@/components/DiscountEditor";

export default async function RulesPage() {
  const [allRules, allDiscounts, allComponents, allCommissions, bus, allShops, catalog, calendars] = await Promise.all([
    rules.all(),
    discounts.all(),
    components.all(),
    commissions.all(),
    businessUnits.all(),
    shops.all(),
    loadCatalog(),
    pricingCalendars.all(),
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
        title="Pricing rule model & resolution policies"
        description="Rules decide which price/component/discount/commission effect applies to a given request at runtime. Matching is by catalog scope + dimensions (BU, shop, market, channel, customer group, ...); the highest-priority, most-specific match wins. Use the Price Calculator to see the full resolution trace for a given SKU/context."
        path="/rules"
      />
      <RuleEditor
        rules={allRules}
        scopeOptions={scopeOptions}
        businessUnits={bus}
        shops={allShops}
        discounts={allDiscounts}
        components={allComponents}
        commissions={allCommissions}
        calendars={calendars}
      />
    </div>
  );
}
