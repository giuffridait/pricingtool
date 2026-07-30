import type { EntityVersion, VersionStatus } from "../types";
import { versions, priceOverrides, discounts, components, rules, consistencyRules } from "../repo";
import { newId } from "../store";

// Draft -> (review) -> approved -> (scheduled) -> active -> reverted workflow,
// generic across every editable entity type (price overrides, discounts,
// components, rules, consistency rules). `payload: null` means "delete this
// entity" when activated.

export type VersionedEntityType = "priceOverride" | "discount" | "component" | "rule" | "consistencyRule";

const SAVERS: Record<VersionedEntityType, (payload: unknown) => Promise<unknown>> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  priceOverride: (p) => priceOverrides.save(p as any),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  discount: (p) => discounts.save(p as any),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: (p) => components.save(p as any),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rule: (p) => rules.save(p as any),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  consistencyRule: (p) => consistencyRules.save(p as any),
};

const REMOVERS: Record<VersionedEntityType, (id: string) => Promise<void>> = {
  priceOverride: priceOverrides.remove,
  discount: discounts.remove,
  component: components.remove,
  rule: rules.remove,
  consistencyRule: consistencyRules.remove,
};

async function latestActiveVersion(entityType: string, entityId: string): Promise<EntityVersion | undefined> {
  const all = await versions.all();
  return all
    .filter((v) => v.entityType === entityType && v.entityId === entityId && v.status === "active")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

export async function createVersion(
  entityType: VersionedEntityType,
  entityId: string,
  payload: unknown,
  opts: { status?: VersionStatus; note?: string; scheduledFor?: string; createdBy?: string; id?: string } = {},
): Promise<EntityVersion> {
  const previous = await latestActiveVersion(entityType, entityId);
  const version: EntityVersion = {
    id: opts.id ?? newId("ver"),
    entityType,
    entityId,
    status: opts.status ?? "draft",
    payload,
    createdAt: new Date().toISOString(),
    createdBy: opts.createdBy ?? "pricing-manager",
    previousVersionId: previous?.id,
    scheduledFor: opts.scheduledFor,
    note: opts.note,
  };
  await versions.save(version);
  return version;
}

export async function setStatus(versionId: string, status: VersionStatus): Promise<EntityVersion | null> {
  const all = await versions.all();
  const version = all.find((v) => v.id === versionId);
  if (!version) return null;
  const updated: EntityVersion = { ...version, status };
  await versions.save(updated);
  return updated;
}

export async function activate(versionId: string): Promise<EntityVersion | null> {
  const all = await versions.all();
  const version = all.find((v) => v.id === versionId);
  if (!version) return null;
  const entityType = version.entityType as VersionedEntityType;
  if (version.payload === null) {
    await REMOVERS[entityType](version.entityId);
  } else {
    await SAVERS[entityType](version.payload);
  }
  const activated: EntityVersion = { ...version, status: "active", activatedAt: new Date().toISOString() };
  await versions.save(activated);
  return activated;
}

// Called opportunistically (page load / server action) to mock a scheduler:
// activates any approved-and-scheduled version whose time has come.
export async function runDueScheduledActivations(): Promise<EntityVersion[]> {
  const all = await versions.all();
  const due = all.filter((v) => v.status === "scheduled" && v.scheduledFor && new Date(v.scheduledFor) <= new Date());
  const activated: EntityVersion[] = [];
  for (const v of due) {
    const result = await activate(v.id);
    if (result) activated.push(result);
  }
  return activated;
}

export async function revert(entityType: VersionedEntityType, entityId: string): Promise<EntityVersion | null> {
  const current = await latestActiveVersion(entityType, entityId);
  if (!current?.previousVersionId) return null;
  const all = await versions.all();
  const target = all.find((v) => v.id === current.previousVersionId);
  if (!target) return null;
  const reverted = await createVersion(entityType, entityId, target.payload, {
    status: "active",
    note: `Reverted to version ${target.id}`,
  });
  if (target.payload === null) await REMOVERS[entityType](entityId);
  else await SAVERS[entityType](target.payload);
  return reverted;
}

export async function historyFor(entityType: VersionedEntityType, entityId: string): Promise<EntityVersion[]> {
  const all = await versions.all();
  return all
    .filter((v) => v.entityType === entityType && v.entityId === entityId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function allVersions(): Promise<EntityVersion[]> {
  const all = await versions.all();
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
