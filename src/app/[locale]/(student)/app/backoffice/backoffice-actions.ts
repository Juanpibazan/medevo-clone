"use server";

import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth, profileService } from "@/modules/identity";
import { editorialService, type QuestionType } from "@/modules/content";
import { db } from "@/db/client";
import { userRoles } from "@/db/schema";

async function getRequiredSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function getEffectiveRoles(userId: string): Promise<string[]> {
  const roles = await profileService.getUserRoles(userId);
  const isPrivileged =
    process.env.NODE_ENV === "development" ||
    roles.includes("admin") ||
    roles.includes("medical_editor");

  if (isPrivileged) {
    const cookieStore = await cookies();
    const activeRole = cookieStore.get("dev_active_role")?.value;
    if (activeRole) {
      if (activeRole === "student") return ["student"];
      if (activeRole === "medical_editor") return ["medical_editor", "student"];
      if (activeRole === "medical_reviewer")
        return ["medical_reviewer", "student"];
      if (activeRole === "admin")
        return ["admin", "medical_editor", "medical_reviewer", "student"];
    }
  }
  return roles;
}

async function requireRole(allowedRoles: string[]) {
  const session = await getRequiredSession();
  const roles = await getEffectiveRoles(session.user.id);
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
    subquestions?: Array<{
      letter: string;
      statement: string;
      explanation: string;
    }> | null;
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

  // Preserve essential roles in DB (admin / medical_editor / student) and ensure the new role exists
  await db.transaction(async (tx) => {
    const rolesToEnsure = new Set<string>();
    if (rolesList.includes("admin")) rolesToEnsure.add("admin");
    if (rolesList.includes("medical_editor")) rolesToEnsure.add("medical_editor");
    rolesToEnsure.add("student");
    rolesToEnsure.add(roleCode);

    for (const role of rolesToEnsure) {
      if (!rolesList.includes(role)) {
        await tx
          .insert(userRoles)
          .values({
            userId: session.user.id,
            roleCode: role,
          })
          .onConflictDoNothing();
      }
    }
  });

  const cookieStore = await cookies();
  cookieStore.set("dev_active_role", roleCode, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
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
