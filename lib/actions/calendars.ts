"use server";

import { revalidatePath } from "next/cache";
import { newId } from "../store";
import type { CalendarType } from "../types";
import { saveVersioned, deleteVersioned } from "./helpers";

export interface CalendarInput {
  id?: string;
  name: string;
  type: CalendarType;
  daysOfWeek?: number[];
  startHour?: number;
  endHour?: number;
  seasonalStart?: string;
  seasonalEnd?: string;
}

export async function saveCalendarAction(input: CalendarInput) {
  const id = input.id ?? newId("cal");
  await saveVersioned(
    "pricingCalendar",
    id,
    (versionId) => ({
      id,
      name: input.name,
      type: input.type,
      daysOfWeek: input.type === "dayOfWeek" ? input.daysOfWeek : undefined,
      startHour: input.type === "dayOfWeek" ? input.startHour : undefined,
      endHour: input.type === "dayOfWeek" ? input.endHour : undefined,
      seasonalStart: input.type === "seasonal" ? input.seasonalStart : undefined,
      seasonalEnd: input.type === "seasonal" ? input.seasonalEnd : undefined,
      versionId,
    }),
    { note: `Saved pricing calendar "${input.name}"` },
  );
  revalidatePath("/calendars");
  revalidatePath("/incentives");
  revalidatePath("/rules");
  revalidatePath("/calculator");
}

export async function deleteCalendarAction(id: string) {
  await deleteVersioned("pricingCalendar", id, "Removed pricing calendar");
  revalidatePath("/calendars");
}
