import { discounts } from "@/lib/repo";
import { loadCatalog } from "@/lib/engine/catalog";
import { PageHeader } from "@/components/ui";
import DiscountEditor, { type ScopeOption } from "@/components/DiscountEditor";

export default async function DiscountsPage() {
  const [all, catalog] = await Promise.all([discounts.all(), loadCatalog()]);

  const scopeOptions: ScopeOption[] = [
    ...catalog.productGroups.map((g) => ({ label: `Group: ${g.name}`, level: "productGroup" as const, id: g.id })),
    ...catalog.products.map((p) => ({ label: `Product: ${p.name}`, level: "product" as const, id: p.id })),
    ...catalog.variants.map((v) => ({ label: `Variant: ${v.name}`, level: "variant" as const, id: v.id })),
    ...catalog.skus.map((s) => ({ label: `SKU: ${s.name}`, level: "sku" as const, id: s.id })),
  ];

  return (
    <div>
      <PageHeader
        title="Discount management"
        description="Discounts are first-class, reusable entities sharing one model - mechanism/type, value, scope, eligibility, validity, stacking group, priority and presentation badge - whether they're a coupon, a volume tier, or a BOGO. A pricing rule (see Rules) decides when a discount is eligible to apply to a request."
      />
      <DiscountEditor discounts={all} scopeOptions={scopeOptions} />
    </div>
  );
}
