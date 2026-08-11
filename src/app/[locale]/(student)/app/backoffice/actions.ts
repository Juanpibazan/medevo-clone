"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth, profileService } from "@/modules/identity";
import { contentService } from "@/modules/content";

async function requireEditor() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const roles = await profileService.getUserRoles(session.user.id);
  if (!roles.includes("medical_editor") && !roles.includes("admin")) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function createQuestionAction(
  locale: string,
  input: {
    title: string;
    statement: string;
    explanation: string;
    taxonomyNodeId: string;
    alternatives: Array<{
      optionLetter: "A" | "B" | "C" | "D" | "E";
      text: string;
      isCorrect: boolean;
    }>;
  },
) {
  const session = await requireEditor();
  await contentService.createQuestion(session.user.id, input);
  revalidatePath(`/${locale}/app`);
  revalidatePath(`/${locale}/app/backoffice`);
}
