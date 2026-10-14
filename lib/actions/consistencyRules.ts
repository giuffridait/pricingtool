"use server";

import { revalidatePath } from "next/cache";
import { newId } from "../store";
import type { ConsistencyCheckType } from "../types";
import { saveVersioned, deleteVersioned } from "./helpers";

export interface ConsistencyRuleInput {
  id?: string;
  name: string;
  type: ConsistencyCheckType;
  subjectRefId: string;
  comparatorRefId: string;
  threshold: number;
  severity: "blocking" | "warning";
}

export async function saveConsistencyRuleAction(input: ConsistencyRuleInput) {
  const id = input.id ?? newId("cr");
  await saveVersioned(
    "consistencyRule",
    id,
    () => ({
      id,
      name: input.name,
      type: input.type,
      subjectRefId: input.subjectRefId,
      comparatorRefId: input.comparatorRefId,
      threshold: input.threshold,
      severity: input.severity,
    }),
    { note: `Saved consistency rule "${input.name}"` },
  );
  revalidatePath("/checks");
}

export async function deleteConsistencyRuleAction(id: string) {
  await deleteVersioned("consistencyRule", id, "Removed consistency rule");
  revalidatePath("/checks");
}
