"use server";

import { revalidatePath } from "next/cache";
import { newId } from "../store";
import type { BundleComponent, DiscountEligibility } from "../types";
import { saveVersioned, deleteVersioned } from "./helpers";

export interface BundleInput {
  id?: string;
  name: string;
  businessUnitId: string;
  components: BundleComponent[];
  bundlePrice: number;
  currency: string;
  eligibility: DiscountEligibility;
  validFrom?: string;
  validTo?: string;
  priority: number;
}

export async function saveBundleAction(input: BundleInput) {
  const id = input.id ?? newId("bundle");
  await saveVersioned(
    "bundle",
    id,
    (versionId) => ({
      id,
      name: input.name,
      businessUnitId: input.businessUnitId,
      components: input.components,
      bundlePrice: input.bundlePrice,
      currency: input.currency,
      eligibility: input.eligibility,
      validFrom: input.validFrom || undefined,
      validTo: input.validTo || undefined,
      priority: input.priority,
      versionId,
    }),
    { note: `Saved bundle "${input.name}"` },
  );
  revalidatePath("/discounts");
  revalidatePath("/basket");
}

export async function deleteBundleAction(id: string) {
  await deleteVersioned("bundle", id, "Removed bundle");
  revalidatePath("/discounts");
  revalidatePath("/basket");
}
