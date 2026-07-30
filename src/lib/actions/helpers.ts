import { newId } from "../store";
import { createVersion, activate } from "../engine/versions";
import type { VersionedEntityType } from "../engine/versions";

// Shared by every domain's server actions: wraps a save in the draft/version
// workflow, then either activates it immediately (the common case) or leaves
// it scheduled for later activation.
export async function saveVersioned<T extends { id: string }>(
  entityType: VersionedEntityType,
  entityId: string,
  buildPayload: (versionId: string) => T,
  opts: { scheduledFor?: string; note?: string } = {},
) {
  const versionId = newId("ver");
  const payload = buildPayload(versionId);
  const version = await createVersion(entityType, entityId, payload, {
    id: versionId,
    note: opts.note,
    scheduledFor: opts.scheduledFor,
    status: opts.scheduledFor ? "scheduled" : "draft",
  });
  if (!opts.scheduledFor) {
    await activate(version.id);
  }
  return version;
}

export async function deleteVersioned(entityType: VersionedEntityType, entityId: string, note?: string) {
  const versionId = newId("ver");
  const version = await createVersion(entityType, entityId, null, { id: versionId, note, status: "draft" });
  await activate(version.id);
  return version;
}
