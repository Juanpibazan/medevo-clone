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
  reviewQueue,
} from "@/db/schema";
import { practiceService } from "@/modules/practice";
import { learningService } from "@/modules/learning";

describe("Practice, Correction and Spaced Repetition Integration", () => {
  afterAll(() => pool.end());

  it("should complete a full study session, calculate scores, populate error notebook, and queue FSRS reviews", async () => {
    const userId = randomUUID();
    const taxonomyId = "test-tax-node";
    const questionId1 = "test-q-01";
    const questionId2 = "test-q-02";
    const versionId1 = "test-qv-01";
    const versionId2 = "test-qv-02";
    const altId1Correct = "test-alt-01-c";
    const altId1Incorrect = "test-alt-01-i";
    const altId2Correct = "test-alt-02-c";
    const altId2Incorrect = "test-alt-02-i";

    try {
      // 1. Setup mock data
      await db.insert(users).values({
        id: userId,
        name: "Test Student",
        email: `${userId}@example.test`,
      });

      await db.insert(taxonomyNodes).values({
        id: taxonomyId,
        name: "Test Specialty",
        level: "specialty",
      });

      // Question 1
      await db.insert(questions).values({ id: questionId1 });
      await db.insert(questionVersions).values({
        id: versionId1,
        questionId: questionId1,
        versionNumber: 1,
        status: "published",
        title: "Test Q1",
        statement: "This is test question 1",
        explanation: "Correct because X",
        taxonomyNodeId: taxonomyId,
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
        {
          id: altId1Incorrect,
          questionVersionId: versionId1,
          optionLetter: "B",
          text: "Incorrect",
          isCorrect: false,
        },
      ]);

      // Question 2
      await db.insert(questions).values({ id: questionId2 });
      await db.insert(questionVersions).values({
        id: versionId2,
        questionId: questionId2,
        versionNumber: 1,
        status: "published",
        title: "Test Q2",
        statement: "This is test question 2",
        explanation: "Correct because Y",
        taxonomyNodeId: taxonomyId,
        createdBy: userId,
      });
      await db
        .update(questions)
        .set({ publishedVersionId: versionId2 })
        .where(eq(questions.id, questionId2));
      await db.insert(questionAlternatives).values([
        {
          id: altId2Correct,
          questionVersionId: versionId2,
          optionLetter: "A",
          text: "Correct",
          isCorrect: true,
        },
        {
          id: altId2Incorrect,
          questionVersionId: versionId2,
          optionLetter: "B",
          text: "Incorrect",
          isCorrect: false,
        },
      ]);

      // 2. Create study session
      const session = await practiceService.createSession(userId, [
        versionId1,
        versionId2,
      ]);
      expect(session.status).toBe("in_progress");

      const sessionDetails = await practiceService.getSession(
        session.id,
        userId,
      );
      expect(sessionDetails).not.toBeNull();
      expect(sessionDetails!.items).toHaveLength(2);

      const [item1, item2] = sessionDetails!.items;

      // Verify correct alternative is hidden before answer
      expect(item1.alternatives[0]).not.toHaveProperty("isCorrect");

      // 3. Save draft for item 1
      await practiceService.saveDraftResponse(
        session.id,
        item1.id,
        userId,
        altId1Correct,
        15,
      );

      const sessionAfterDraft = await practiceService.getSession(
        session.id,
        userId,
      );
      expect(sessionAfterDraft!.items[0].response?.selectedAlternativeId).toBe(
        altId1Correct,
      );

      // 4. Verify/Evaluate response 1 as Correct
      const verifyResult1 = await practiceService.verifyResponse(
        session.id,
        item1.id,
        userId,
        altId1Correct,
        25,
      );
      expect(verifyResult1.response.isCorrect).toBe(true);

      // 5. Verify/Evaluate response 2 as Incorrect
      const verifyResult2 = await practiceService.verifyResponse(
        session.id,
        item2.id,
        userId,
        altId2Incorrect,
        40,
      );
      expect(verifyResult2.response.isCorrect).toBe(false);

      // 6. Set metacognitive mark on question 1
      await practiceService.saveMetacognitiveMark(
        session.id,
        item1.id,
        userId,
        "domine",
      );

      // 7. Finish session and check metrics
      const results = await practiceService.finishSession(session.id, userId);
      expect(results.session.status).toBe("completed");
      expect(results.metrics.correctCount).toBe(1);
      expect(results.metrics.totalCount).toBe(2);
      expect(results.metrics.precision).toBe(50);
      expect(results.metrics.totalTimeSeconds).toBe(65);

      // 8. Check FSRS review queue updates
      const card1 = await learningService.getReviewQueueItem(
        userId,
        questionId1,
      );
      const card2 = await learningService.getReviewQueueItem(
        userId,
        questionId2,
      );

      expect(card1).not.toBeNull();
      expect(card2).not.toBeNull();

      // Card 1 was marked as 'domine' (Easy -> rating 4)
      // Card 2 was incorrect (Again -> rating 1)
      expect(card1!.stability).toBeGreaterThan(card2!.stability);

      // 9. Check Cuaderno de Errores (Question 2 should be in the notebook)
      const errorNotebook = await learningService.getErrorNotebook(userId);
      const errorIds = errorNotebook.map((q) => q.question.id);
      expect(errorIds).toContain(questionId2);
      expect(errorIds).not.toContain(questionId1);
    } finally {
      // Clean up in reverse topological order
      await db.delete(reviewQueue).where(eq(reviewQueue.userId, userId));
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
      await db.delete(taxonomyNodes).where(eq(taxonomyNodes.id, taxonomyId));
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  it("should support open-ended question practice, saving responseText, self-evaluation, and scheduling review", async () => {
    const userId = randomUUID();
    const taxonomyId = "test-tax-node-discursive";
    const questionId = "test-qd-01";
    const versionId = "test-qvd-01";

    try {
      // 1. Setup mock data
      await db.insert(users).values({
        id: userId,
        name: "Test Student 2",
        email: `${userId}@example.test`,
      });

      await db.insert(taxonomyNodes).values({
        id: taxonomyId,
        name: "Test Specialty Discursive",
        level: "specialty",
      });

      await db.insert(questions).values({ id: questionId });
      await db.insert(questionVersions).values({
        id: versionId,
        questionId: questionId,
        versionNumber: 1,
        status: "published",
        type: "open_ended",
        title: "Test Discursive Q1",
        statement: "Explain why the sky is blue.",
        explanation: "Rayleigh scattering",
        taxonomyNodeId: taxonomyId,
        createdBy: userId,
      });

      await db
        .update(questions)
        .set({ publishedVersionId: versionId })
        .where(eq(questions.id, questionId));

      // 2. Create study session
      const session = await practiceService.createSession(userId, [versionId]);
      expect(session.status).toBe("in_progress");

      const sessionDetails = await practiceService.getSession(
        session.id,
        userId,
      );
      expect(sessionDetails!.items).toHaveLength(1);

      const [item] = sessionDetails!.items;

      // 3. Save draft answer (responseText)
      await practiceService.saveDraftResponse(
        session.id,
        item.id,
        userId,
        null,
        30,
        "It's blue because of Rayleigh scattering.",
      );

      const sessionAfterDraft = await practiceService.getSession(
        session.id,
        userId,
      );
      expect(sessionAfterDraft!.items[0].response?.responseText).toBe(
        "It's blue because of Rayleigh scattering.",
      );

      // 4. Verify/Evaluate response with self-evaluated correct=true
      const verifyResult = await practiceService.verifyResponse(
        session.id,
        item.id,
        userId,
        null,
        45,
        true, // selfCorrect = true
      );
      expect(verifyResult.response.isCorrect).toBe(true);

      // 5. Finish session
      const results = await practiceService.finishSession(session.id, userId);
      expect(results.session.status).toBe("completed");
      expect(results.metrics.correctCount).toBe(1);

      // 6. Check FSRS review queue
      const card = await learningService.getReviewQueueItem(userId, questionId);
      expect(card).not.toBeNull();
      expect(card!.repetition).toBe(1);
    } finally {
      // Clean up
      await db.delete(reviewQueue).where(eq(reviewQueue.userId, userId));
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
        .delete(questionVersions)
        .where(eq(questionVersions.id, versionId));
      await db.delete(questions).where(eq(questions.id, questionId));
      await db.delete(taxonomyNodes).where(eq(taxonomyNodes.id, taxonomyId));
      await db.delete(users).where(eq(users.id, userId));
    }
  });
});
