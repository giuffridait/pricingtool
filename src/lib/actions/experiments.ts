"use server";

import { revalidatePath } from "next/cache";
import { newId } from "../store";
import type { ExperimentStatus } from "../types";
import { experiments } from "../repo";

export interface ExperimentInput {
  id?: string;
  name: string;
  hypothesis: string;
  skuId: string;
  businessUnitId: string;
  market: string;
  controlPrice: number;
  controlTrafficPercent: number;
  challengerPrice: number;
  challengerTrafficPercent: number;
  startDate: string;
  endDate: string;
  marginFloor: number;
}

export async function saveExperimentAction(input: ExperimentInput) {
  const id = input.id ?? newId("exp");
  const existing = (await experiments.all()).find((e) => e.id === id);
  await experiments.save({
    id,
    name: input.name,
    hypothesis: input.hypothesis,
    skuId: input.skuId,
    businessUnitId: input.businessUnitId,
    market: input.market,
    controlPrice: input.controlPrice,
    controlTrafficPercent: input.controlTrafficPercent,
    challengerPrice: input.challengerPrice,
    challengerTrafficPercent: input.challengerTrafficPercent,
    startDate: input.startDate,
    endDate: input.endDate,
    marginFloor: input.marginFloor,
    status: existing?.status ?? "draft",
  });
  revalidatePath("/experiments");
}

export async function setExperimentStatusAction(id: string, status: ExperimentStatus): Promise<{ error?: string }> {
  const existing = (await experiments.all()).find((e) => e.id === id);
  if (!existing) return { error: "Experiment not found" };
  if (status === "running" && existing.challengerPrice < existing.marginFloor) {
    return { error: `Challenger price ${existing.challengerPrice} is below the margin floor ${existing.marginFloor} - fix before starting.` };
  }
  await experiments.save({ ...existing, status });
  revalidatePath("/experiments");
  return {};
}
