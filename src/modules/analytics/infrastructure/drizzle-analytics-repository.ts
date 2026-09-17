import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  analyticsEvents,
  responses,
  studySessionItems,
  studySessions,
  questionVersions,
  questions,
} from "@/db/schema";
import type { AnalyticsRepository } from "../application/analytics-service";

export class DrizzleAnalyticsRepository implements AnalyticsRepository {
  async trackEvent(
    id: string,
    userId: string | null,
    eventType: string,
    properties: Record<string, unknown>,
    createdAt: Date,
  ): Promise<void> {
    await db.insert(analyticsEvents).values({
      id,
      userId,
      eventType,
      properties,
      createdAt,
    });
  }

  async getUserResponsesData(
    userId: string,
    exam?: string,
  ): Promise<
    Array<{
      isCorrect: boolean | null;
      timeTakenSeconds: number;
      verifiedAt: Date | null;
      taxonomyNodeId: string;
    }>
  > {
    const conditions = [eq(studySessions.userId, userId)];
    if (exam) {
      conditions.push(eq(questions.exam, exam));
    }

    const rows = await db
      .select({
        isCorrect: responses.isCorrect,
        timeTakenSeconds: responses.timeTakenSeconds,
        verifiedAt: responses.verifiedAt,
        taxonomyNodeId: questionVersions.taxonomyNodeId,
      })
      .from(responses)
      .innerJoin(
        studySessionItems,
        eq(responses.sessionItemId, studySessionItems.id),
      )
      .innerJoin(
        studySessions,
        eq(studySessionItems.sessionId, studySessions.id),
      )
      .innerJoin(
        questionVersions,
        eq(studySessionItems.questionVersionId, questionVersions.id),
      )
      .innerJoin(
        questions,
        eq(questionVersions.questionId, questions.id),
      )
      .where(and(...conditions));

    return rows;
  }
}
