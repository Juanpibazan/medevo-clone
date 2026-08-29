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
        statement: "Paciente con cuadro respiratorio...",
        explanation: "Explicación general",
        subquestions: [
          {
            letter: "a",
            statement: "¿Cuál es el diagnóstico más probable?",
            explanation: "Neumonía adquirida en la comunidad",
          },
          {
            letter: "b",
            statement: "¿Cuál es la conducta terapéutica inicial?",
            explanation: "Amoxicilina + Clavulánico vía oral por 7 días",
          },
        ],
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

      // Ensure subquestions exist and their explanations are hidden before verification
      expect(item.subquestions).toHaveLength(2);
      expect(item.subquestions![0].explanation).toBeNull();
      expect(item.subquestions![1].explanation).toBeNull();

      // 3. Save draft answer (JSON-serialized responseText for subquestions)
      const answersPayload = JSON.stringify({
        a: "Neumonía comunitaria",
        b: "Amoxicilina",
      });
      await practiceService.saveDraftResponse(
        session.id,
        item.id,
        userId,
        null,
        30,
        answersPayload,
      );

      const sessionAfterDraft = await practiceService.getSession(
        session.id,
        userId,
      );
      expect(sessionAfterDraft!.items[0].response?.responseText).toBe(
        answersPayload,
      );

      // 4. Verify/Evaluate response with granular subquestion evaluation
      const verifyResult = await practiceService.verifyResponse(
        session.id,
        item.id,
        userId,
        null,
        45,
        { a: true, b: true }, // 2/2 = 1.0 > 0.5 -> true
      );
      expect(verifyResult.response.isCorrect).toBe(true);
      expect(verifyResult.subquestions).toHaveLength(2);
      expect(verifyResult.subquestions![0].explanation).toBe(
        "Neumonía adquirida en la comunidad",
      );

      // 4.1 Session details after verification now reveals subquestion explanations and structured responseText
      const sessionAfterVerify = await practiceService.getSession(
        session.id,
        userId,
      );
      expect(sessionAfterVerify!.items[0].subquestions![0].explanation).toBe(
        "Neumonía adquirida en la comunidad",
      );
      expect(sessionAfterVerify!.items[0].subquestions![1].explanation).toBe(
        "Amoxicilina + Clavulánico vía oral por 7 días",
      );

      const parsedResponse = JSON.parse(
        sessionAfterVerify!.items[0].response!.responseText!,
      );
      expect(parsedResponse.evaluations).toEqual({ a: true, b: true });
      expect(parsedResponse.answers.a).toBe("Neumonía comunitaria");

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

  it("should evaluate precision strictly > 50% across 2, 3, and 4 subquestions and enforce complete evaluation", async () => {
    const userId = randomUUID();
    const taxonomyId = "tax-granular-test";
    const qId2 = "q-disc-2sub";
    const qId3 = "q-disc-3sub";
    const qId4 = "q-disc-4sub";
    const vId2 = "qv-disc-2sub";
    const vId3 = "qv-disc-3sub";
    const vId4 = "qv-disc-4sub";

    try {
      await db.insert(users).values({
        id: userId,
        name: "Granular Student",
        email: `${userId}@example.test`,
      });

      await db.insert(taxonomyNodes).values({
        id: taxonomyId,
        name: "Test Taxonomy",
        level: "specialty",
      });

      // 2 subquestions question
      await db.insert(questions).values({ id: qId2 });
      await db.insert(questionVersions).values({
        id: vId2,
        questionId: qId2,
        versionNumber: 1,
        status: "published",
        title: "2 Subquestions",
        statement: "Enunciado 2 subpreguntas",
        explanation: "Explicacion general",
        type: "open_ended",
        subquestions: [
          { letter: "a", statement: "Sub A", explanation: "Exp A" },
          { letter: "b", statement: "Sub B", explanation: "Exp B" },
        ],
        taxonomyNodeId: taxonomyId,
        createdBy: userId,
      });
      await db
        .update(questions)
        .set({ publishedVersionId: vId2 })
        .where(eq(questions.id, qId2));

      // 3 subquestions question
      await db.insert(questions).values({ id: qId3 });
      await db.insert(questionVersions).values({
        id: vId3,
        questionId: qId3,
        versionNumber: 1,
        status: "published",
        title: "3 Subquestions",
        statement: "Enunciado 3 subpreguntas",
        explanation: "Explicacion general",
        type: "open_ended",
        subquestions: [
          { letter: "a", statement: "Sub A", explanation: "Exp A" },
          { letter: "b", statement: "Sub B", explanation: "Exp B" },
          { letter: "c", statement: "Sub C", explanation: "Exp C" },
        ],
        taxonomyNodeId: taxonomyId,
        createdBy: userId,
      });
      await db
        .update(questions)
        .set({ publishedVersionId: vId3 })
        .where(eq(questions.id, qId3));

      // 4 subquestions question
      await db.insert(questions).values({ id: qId4 });
      await db.insert(questionVersions).values({
        id: vId4,
        questionId: qId4,
        versionNumber: 1,
        status: "published",
        title: "4 Subquestions",
        statement: "Enunciado 4 subpreguntas",
        explanation: "Explicacion general",
        type: "open_ended",
        subquestions: [
          { letter: "a", statement: "Sub A", explanation: "Exp A" },
          { letter: "b", statement: "Sub B", explanation: "Exp B" },
          { letter: "c", statement: "Sub C", explanation: "Exp C" },
          { letter: "d", statement: "Sub D", explanation: "Exp D" },
        ],
        taxonomyNodeId: taxonomyId,
        createdBy: userId,
      });
      await db
        .update(questions)
        .set({ publishedVersionId: vId4 })
        .where(eq(questions.id, qId4));

      // Test 1: 2 subquestions - 1/2 (50%) must be INCORRECT (strict > 50%)
      const session2 = await practiceService.createSession(userId, [vId2]);
      const item2 = (await practiceService.getSession(session2.id, userId))!
        .items[0];

      // Missing evaluation should throw
      await expect(
        practiceService.verifyResponse(
          session2.id,
          item2.id,
          userId,
          null,
          20,
          { a: true } as Record<string, boolean>, // missing 'b'
        ),
      ).rejects.toThrow("Missing evaluation for subquestion b");

      // 1 of 2 correct (50% precision) -> isCorrect: false
      const result2 = await practiceService.verifyResponse(
        session2.id,
        item2.id,
        userId,
        null,
        25,
        { a: true, b: false },
      );
      expect(result2.response.isCorrect).toBe(false);

      // Test 2: 3 subquestions - 2/3 (66.7%) must be CORRECT (> 50%)
      const session3 = await practiceService.createSession(userId, [vId3]);
      const item3 = (await practiceService.getSession(session3.id, userId))!
        .items[0];

      const result3 = await practiceService.verifyResponse(
        session3.id,
        item3.id,
        userId,
        null,
        30,
        { a: true, b: true, c: false },
      );
      expect(result3.response.isCorrect).toBe(true);

      // Test 3: 4 subquestions - 2/4 (50%) must be INCORRECT, 3/4 (75%) must be CORRECT
      const session4a = await practiceService.createSession(userId, [vId4]);
      const item4a = (await practiceService.getSession(session4a.id, userId))!
        .items[0];

      const result4a = await practiceService.verifyResponse(
        session4a.id,
        item4a.id,
        userId,
        null,
        40,
        { a: true, b: true, c: false, d: false }, // 2 of 4 (50%)
      );
      expect(result4a.response.isCorrect).toBe(false);

      const session4b = await practiceService.createSession(userId, [vId4]);
      const item4b = (await practiceService.getSession(session4b.id, userId))!
        .items[0];

      const result4b = await practiceService.verifyResponse(
        session4b.id,
        item4b.id,
        userId,
        null,
        40,
        { a: true, b: true, c: true, d: false }, // 3 of 4 (75%)
      );
      expect(result4b.response.isCorrect).toBe(true);
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
        .where(inArray(questionVersions.id, [vId2, vId3, vId4]));
      await db.delete(questions).where(inArray(questions.id, [qId2, qId3, qId4]));
      await db.delete(taxonomyNodes).where(eq(taxonomyNodes.id, taxonomyId));
      await db.delete(users).where(eq(users.id, userId));
    }
  });
});
