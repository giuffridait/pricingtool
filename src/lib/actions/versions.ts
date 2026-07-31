"use server";

import { revalidatePath } from "next/cache";
import { activate, setStatus, revert } from "../engine/versions";
import type { VersionedEntityType } from "../engine/versions";

const PATHS: Record<VersionedEntityType, string> = {
  priceOverride: "/catalog",
  discount: "/discounts",
  component: "/components",
  rule: "/rules",
  consistencyRule: "/checks",
  bundle: "/bundles",
  mixAndMatchSet: "/bundles",
  pricingCalendar: "/calendars",
  presentationPolicy: "/presentation",
};

function revalidateFor(entityType: VersionedEntityType) {
  revalidatePath(PATHS[entityType]);
  revalidatePath("/versions");
  revalidatePath("/calculator");
  revalidatePath("/basket");
  revalidatePath("/overview");
}

export async function approveVersionAction(versionId: string, entityType: VersionedEntityType) {
  await setStatus(versionId, "approved");
  revalidateFor(entityType);
}

export async function activateVersionAction(versionId: string, entityType: VersionedEntityType) {
  await activate(versionId);
  revalidateFor(entityType);
}

export async function revertEntityAction(entityType: VersionedEntityType, entityId: string) {
  await revert(entityType, entityId);
  revalidateFor(entityType);
}
