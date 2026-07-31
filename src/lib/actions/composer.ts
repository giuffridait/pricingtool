"use server";

import { revalidatePath } from "next/cache";
import { newId } from "../store";
import type { CompositionStep } from "../types";
import { saveVersioned, deleteVersioned } from "./helpers";

export interface CompositionDefinitionInput {
  id?: string;
  name: string;
  businessUnitId: string;
  shopId?: string;
  steps: CompositionStep[];
}

export async function saveCompositionDefinitionAction(input: CompositionDefinitionInput) {
  const id = input.id ?? newId("comp-def");
  await saveVersioned(
    "compositionDefinition",
    id,
    (versionId) => ({
      id,
      name: input.name,
      businessUnitId: input.businessUnitId,
      shopId: input.shopId || undefined,
      steps: input.steps,
      versionId,
    }),
    { note: `Saved composition definition "${input.name}"` },
  );
  revalidatePath("/composer");
}

export async function deleteCompositionDefinitionAction(id: string) {
  await deleteVersioned("compositionDefinition", id, "Removed composition definition");
  revalidatePath("/composer");
}
