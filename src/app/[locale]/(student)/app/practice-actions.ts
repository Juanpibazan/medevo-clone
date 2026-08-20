"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/modules/identity";
import { practiceService } from "@/modules/practice";
import { learningService } from "@/modules/learning";
import { billingService } from "@/modules/billing";
import { analyticsService } from "@/modules/analytics";

async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function startPracticeSessionAction(
  locale: string,
  taxonomyNodeId?: string,
): Promise<{ sessionId?: string; error?: string }> {
  const session = await requireAuth();
  const quota = await billingService.checkDailyQuota(session.user.id);
  if (quota.isBlocked) {
    return { error: "quota_exceeded" };
  }
  try {
    const studySession = await practiceService.createSession(
      session.user.id,
      undefined,
      { taxonomyNodeId },
    );
    analyticsService.trackEvent(session.user.id, "practice_session_started", {
      sessionId: studySession.id,
      taxonomyNodeId: taxonomyNodeId || null,
    });
    return { sessionId: studySession.id };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "";
    if (errorMsg === "no_questions_for_filters") {
      return { error: "no_questions_for_filters" };
    }
    return { error: "failed_to_create_session" };
  }
}

export async function startReviewSessionAction(locale: string) {
  const session = await requireAuth();
  const quota = await billingService.checkDailyQuota(session.user.id);
  if (quota.isBlocked) {
    redirect(`/${locale}/app/billing`);
  }
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
  analyticsService.trackEvent(session.user.id, "review_session_started", {
    sessionId: studySession.id,
    questionCount: versionIds.length,
  });
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
  const quota = await billingService.checkDailyQuota(session.user.id);
  if (quota.isBlocked) {
    return { error: "quota_exceeded" as const };
  }
  const result = await practiceService.verifyResponse(
    sessionId,
    itemId,
    session.user.id,
    alternativeId,
    elapsedSeconds,
  );
  analyticsService.trackEvent(session.user.id, "question_answered", {
    sessionId,
    itemId,
    alternativeId,
    isCorrect: result.response.isCorrect,
    timeTakenSeconds: elapsedSeconds,
  });
  return result;
}

export async function saveMetacognitiveMarkAction(
  sessionId: string,
  itemId: string,
  mark: "domine" | "duda" | "vacile" | "no_sabia",
) {
  const session = await requireAuth();
  const result = await practiceService.saveMetacognitiveMark(
    sessionId,
    itemId,
    session.user.id,
    mark,
  );
  analyticsService.trackEvent(session.user.id, "metacognitive_marked", {
    sessionId,
    itemId,
    mark,
  });
  return result;
}

export async function toggleFavoriteAction(sessionId: string, itemId: string) {
  const session = await requireAuth();
  const result = await practiceService.toggleFavorite(
    sessionId,
    itemId,
    session.user.id,
  );
  analyticsService.trackEvent(session.user.id, "favorite_toggled", {
    sessionId,
    itemId,
    isFavorite: result.isFavorite,
  });
  return result;
}

export async function finishSessionAction(sessionId: string, locale: string) {
  const session = await requireAuth();
  const result = await practiceService.finishSession(
    sessionId,
    session.user.id,
  );
  analyticsService.trackEvent(session.user.id, "session_completed", {
    sessionId,
    precision: result.metrics.precision,
    correctCount: result.metrics.correctCount,
    totalCount: result.metrics.totalCount,
    totalTimeSeconds: result.metrics.totalTimeSeconds,
  });
  redirect(`/${locale}/app/practice/${sessionId}/results`);
}

export async function startSingleQuestionSessionAction(
  locale: string,
  questionVersionId: string,
) {
  const session = await requireAuth();
  const quota = await billingService.checkDailyQuota(session.user.id);
  if (quota.isBlocked) {
    redirect(`/${locale}/app/billing`);
  }
  const studySession = await practiceService.createSession(session.user.id, [
    questionVersionId,
  ]);
  analyticsService.trackEvent(
    session.user.id,
    "single_question_practice_started",
    {
      sessionId: studySession.id,
      questionVersionId,
    },
  );
  redirect(`/${locale}/app/practice/${studySession.id}`);
}
