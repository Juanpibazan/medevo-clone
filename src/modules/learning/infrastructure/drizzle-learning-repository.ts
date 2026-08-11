import { eq, and, lte, asc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  reviewQueue,
  responses,
  studySessionItems,
  questionVersions,
  studySessions,
} from "@/db/schema";
import type { LearningRepository } from "../application/learning-service";
import type { Card } from "../domain/fsrs";

export class DrizzleLearningRepository implements LearningRepository {
  async getReviewQueueItem(
    userId: string,
    questionId: string,
  ): Promise<Card | null> {
    const [row] = await db
      .select()
      .from(reviewQueue)
      .where(
        and(
          eq(reviewQueue.userId, userId),
          eq(reviewQueue.questionId, questionId),
        ),
      )
      .limit(1);

    if (!row) return null;

    return {
      stability: row.stability,
      difficulty: row.difficulty,
      elapsedDays: row.elapsedDays,
      scheduledDays: row.scheduledDays,
      repetition: row.repetition,
      state: row.state,
      lastReviewAt: row.lastReviewAt ?? undefined,
      nextReviewAt: row.nextReviewAt,
    };
  }

  async saveReviewQueueItem(
    userId: string,
    questionId: string,
    card: Card,
  ): Promise<void> {
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(reviewQueue)
        .where(
          and(
            eq(reviewQueue.userId, userId),
            eq(reviewQueue.questionId, questionId),
          ),
        )
        .limit(1);

      const now = new Date();

      if (existing) {
        await tx
          .update(reviewQueue)
          .set({
            stability: card.stability,
            difficulty: card.difficulty,
            elapsedDays: card.elapsedDays,
            scheduledDays: card.scheduledDays,
            repetition: card.repetition,
            state: card.state,
            lastReviewAt: card.lastReviewAt || null,
            nextReviewAt: card.nextReviewAt,
            updatedAt: now,
          })
          .where(eq(reviewQueue.id, existing.id));
      } else {
        await tx.insert(reviewQueue).values({
          id: crypto.randomUUID(),
          userId,
          questionId,
          stability: card.stability,
          difficulty: card.difficulty,
          elapsedDays: card.elapsedDays,
          scheduledDays: card.scheduledDays,
          repetition: card.repetition,
          state: card.state,
          lastReviewAt: card.lastReviewAt || null,
          nextReviewAt: card.nextReviewAt,
          createdAt: now,
          updatedAt: now,
        });
      }
    });
  }

  async getDueQuestionIds(
    userId: string,
    now: Date,
    limit: number,
  ): Promise<string[]> {
    const rows = await db
      .select({ questionId: reviewQueue.questionId })
      .from(reviewQueue)
      .where(
        and(eq(reviewQueue.userId, userId), lte(reviewQueue.nextReviewAt, now)),
      )
      .orderBy(asc(reviewQueue.nextReviewAt))
      .limit(limit);

    return rows.map((r) => r.questionId);
  }

  /**
   * Retrieves the question IDs in the user's error notebook.
   * Uses native PostgreSQL DISTINCT ON to find the latest verified response for each question,
   * returning only those where the latest answer is incorrect.
   */
  async getErrorNotebookQuestionIds(userId: string): Promise<string[]> {
    const query = sql`
      SELECT qv.question_id
      FROM (
        SELECT DISTINCT ON (qv.question_id) qv.question_id, r.is_correct
        FROM ${responses} r
        JOIN ${studySessionItems} ssi ON r.session_item_id = ssi.id
        JOIN ${questionVersions} qv ON ssi.question_version_id = qv.id
        JOIN ${studySessions} ss ON ssi.session_id = ss.id
        WHERE ss.user_id = ${userId} AND r.verified_at IS NOT NULL
        ORDER BY qv.question_id, r.verified_at DESC
      ) qv
      WHERE qv.is_correct = false
    `;

    const result = await db.execute(query);
    return result.rows.map(
      (row: Record<string, unknown>) => row.question_id as string,
    );
  }

  /**
   * Retrieves the question IDs marked as favorite.
   * Returns only those questions where the latest response has is_favorite = true.
   */
  async getFavoritesQuestionIds(userId: string): Promise<string[]> {
    const query = sql`
      SELECT qv.question_id
      FROM (
        SELECT DISTINCT ON (qv.question_id) qv.question_id, r.is_favorite
        FROM ${responses} r
        JOIN ${studySessionItems} ssi ON r.session_item_id = ssi.id
        JOIN ${questionVersions} qv ON ssi.question_version_id = qv.id
        JOIN ${studySessions} ss ON ssi.session_id = ss.id
        WHERE ss.user_id = ${userId}
        ORDER BY qv.question_id, r.updated_at DESC
      ) qv
      WHERE qv.is_favorite = true
    `;

    const result = await db.execute(query);
    return result.rows.map(
      (row: Record<string, unknown>) => row.question_id as string,
    );
  }
}
