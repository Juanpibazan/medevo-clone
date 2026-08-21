"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth, profileService } from "@/modules/identity";
import { editorialService, type QuestionType } from "@/modules/content";
import { db } from "@/db/client";
import { userRoles } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getRequiredSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

async function requireRole(allowedRoles: string[]) {
  const session = await getRequiredSession();
  const roles = await profileService.getUserRoles(session.user.id);
  const hasAccess = roles.some((role) => allowedRoles.includes(role));
  if (!hasAccess) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function saveDraftAction(
  locale: string,
  versionId: string | null, // null for new draft
  input: {
    title: string;
    statement: string;
    explanation: string;
    taxonomyNodeId: string;
    type?: QuestionType;
    alternatives: Array<{
      optionLetter: "A" | "B" | "C" | "D" | "E";
      text: string;
      isCorrect: boolean;
    }>;
    images?: Array<{
      url: string;
      position: number;
    }>;
  },
) {
  const session = await requireRole(["medical_editor", "admin"]);
  let newVersionId = versionId;
  if (!versionId) {
    const result = await editorialService.createQuestionDraft(
      session.user.id,
      input,
    );
    newVersionId = result.versionId;
  } else {
    await editorialService.updateQuestionDraft(
      session.user.id,
      versionId,
      input,
    );
  }
  revalidatePath(`/${locale}/app/backoffice`);
  return { success: true, versionId: newVersionId };
}

export async function createDraftFromPublishedAction(
  locale: string,
  questionId: string,
) {
  const session = await requireRole(["medical_editor", "admin"]);
  const result = await editorialService.createDraftFromPublished(
    session.user.id,
    questionId,
  );
  revalidatePath(`/${locale}/app/backoffice`);
  return { success: true, versionId: result.versionId };
}

export async function submitForReviewAction(locale: string, versionId: string) {
  const session = await requireRole(["medical_editor", "admin"]);
  await editorialService.submitForReview(session.user.id, versionId);
  revalidatePath(`/${locale}/app/backoffice`);
  return { success: true };
}

export async function reviewQuestionAction(
  locale: string,
  versionId: string,
  decision: "approved" | "changes_requested",
  comments?: string,
) {
  const session = await requireRole(["medical_reviewer", "admin"]);
  await editorialService.reviewQuestion(
    session.user.id,
    versionId,
    decision,
    comments,
  );
  revalidatePath(`/${locale}/app/backoffice`);
  return { success: true };
}

export async function annulQuestionAction(locale: string, questionId: string) {
  const session = await requireRole(["medical_reviewer", "admin"]);
  await editorialService.annulQuestion(session.user.id, questionId);
  revalidatePath(`/${locale}/app/backoffice`);
  return { success: true };
}

export async function switchRoleAction(roleCode: string) {
  const session = await getRequiredSession();
  const isDev = process.env.NODE_ENV === "development";

  // Fetch current roles in database to verify permissions
  const rolesList = await profileService.getUserRoles(session.user.id);
  const hasAccess =
    isDev ||
    rolesList.includes("admin") ||
    rolesList.includes("medical_editor");

  if (!hasAccess) {
    throw new Error(
      "Unauthorized. Only administrators and medical editors can switch roles in production.",
    );
  }

  await db.transaction(async (tx) => {
    // Delete existing roles
    await tx.delete(userRoles).where(eq(userRoles.userId, session.user.id));
    // Insert new role
    await tx.insert(userRoles).values({
      userId: session.user.id,
      roleCode,
    });
  });

  revalidatePath("/");
  return { success: true };
}

export async function getUploadPresignedUrlAction(
  filename: string,
  fileType: string,
) {
  await requireRole(["medical_editor", "admin"]);
  const { getUploadPresignedUrl } = await import("@/lib/s3");
  return getUploadPresignedUrl(filename, fileType);
}
