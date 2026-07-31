"use server";

import { revalidatePath } from "next/cache";
import { newId } from "../store";
import type { DiscountType, DiscountScope, DiscountEligibility, VolumeTier, BogoConfig, BasketTier } from "../types";
import { saveVersioned, deleteVersioned } from "./helpers";

export interface DiscountInput {
  id?: string;
  name: string;
  type: DiscountType;
  value?: number;
  tiers?: VolumeTier[];
  bogo?: BogoConfig;
  basketTiers?: BasketTier[];
  scope: DiscountScope;
  eligibility: DiscountEligibility;
  validFrom?: string;
  validTo?: string;
  calendarId?: string;
  stackingGroup: string;
  priority: number;
  badge?: string;
}

export async function saveDiscountAction(input: DiscountInput) {
  const id = input.id ?? newId("disc");
  await saveVersioned(
    "discount",
    id,
    (versionId) => ({
      id,
      name: input.name,
      type: input.type,
      value: input.value,
      tiers: input.tiers,
      bogo: input.bogo,
      basketTiers: input.basketTiers,
      scope: input.scope,
      eligibility: input.eligibility,
      validFrom: input.validFrom || undefined,
      validTo: input.validTo || undefined,
      calendarId: input.calendarId || undefined,
      stackingGroup: input.stackingGroup,
      priority: input.priority,
      badge: input.badge || undefined,
      versionId,
    }),
    { note: `Saved discount "${input.name}"` },
  );
  revalidatePath("/discounts");
  revalidatePath("/calculator");
}

export async function deleteDiscountAction(id: string) {
  await deleteVersioned("discount", id, "Removed discount");
  revalidatePath("/discounts");
  revalidatePath("/calculator");
}
