"use server";

import { revalidatePath } from "next/cache";
import { newId } from "../store";
import type { ComponentType, CalcModel, PriceComponent } from "../types";
import { saveVersioned, deleteVersioned } from "./helpers";

export interface ComponentInput {
  id?: string;
  type: ComponentType;
  name: string;
  parentId?: string;
  calcModel: CalcModel;
  value: number;
  stitchCount?: number;
  matches: PriceComponent["matches"];
}

export async function saveComponentAction(input: ComponentInput) {
  const id = input.id ?? newId("comp");
  await saveVersioned(
    "component",
    id,
    (versionId) => ({
      id,
      type: input.type,
      name: input.name,
      parentId: input.parentId || undefined,
      calcModel: input.calcModel,
      value: input.value,
      stitchCount: input.stitchCount,
      matches: input.matches,
      versionId,
    }),
    { note: `Saved component "${input.name}"` },
  );
  revalidatePath("/components");
  revalidatePath("/calculator");
}

export async function deleteComponentAction(id: string) {
  await deleteVersioned("component", id, "Removed component");
  revalidatePath("/components");
  revalidatePath("/calculator");
}
