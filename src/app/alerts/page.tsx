import { generateAlerts } from "@/lib/engine/alerts";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import AcknowledgeButton from "@/components/AcknowledgeButton";

export default async function AlertsPage() {
  const alerts = await generateAlerts();
  const sorted = [...alerts].sort((a, b) => {
    const rank = { critical: 0, warning: 1, info: 2 };
    if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
    return rank[a.severity] - rank[b.severity];
  });

  return (
    <div>
      <PageHeader
        title="Alerts & notifications"
        description="Sanity-check violations, price-architecture violations, expiring discounts/prices/rules, margin-floor risk, and scheduled activations due soon."
        path="/alerts"
      />
      <Card>
        {sorted.length === 0 ? (
          <EmptyState>No alerts.</EmptyState>
        ) : (
          <ul className="space-y-2 text-sm">
            {sorted.map((a) => (
              <li key={a.id} className={`flex items-start justify-between gap-3 border-b border-black/5 dark:border-white/5 pb-2 ${a.acknowledged ? "opacity-50" : ""}`}>
                <div className="flex items-start gap-2">
                  <Badge tone={a.severity}>{a.severity}</Badge>
                  <Badge tone="draft">{a.type}</Badge>
                  <span>{a.message}</span>
                </div>
                {!a.acknowledged && <AcknowledgeButton id={a.id} />}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
