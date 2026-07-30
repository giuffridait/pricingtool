"use server";

import { revalidatePath } from "next/cache";
import { acknowledgeAlert } from "../engine/alerts";

export async function acknowledgeAlertAction(id: string) {
  await acknowledgeAlert(id);
  revalidatePath("/alerts");
  revalidatePath("/overview");
}
