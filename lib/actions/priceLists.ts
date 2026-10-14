"use server";

import { revalidatePath } from "next/cache";
import { newId } from "../store";
import type { PriceListEntry } from "../types";
import { saveVersioned, deleteVersioned } from "./helpers";

export interface PriceListInput {
  id?: string;
  name: string;
  businessUnitId: string;
  customerGroup: string;
  currency: string;
  validFrom?: string;
  validTo?: string;
  priority: number;
  entries: PriceListEntry[];
}

export async function savePriceListAction(input: PriceListInput) {
  const id = input.id ?? newId("plist");
  await saveVersioned(
    "priceList",
    id,
    (versionId) => ({
      id,
      name: input.name,
      businessUnitId: input.businessUnitId,
      customerGroup: input.customerGroup,
      currency: input.currency,
      validFrom: input.validFrom || undefined,
      validTo: input.validTo || undefined,
      priority: input.priority,
      entries: input.entries,
      versionId,
    }),
    { note: `Saved price list "${input.name}"` },
  );
  revalidatePath("/price-lists");
  revalidatePath("/calculator");
}

export async function deletePriceListAction(id: string) {
  await deleteVersioned("priceList", id, "Removed price list");
  revalidatePath("/price-lists");
  revalidatePath("/calculator");
}
