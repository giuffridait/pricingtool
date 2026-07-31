"use server";

import { revalidatePath } from "next/cache";
import { newId } from "../store";
import type { DiscountScope, RuleDimensions, RuleEffectType } from "../types";
import { saveVersioned, deleteVersioned } from "./helpers";

export interface RuleInput {
  id?: string;
  name: string;
  scope: DiscountScope;
  dimensions: RuleDimensions;
  effect: { type: RuleEffectType; price?: number; discountId?: string; componentId?: string; commissionId?: string };
  priority: number;
  stackingGroup?: string;
  exclusionGroups?: string[];
  validFrom?: string;
  validTo?: string;
  calendarId?: string;
}

export async function saveRuleAction(input: RuleInput) {
  const id = input.id ?? newId("rule");
  await saveVersioned(
    "rule",
    id,
    (versionId) => ({
      id,
      name: input.name,
      scope: input.scope,
      dimensions: input.dimensions,
      effect: input.effect,
      priority: input.priority,
      stackingGroup: input.stackingGroup || undefined,
      exclusionGroups: input.exclusionGroups,
      validFrom: input.validFrom || undefined,
      validTo: input.validTo || undefined,
      calendarId: input.calendarId || undefined,
      versionId,
    }),
    { note: `Saved rule "${input.name}"` },
  );
  revalidatePath("/rules");
  revalidatePath("/calculator");
}

export async function deleteRuleAction(id: string) {
  await deleteVersioned("rule", id, "Removed rule");
  revalidatePath("/rules");
  revalidatePath("/calculator");
}
