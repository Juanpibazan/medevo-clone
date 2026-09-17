"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth, profileService } from "@/modules/identity";

export async function switchExamAction(exam: "revalida" | "enamed") {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }

  if (exam !== "revalida" && exam !== "enamed") {
    throw new Error("Invalid exam");
  }

  const result = await profileService.switchActiveExam(session.user.id, exam);
  revalidatePath("/", "layout");
  return result;
}
