// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db, pool } from "@/db/client";
import {
  users,
  questions,
  questionVersions,
  questionAlternatives,
  taxonomyNodes,
  studySessions,
  studySessionItems,
  responses,
  analyticsEvents,
} from "@/db/schema";
import { analyticsService } from "@/modules/analytics";

describe("Product Analytics and Observability Integration Tests", () => {
  afterAll(() => pool.end());

  it("should ingest events and calculate correct aggregates and specialty metrics", async () => {
    const userId = randomUUID();
    const specialtyId = "spec-ped";
    const themeId = "theme-neo";
    const questionId1 = "q-test-01";
    const questionId2 = "q-test-02";
    const versionId1 = "qv-test-01";
    const versionId2 = "qv-test-02";
    const altId1Correct = "alt-test-01-c";
    const altId2Incorrect = "alt-test-02-i";

    try {
      // 0. Initial cleanup of potential leftovers
      await db
        .delete(taxonomyNodes)
        .where(inArray(taxonomyNodes.id, [specialtyId, themeId]));
      await db
        .delete(questions)
        .where(inArray(questions.id, [questionId1, questionId2]));
      await db.delete(users).where(eq(users.id, userId));

      // 1. Seed mock data
      await db.insert(users).values({
        id: userId,
        name: "Analytics Student",
        email: `${userId}@example.test`,
      });

      // Hierarchy: spec-ped (specialty) -> theme-neo (theme)
      await db.insert(taxonomyNodes).values([
        {
          id: specialtyId,
          name: "Pediatria",
          level: "specialty",
          parentId: null,
        },
        {
          id: themeId,
          name: "Neonatologia",
          level: "theme",
          parentId: specialtyId,
        },
      ]);

      // Question 1 (linked to theme-neo, root specialty is spec-ped)
      await db.insert(questions).values({ id: questionId1 });
      await db.insert(questionVersions).values({
        id: versionId1,
        questionId: questionId1,
        versionNumber: 1,
        status: "published",
        title: "Q1",
        statement: "Q1 statement",
        explanation: "Q1 explanation",
        taxonomyNodeId: themeId,
        createdBy: userId,
      });
      await db
        .update(questions)
        .set({ publishedVersionId: versionId1 })
        .where(eq(questions.id, questionId1));
      await db.insert(questionAlternatives).values([
        {
          id: altId1Correct,
          questionVersionId: versionId1,
          optionLetter: "A",
          text: "Correct",
          isCorrect: true,
        },
      ]);

      // Question 2 (linked to spec-ped directly)
      await db.insert(questions).values({ id: questionId2 });
      await db.insert(questionVersions).values({
        id: versionId2,
        questionId: questionId2,
        versionNumber: 1,
        status: "published",
        title: "Q2",
        statement: "Q2 statement",
        explanation: "Q2 explanation",
        taxonomyNodeId: specialtyId,
        createdBy: userId,
      });
      await db
        .update(questions)
        .set({ publishedVersionId: versionId2 })
        .where(eq(questions.id, questionId2));
      await db.insert(questionAlternatives).values([
        {
          id: altId2Incorrect,
          questionVersionId: versionId2,
          optionLetter: "A",
          text: "Incorrect",
          isCorrect: false,
        },
      ]);

      // 2. Test Ingestion (trackEvent)
      analyticsService.trackEvent(userId, "practice_session_started", {
        sessionId: "session-test-uuid",
      });

      // Allow a brief moment for the non-blocking trackEvent promise to execute
      await new Promise((resolve) => setTimeout(resolve, 200));

      const event = await db
        .select()
        .from(analyticsEvents)
        .where(eq(analyticsEvents.userId, userId))
        .limit(1);

      expect(event).toHaveLength(1);
      expect(event[0].eventType).toBe("practice_session_started");
      expect(event[0].properties).toEqual({ sessionId: "session-test-uuid" });

      // 3. Test Aggregation (getUserMetrics)
      // Create a mock study session and responses
      await db.insert(studySessions).values({
        id: "session-test-uuid",
        userId,
        status: "completed",
      });

      const itemId1 = "item-test-01";
      const itemId2 = "item-test-02";

      await db.insert(studySessionItems).values([
        {
          id: itemId1,
          sessionId: "session-test-uuid",
          questionVersionId: versionId1,
          position: 0,
        },
        {
          id: itemId2,
          sessionId: "session-test-uuid",
          questionVersionId: versionId2,
          position: 1,
        },
      ]);

      const now = new Date();

      await db.insert(responses).values([
        // Response 1: Correct, took 10 seconds, verified today
        {
          id: "resp-test-01",
          sessionItemId: itemId1,
          selectedAlternativeId: altId1Correct,
          isCorrect: true,
          timeTakenSeconds: 10,
          verifiedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        // Response 2: Incorrect, took 20 seconds, verified today
        {
          id: "resp-test-02",
          sessionItemId: itemId2,
          selectedAlternativeId: altId2Incorrect,
          isCorrect: false,
          timeTakenSeconds: 20,
          verifiedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      // Fetch metrics
      const metrics = await analyticsService.getUserMetrics(userId);

      // We expect:
      // - 2 questions answered today
      // - 50% precision global (1 out of 2)
      // - 15 seconds average time ((10 + 20) / 2)
      // - specialty Pediatria should have correctCount=1, totalCount=2, precision=50%
      expect(metrics.answeredToday).toBe(2);
      expect(metrics.precisionGlobal).toBe(50);
      expect(metrics.averageTimeSeconds).toBe(15);

      expect(metrics.precisionBySpecialty).toHaveLength(1);
      expect(metrics.precisionBySpecialty[0].specialtyId).toBe(specialtyId);
      expect(metrics.precisionBySpecialty[0].specialtyName).toBe("Pediatria");
      expect(metrics.precisionBySpecialty[0].correctCount).toBe(1);
      expect(metrics.precisionBySpecialty[0].totalCount).toBe(2);
      expect(metrics.precisionBySpecialty[0].precision).toBe(50);
    } finally {
      // Cleanup database
      await db
        .delete(analyticsEvents)
        .where(eq(analyticsEvents.userId, userId));
      await db
        .delete(responses)
        .where(
          inArray(
            responses.sessionItemId,
            db
              .select({ id: studySessionItems.id })
              .from(studySessionItems)
              .innerJoin(
                studySessions,
                eq(studySessionItems.sessionId, studySessions.id),
              )
              .where(eq(studySessions.userId, userId)),
          ),
        );
      await db
        .delete(studySessionItems)
        .where(
          inArray(
            studySessionItems.sessionId,
            db
              .select({ id: studySessions.id })
              .from(studySessions)
              .where(eq(studySessions.userId, userId)),
          ),
        );
      await db.delete(studySessions).where(eq(studySessions.userId, userId));
      await db
        .delete(questionAlternatives)
        .where(
          inArray(questionAlternatives.questionVersionId, [
            versionId1,
            versionId2,
          ]),
        );
      await db
        .delete(questionVersions)
        .where(inArray(questionVersions.id, [versionId1, versionId2]));
      await db
        .delete(questions)
        .where(inArray(questions.id, [questionId1, questionId2]));
      await db
        .delete(taxonomyNodes)
        .where(inArray(taxonomyNodes.id, [specialtyId, themeId]));
      await db.delete(users).where(eq(users.id, userId));
    }
  });
});
