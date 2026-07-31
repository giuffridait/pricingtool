"use server";

import { revalidatePath } from "next/cache";
import { newId } from "../store";
import type { MixAndMatchGroup, DiscountEligibility } from "../types";
import { saveVersioned, deleteVersioned } from "./helpers";

export interface MixAndMatchInput {
  id?: string;
  name: string;
  businessUnitId: string;
  group: MixAndMatchGroup;
  requiredCount: number;
  setPrice: number;
  currency: string;
  eligibility: DiscountEligibility;
  validFrom?: string;
  validTo?: string;
  priority: number;
}

export async function saveMixAndMatchAction(input: MixAndMatchInput) {
  const id = input.id ?? newId("mnm");
  await saveVersioned(
    "mixAndMatchSet",
    id,
    (versionId) => ({
      id,
      name: input.name,
      businessUnitId: input.businessUnitId,
      group: input.group,
      requiredCount: input.requiredCount,
      setPrice: input.setPrice,
      currency: input.currency,
      eligibility: input.eligibility,
      validFrom: input.validFrom || undefined,
      validTo: input.validTo || undefined,
      priority: input.priority,
      versionId,
    }),
    { note: `Saved mix-and-match set "${input.name}"` },
  );
  revalidatePath("/discounts");
  revalidatePath("/basket");
}

export async function deleteMixAndMatchAction(id: string) {
  await deleteVersioned("mixAndMatchSet", id, "Removed mix-and-match set");
  revalidatePath("/discounts");
  revalidatePath("/basket");
}
