import { allVersions } from "@/lib/engine/versions";
import type { VersionedEntityType } from "@/lib/engine/versions";
import { loadCatalog, kviLabelForOverride } from "@/lib/engine/catalog";
import type { PriceOverride } from "@/lib/types";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import VersionActions from "@/components/VersionActions";

function summarize(payload: unknown): string {
  if (payload === null) return "(deleted)";
  if (typeof payload === "object" && payload !== null) {
    const p = payload as Record<string, unknown>;
    if ("name" in p) return String(p.name);
    if ("price" in p) return `price ${p.price}`;
  }
  return JSON.stringify(payload).slice(0, 80);
}

export default async function VersionsPage() {
  const [versions, catalog] = await Promise.all([allVersions(), loadCatalog()]);
  const byEntity = new Map<string, typeof versions>();
  for (const v of versions) {
    const key = `${v.entityType}:${v.entityId}`;
    byEntity.set(key, [...(byEntity.get(key) ?? []), v]);
  }

  return (
    <div>
      <PageHeader
        title="Version control & scheduling"
        description="Every price/discount/component/rule/consistency-rule edit is versioned: draft → approve → activate (or schedule for later) → revert. This is the full history across all entity types."
        path="/versions"
      />
      <Card>
        {versions.length === 0 ? (
          <EmptyState>No versions yet.</EmptyState>
        ) : (
          <div className="space-y-4">
            {[...byEntity.entries()].map(([key, list]) => {
              const [entityType, entityId] = key.split(":") as [VersionedEntityType, string];
              const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              return (
                <div key={key} className="border-t border-black/5 dark:border-white/5 pt-2">
                  <div className="text-xs text-neutral-500 mb-1">
                    {entityType} · {entityId}
                  </div>
                  <ul className="space-y-1">
                    {sorted.map((v, i) => {
                      const kviLabel = entityType === "priceOverride" && v.payload ? kviLabelForOverride(catalog, v.payload as PriceOverride) : null;
                      return (
                        <li key={v.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Badge tone={v.status}>{v.status}</Badge>
                            {kviLabel && <Badge tone="warning">touches KVI: {kviLabel}</Badge>}
                            <span>{summarize(v.payload)}</span>
                            {v.note && <span className="text-neutral-500 text-xs">— {v.note}</span>}
                            <span className="text-neutral-400 text-xs">{new Date(v.createdAt).toLocaleString()}</span>
                          </div>
                          <VersionActions versionId={v.id} entityType={entityType} entityId={entityId} status={v.status} hasPrevious={i < sorted.length - 1 || !!v.previousVersionId} />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
