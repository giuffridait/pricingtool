"use server";

import { revalidatePath } from "next/cache";
import { newId } from "../store";
import type { CatalogLevel } from "../types";
import { priceOverrides } from "../repo";
import { saveVersioned, deleteVersioned } from "./helpers";

export interface PriceOverrideInput {
  id?: string;
  level: CatalogLevel;
  refId: string;
  businessUnitId: string;
  shopId?: string;
  price: number;
  currency: string;
  floor?: number;
  ceiling?: number;
  scheduledFor?: string;
}

export async function savePriceOverrideAction(input: PriceOverrideInput) {
  // At most one override may exist per (level, refId, businessUnitId, shopId).
  // "Add" without an explicit id still resolves to that existing row instead
  // of creating an ambiguous duplicate at the same rank.
  let id = input.id;
  if (!id) {
    const existing = (await priceOverrides.all()).find(
      (o) =>
        o.level === input.level &&
        o.refId === input.refId &&
        o.businessUnitId === input.businessUnitId &&
        (o.shopId ?? "") === (input.shopId ?? ""),
    );
    id = existing?.id ?? newId("po");
  }
  await saveVersioned(
    "priceOverride",
    id,
    (versionId) => ({
      id,
      level: input.level,
      refId: input.refId,
      businessUnitId: input.businessUnitId,
      shopId: input.shopId || undefined,
      price: input.price,
      currency: input.currency,
      floor: input.floor,
      ceiling: input.ceiling,
      versionId,
    }),
    { scheduledFor: input.scheduledFor, note: `Set ${input.level} price to ${input.currency} ${input.price}` },
  );
  revalidatePath("/catalog");
  revalidatePath("/overview");
  revalidatePath("/calculator");
}

export async function deletePriceOverrideAction(id: string) {
  await deleteVersioned("priceOverride", id, "Removed price override");
  revalidatePath("/catalog");
  revalidatePath("/overview");
  revalidatePath("/calculator");
}
