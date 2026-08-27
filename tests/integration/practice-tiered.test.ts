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
} from "@/db/schema";
import { practiceService } from "@/modules/practice";

describe("Practice Tiered Selection Integration Tests", () => {
  afterAll(() => pool.end());

  it("should generate a practice session prioritizing Tier 1 (unanswered), Tier 2 (incorrect last), and Tier 3 (correct last) questions", async () => {
    const userId = randomUUID();
    const taxonomyId = "tiered-test-tax-node";

    // Setup 3 questions
    const q1 = "tiered-q1"; // Correct (Tier 3)
    const q2 = "tiered-q2"; // Incorrect (Tier 2)
    const q3 = "tiered-q3"; // Unanswered (Tier 1)

    const v1 = "tiered-v1";
    const v2 = "tiered-v2";
    const v3 = "tiered-v3";

    const alt1Correct = "tiered-alt1-c";
    const alt1Incorrect = "tiered-alt1-i";
    const alt2Correct = "tiered-alt2-c";
    const alt2Incorrect = "tiered-alt2-i";
    const alt3Correct = "tiered-alt3-c";
    const alt3Incorrect = "tiered-alt3-i";

    try {
      // 1. Setup mock data
      await db.insert(users).values({
        id: userId,
        name: "Tiered Student",
        email: `${userId}@example.test`,
      });

      await db.insert(taxonomyNodes).values({
        id: taxonomyId,
        name: "Tiered Specialty",
        level: "specialty",
      });

      // Question 1
      await db.insert(questions).values({ id: q1 });
      await db.insert(questionVersions).values({
        id: v1,
        questionId: q1,
        versionNumber: 1,
        status: "published",
        title: "Test Q1",
        statement: "Question 1 statement",
        explanation: "Correct because X",
        taxonomyNodeId: taxonomyId,
        createdBy: userId,
      });
      await db
        .update(questions)
        .set({ publishedVersionId: v1 })
        .where(eq(questions.id, q1));
      await db.insert(questionAlternatives).values([
        {
          id: alt1Correct,
          questionVersionId: v1,
          optionLetter: "A",
          text: "Correct",
          isCorrect: true,
        },
        {
          id: alt1Incorrect,
          questionVersionId: v1,
          optionLetter: "B",
          text: "Incorrect",
          isCorrect: false,
        },
      ]);

      // Question 2
      await db.insert(questions).values({ id: q2 });
      await db.insert(questionVersions).values({
        id: v2,
        questionId: q2,
        versionNumber: 1,
        status: "published",
        title: "Test Q2",
        statement: "Question 2 statement",
        explanation: "Correct because Z",
        taxonomyNodeId: taxonomyId,
        createdBy: userId,
      });
      await db
        .update(questions)
        .set({ publishedVersionId: v2 })
        .where(eq(questions.id, q2));
      await db.insert(questionAlternatives).values([
        {
          id: alt2Correct,
          questionVersionId: v2,
          optionLetter: "A",
          text: "Correct",
          isCorrect: true,
        },
        {
          id: alt2Incorrect,
          questionVersionId: v2,
          optionLetter: "B",
          text: "Incorrect",
          isCorrect: false,
        },
      ]);

      // Question 3
      await db.insert(questions).values({ id: q3 });
      await db.insert(questionVersions).values({
        id: v3,
        questionId: q3,
        versionNumber: 1,
        status: "published",
        title: "Test Q3",
        statement: "Question 3 statement",
        explanation: "Correct because Y",
        taxonomyNodeId: taxonomyId,
        createdBy: userId,
      });
      await db
        .update(questions)
        .set({ publishedVersionId: v3 })
        .where(eq(questions.id, q3));
      await db.insert(questionAlternatives).values([
        {
          id: alt3Correct,
          questionVersionId: v3,
          optionLetter: "A",
          text: "Correct",
          isCorrect: true,
        },
        {
          id: alt3Incorrect,
          questionVersionId: v3,
          optionLetter: "B",
          text: "Incorrect",
          isCorrect: false,
        },
      ]);

      // 2. Answer Question 1 correctly, and Question 2 incorrectly
      const prepSession = await practiceService.createSession(userId, [v1, v2]);
      const prepSessionDetails = await practiceService.getSession(
        prepSession.id,
        userId,
      );
      expect(prepSessionDetails).not.toBeNull();

      const item1 = prepSessionDetails!.items.find(
        (i) => i.questionVersionId === v1,
      )!;
      const item2 = prepSessionDetails!.items.find(
        (i) => i.questionVersionId === v2,
      )!;

      // Verify correct answer for item1
      await practiceService.verifyResponse(
        prepSession.id,
        item1.id,
        userId,
        alt1Correct,
        10,
      );
      // Verify incorrect answer for item2
      await practiceService.verifyResponse(
        prepSession.id,
        item2.id,
        userId,
        alt2Incorrect,
        15,
      );

      // Complete prep session
      await practiceService.finishSession(prepSession.id, userId);

      // 3. Generate a new practice session utilizing tiered selection (filtered by our taxonomy ID)
      const generatedSession = await practiceService.createSession(
        userId,
        undefined,
        {
          taxonomyNodeId: taxonomyId,
        },
      );
      const generatedDetails = await practiceService.getSession(
        generatedSession.id,
        userId,
      );
      expect(generatedDetails).not.toBeNull();
      expect(generatedDetails!.items).toHaveLength(3);

      // Verify the priority order:
      // Index 0 must be Tier 1 (q3 / v3)
      // Index 1 must be Tier 2 (q2 / v2)
      // Index 2 must be Tier 3 (q1 / v1)
      expect(generatedDetails!.items[0].questionVersionId).toBe(v3);
      expect(generatedDetails!.items[1].questionVersionId).toBe(v2);
      expect(generatedDetails!.items[2].questionVersionId).toBe(v1);
    } finally {
      // Cleanup database
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
        .where(inArray(questionAlternatives.questionVersionId, [v1, v2, v3]));
      await db
        .delete(questionVersions)
        .where(inArray(questionVersions.id, [v1, v2, v3]));
      await db.delete(questions).where(inArray(questions.id, [q1, q2, q3]));
      await db.delete(taxonomyNodes).where(eq(taxonomyNodes.id, taxonomyId));
      await db.delete(users).where(eq(users.id, userId));
    }
  });
});
