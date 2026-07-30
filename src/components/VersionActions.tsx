"use client";

import { useTransition } from "react";
import type { VersionedEntityType } from "@/lib/engine/versions";
import { approveVersionAction, activateVersionAction, revertEntityAction } from "@/lib/actions/versions";

export default function VersionActions({
  versionId,
  entityType,
  entityId,
  status,
  hasPrevious,
}: {
  versionId: string;
  entityType: VersionedEntityType;
  entityId: string;
  status: string;
  hasPrevious: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-2 text-xs shrink-0">
      {status === "draft" && (
        <button disabled={pending} className="underline" onClick={() => startTransition(() => approveVersionAction(versionId, entityType))}>
          approve
        </button>
      )}
      {(status === "draft" || status === "approved" || status === "scheduled") && (
        <button disabled={pending} className="underline" onClick={() => startTransition(() => activateVersionAction(versionId, entityType))}>
          activate now
        </button>
      )}
      {status === "active" && hasPrevious && (
        <button disabled={pending} className="underline text-amber-600" onClick={() => startTransition(() => revertEntityAction(entityType, entityId))}>
          revert
        </button>
      )}
    </div>
  );
}
