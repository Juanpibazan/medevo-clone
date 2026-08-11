"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/modules/identity";
import { practiceService } from "@/modules/practice";
import { learningService } from "@/modules/learning";

async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function startPracticeSessionAction(locale: string) {
  const session = await requireAuth();
  const studySession = await practiceService.createSession(session.user.id);
  redirect(`/${locale}/app/practice/${studySession.id}`);
}

export async function startReviewSessionAction(locale: string) {
  const session = await requireAuth();
  const dueQuestions = await learningService.getDueQuestions(
    session.user.id,
    10,
  );
  if (dueQuestions.length === 0) {
    return { error: "no_reviews_due" };
  }

  const versionIds = dueQuestions.map((q) => q.activeVersion.id);
  const studySession = await practiceService.createSession(
    session.user.id,
    versionIds,
  );
  redirect(`/${locale}/app/practice/${studySession.id}`);
}

export async function saveDraftAction(
  sessionId: string,
  itemId: string,
  alternativeId: string,
  elapsedSeconds: number,
) {
  const session = await requireAuth();
  await practiceService.saveDraftResponse(
    sessionId,
    itemId,
    session.user.id,
    alternativeId,
    elapsedSeconds,
  );
}

export async function verifyResponseAction(
  sessionId: string,
  itemId: string,
  alternativeId: string,
  elapsedSeconds: number,
) {
  const session = await requireAuth();
  return practiceService.verifyResponse(
    sessionId,
    itemId,
    session.user.id,
    alternativeId,
    elapsedSeconds,
  );
}

export async function saveMetacognitiveMarkAction(
  sessionId: string,
  itemId: string,
  mark: "domine" | "duda" | "vacile" | "no_sabia",
) {
  const session = await requireAuth();
  return practiceService.saveMetacognitiveMark(
    sessionId,
    itemId,
    session.user.id,
    mark,
  );
}

export async function toggleFavoriteAction(sessionId: string, itemId: string) {
  const session = await requireAuth();
  return practiceService.toggleFavorite(sessionId, itemId, session.user.id);
}

export async function finishSessionAction(sessionId: string, locale: string) {
  const session = await requireAuth();
  await practiceService.finishSession(sessionId, session.user.id);
  redirect(`/${locale}/app/practice/${sessionId}/results`);
}

export async function startSingleQuestionSessionAction(
  locale: string,
  questionVersionId: string,
) {
  const session = await requireAuth();
  const studySession = await practiceService.createSession(session.user.id, [
    questionVersionId,
  ]);
  redirect(`/${locale}/app/practice/${studySession.id}`);
}
