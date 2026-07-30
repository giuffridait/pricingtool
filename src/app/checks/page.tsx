import { businessUnits, shops, consistencyRules, discounts, rules, priceOverrides } from "@/lib/repo";
import { loadCatalog } from "@/lib/engine/catalog";
import { runConsistencyChecks, runParityChecks } from "@/lib/engine/consistency";
import { runSanityChecks } from "@/lib/engine/sanity";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import ConsistencyRuleEditor, { type RefOption } from "@/components/ConsistencyRuleEditor";

export default async function ChecksPage() {
  const [bus, allShops, allConsistencyRules, allDiscounts, allRules, overrides, catalog] = await Promise.all([
    businessUnits.all(),
    shops.all(),
    consistencyRules.all(),
    discounts.all(),
    rules.all(),
    priceOverrides.all(),
    loadCatalog(),
  ]);
  const bu = bus[0];

  const violations = [
    ...runConsistencyChecks(catalog, overrides, allConsistencyRules, bu.id),
    ...runParityChecks(catalog, overrides, allConsistencyRules, bu.id, allShops),
  ];
  const violationMessages: Record<string, string[]> = {};
  for (const v of violations) {
    (violationMessages[v.rule.id] ??= []).push(v.message);
  }

  const sanityFindings = runSanityChecks(catalog, overrides, allRules, allDiscounts, allShops, bu.id);

  const refOptions: RefOption[] = [
    ...catalog.productGroups.map((g) => ({ label: `Group: ${g.name}`, id: g.id })),
    ...catalog.products.map((p) => ({ label: `Product: ${p.name}`, id: p.id })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consistency & sanity checks"
        description="Consistency rules validate intended price relationships (gaps, ordering, parity) at save/activation time - they never select a runtime price. Cross-SKU sanity checks are built-in detectors that scan the whole catalog for anomalies; detection only, never blocking."
      />

      <ConsistencyRuleEditor rules={allConsistencyRules} refOptions={refOptions} violationMessages={violationMessages} />

      <Card title="Cross-SKU sanity findings">
        {sanityFindings.length === 0 ? (
          <EmptyState>No anomalies detected.</EmptyState>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {sanityFindings.map((f) => (
              <li key={f.id} className="flex items-start gap-2">
                <Badge tone={f.severity}>{f.severity}</Badge>
                <span>{f.message}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
