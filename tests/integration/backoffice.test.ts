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
  editorialReviews,
  questionImages,
} from "@/db/schema";
import { editorialService } from "@/modules/content";

describe("Visual Backoffice Editorial Integration Tests", () => {
  afterAll(() => pool.end());

  it("should complete a full question versioning lifecycle (create draft -> update -> submit -> approve -> edit published -> review request changes -> annul)", async () => {
    const editorId = randomUUID();
    const reviewerId = randomUUID();
    const taxonomyId = "backoffice-test-tax-" + randomUUID();

    // Setup helper data
    await db.insert(users).values([
      { id: editorId, name: "Dr. Editor", email: `${editorId}@editor.test` },
      {
        id: reviewerId,
        name: "Dr. Reviewer",
        email: `${reviewerId}@reviewer.test`,
      },
    ]);

    await db.insert(taxonomyNodes).values({
      id: taxonomyId,
      name: "Backoffice Test Specialty",
      level: "specialty",
    });

    try {
      // 1. Create a draft question version 1
      const draftResult = await editorialService.createQuestionDraft(editorId, {
        title: "Test Question v1",
        statement: "What is the capital of France?",
        explanation: "Paris is the capital.",
        taxonomyNodeId: taxonomyId,
        alternatives: [
          { optionLetter: "A", text: "Berlin", isCorrect: false },
          { optionLetter: "B", text: "Paris", isCorrect: true },
          { optionLetter: "C", text: "Madrid", isCorrect: false },
        ],
      });

      const qId = draftResult.questionId;
      const vId = draftResult.versionId;

      expect(qId).toBeDefined();
      expect(vId).toBeDefined();

      // Verify draft in database
      const [versionRow] = await db
        .select()
        .from(questionVersions)
        .where(eq(questionVersions.id, vId));

      expect(versionRow).toBeDefined();
      expect(versionRow.versionNumber).toBe(1);
      expect(versionRow.status).toBe("draft");

      const [questionRow] = await db
        .select()
        .from(questions)
        .where(eq(questions.id, qId));

      expect(questionRow).toBeDefined();
      expect(questionRow.publishedVersionId).toBeNull(); // Not published yet

      // 2. Update the draft
      await editorialService.updateQuestionDraft(editorId, vId, {
        title: "Test Question v1 Updated",
        statement: "What is the capital of France? (Updated)",
        explanation: "Paris is the capital. (Updated)",
        taxonomyNodeId: taxonomyId,
        alternatives: [
          { optionLetter: "A", text: "Berlin", isCorrect: false },
          { optionLetter: "B", text: "Paris", isCorrect: true },
          { optionLetter: "C", text: "London", isCorrect: false },
        ],
      });

      const updatedAlts = await db
        .select()
        .from(questionAlternatives)
        .where(eq(questionAlternatives.questionVersionId, vId));

      expect(updatedAlts.length).toBe(3);
      expect(updatedAlts.find((a) => a.optionLetter === "C")?.text).toBe(
        "London",
      );

      // 3. Submit for review
      await editorialService.submitForReview(editorId, vId);

      const [versionRowAfterSubmit] = await db
        .select()
        .from(questionVersions)
        .where(eq(questionVersions.id, vId));

      expect(versionRowAfterSubmit.status).toBe("in_review");

      // Cannot edit while in review
      await expect(
        editorialService.updateQuestionDraft(editorId, vId, {
          title: "Cheat Edit",
          statement: "X",
          explanation: "Y",
          taxonomyNodeId: taxonomyId,
          alternatives: [
            { optionLetter: "A", text: "A", isCorrect: true },
            { optionLetter: "B", text: "B", isCorrect: false },
          ],
        }),
      ).rejects.toThrow();

      // 4. Request Changes
      await editorialService.reviewQuestion(
        reviewerId,
        vId,
        "changes_requested",
        "Fix alternative C spelling",
      );

      const [versionRowAfterReject] = await db
        .select()
        .from(questionVersions)
        .where(eq(questionVersions.id, vId));

      expect(versionRowAfterReject.status).toBe("draft");

      const [reviewRow] = await db
        .select()
        .from(editorialReviews)
        .where(eq(editorialReviews.questionVersionId, vId));

      expect(reviewRow).toBeDefined();
      expect(reviewRow.status).toBe("changes_requested");
      expect(reviewRow.comments).toBe("Fix alternative C spelling");

      // 5. Update draft and resubmit
      await editorialService.submitForReview(editorId, vId);

      // 6. Approve and Publish
      await editorialService.reviewQuestion(
        reviewerId,
        vId,
        "approved",
        "Looks great now!",
      );

      const [versionRowAfterApprove] = await db
        .select()
        .from(questionVersions)
        .where(eq(questionVersions.id, vId));

      expect(versionRowAfterApprove.status).toBe("published");

      const [questionRowAfterApprove] = await db
        .select()
        .from(questions)
        .where(eq(questions.id, qId));

      expect(questionRowAfterApprove.publishedVersionId).toBe(vId);

      // 7. Edit published question (spawns v2 draft)
      const draftV2Result = await editorialService.createDraftFromPublished(
        editorId,
        qId,
      );
      const v2Id = draftV2Result.versionId;

      const [version2Row] = await db
        .select()
        .from(questionVersions)
        .where(eq(questionVersions.id, v2Id));

      expect(version2Row).toBeDefined();
      expect(version2Row.versionNumber).toBe(2);
      expect(version2Row.status).toBe("draft");
      expect(version2Row.title).toBe(versionRowAfterApprove.title);

      // Check that the active version remains v1 published version
      const [questionRowAfterV2Draft] = await db
        .select()
        .from(questions)
        .where(eq(questions.id, qId));

      expect(questionRowAfterV2Draft.publishedVersionId).toBe(vId);

      // 8. Annul the question
      await editorialService.annulQuestion(reviewerId, qId);

      const [version1RowAfterAnnul] = await db
        .select()
        .from(questionVersions)
        .where(eq(questionVersions.id, vId));

      expect(version1RowAfterAnnul.status).toBe("annulled");
    } finally {
      // Find all questions created in this test
      const createdVersions = await db
        .select({
          id: questionVersions.id,
          questionId: questionVersions.questionId,
        })
        .from(questionVersions)
        .where(eq(questionVersions.createdBy, editorId));

      const versionIds = createdVersions.map((v) => v.id);
      const questionIds = Array.from(
        new Set(createdVersions.map((v) => v.questionId)),
      );

      if (versionIds.length > 0) {
        await db
          .delete(editorialReviews)
          .where(inArray(editorialReviews.questionVersionId, versionIds));
        await db
          .delete(questionAlternatives)
          .where(inArray(questionAlternatives.questionVersionId, versionIds));
        await db
          .delete(questionVersions)
          .where(inArray(questionVersions.id, versionIds));
      }

      if (questionIds.length > 0) {
        // Clear references on questions before deleting
        await db
          .update(questions)
          .set({ publishedVersionId: null })
          .where(inArray(questions.id, questionIds));
        await db.delete(questions).where(inArray(questions.id, questionIds));
      }

      await db.delete(taxonomyNodes).where(eq(taxonomyNodes.id, taxonomyId));
      await db.delete(users).where(inArray(users.id, [editorId, reviewerId]));
    }
  });

  it("should support open-ended questions with images in backoffice", async () => {
    const editorId = randomUUID();
    const taxonomyId = "backoffice-test-tax-" + randomUUID();

    await db.insert(users).values({
      id: editorId,
      name: "Dr. Editor Discursive",
      email: `${editorId}@editor.test`,
    });

    await db.insert(taxonomyNodes).values({
      id: taxonomyId,
      name: "Backoffice Test Specialty Discursive",
      level: "specialty",
    });

    try {
      const draftResult = await editorialService.createQuestionDraft(editorId, {
        title: "Discursive Question v1",
        statement: "Describe the symptoms of appendicitis.",
        explanation: "Right lower quadrant pain, fever, nausea.",
        taxonomyNodeId: taxonomyId,
        type: "open_ended",
        alternatives: [],
        images: [
          { url: "https://example.com/image1.png", position: 0 },
          { url: "https://example.com/image2.png", position: 1 },
        ],
      });

      const qId = draftResult.questionId;
      const vId = draftResult.versionId;

      expect(qId).toBeDefined();
      expect(vId).toBeDefined();

      const [versionRow] = await db
        .select()
        .from(questionVersions)
        .where(eq(questionVersions.id, vId));

      expect(versionRow).toBeDefined();
      expect(versionRow.type).toBe("open_ended");

      const questionImagesRows = await db
        .select()
        .from(questionImages)
        .where(eq(questionImages.questionVersionId, vId))
        .orderBy(questionImages.position);

      expect(questionImagesRows.length).toBe(2);
      expect(questionImagesRows[0].url).toBe("https://example.com/image1.png");
      expect(questionImagesRows[1].url).toBe("https://example.com/image2.png");

      // Verify validation: open_ended question cannot have alternatives
      await expect(
        editorialService.createQuestionDraft(editorId, {
          title: "Discursive Question invalid",
          statement: "X",
          explanation: "Y",
          taxonomyNodeId: taxonomyId,
          type: "open_ended",
          alternatives: [{ optionLetter: "A", text: "Text", isCorrect: true }],
        }),
      ).rejects.toThrow();
    } finally {
      // Cleanup
      const createdVersions = await db
        .select({
          id: questionVersions.id,
          questionId: questionVersions.questionId,
        })
        .from(questionVersions)
        .where(eq(questionVersions.createdBy, editorId));

      const versionIds = createdVersions.map((v) => v.id);
      const questionIds = Array.from(
        new Set(createdVersions.map((v) => v.questionId)),
      );

      if (versionIds.length > 0) {
        await db
          .delete(questionImages)
          .where(inArray(questionImages.questionVersionId, versionIds));
        await db
          .delete(questionVersions)
          .where(inArray(questionVersions.id, versionIds));
      }
      if (questionIds.length > 0) {
        await db.delete(questions).where(inArray(questions.id, questionIds));
      }
      await db.delete(taxonomyNodes).where(eq(taxonomyNodes.id, taxonomyId));
      await db.delete(users).where(eq(users.id, editorId));
    }
  });

  it("should support open-ended questions with subquestions in backoffice", async () => {
    const editorId = randomUUID();
    const taxonomyId = "backoffice-test-tax-" + randomUUID();

    await db.insert(users).values({
      id: editorId,
      name: "Dr. Editor Subquestions",
      email: `${editorId}@editor.test`,
    });

    await db.insert(taxonomyNodes).values({
      id: taxonomyId,
      name: "Backoffice Test Specialty Subquestions",
      level: "specialty",
    });

    try {
      // 1. Create draft with subquestions
      const draftResult = await editorialService.createQuestionDraft(editorId, {
        title: "Discursive with subquestions v1",
        statement: "Enunciado general.",
        explanation: "Criterio general.",
        taxonomyNodeId: taxonomyId,
        type: "open_ended",
        alternatives: [],
        subquestions: [
          { letter: "A", statement: "Subgunta A", explanation: "Gabarito A" },
          { letter: "B", statement: "Subgunta B", explanation: "Gabarito B" },
        ],
      });

      const qId = draftResult.questionId;
      const vId = draftResult.versionId;

      expect(qId).toBeDefined();
      expect(vId).toBeDefined();

      const [versionRow] = await db
        .select()
        .from(questionVersions)
        .where(eq(questionVersions.id, vId));

      expect(versionRow).toBeDefined();
      expect(versionRow.type).toBe("open_ended");
      expect(versionRow.subquestions).toBeDefined();
      expect(versionRow.subquestions?.length).toBe(2);
      expect(versionRow.subquestions?.[0].letter).toBe("A");
      expect(versionRow.subquestions?.[1].statement).toBe("Subgunta B");

      // 2. Update draft with modified subquestions
      await editorialService.updateQuestionDraft(editorId, vId, {
        title: "Discursive with subquestions v1 updated",
        statement: "Enunciado general.",
        explanation: "Criterio general.",
        taxonomyNodeId: taxonomyId,
        type: "open_ended",
        alternatives: [],
        subquestions: [
          {
            letter: "A",
            statement: "Subgunta A modificada",
            explanation: "Gabarito A",
          },
        ],
      });

      const [updatedRow] = await db
        .select()
        .from(questionVersions)
        .where(eq(questionVersions.id, vId));

      expect(updatedRow.subquestions?.length).toBe(1);
      expect(updatedRow.subquestions?.[0].statement).toBe(
        "Subgunta A modificada",
      );

      // 3. Validation: Reject empty subquestion fields
      await expect(
        editorialService.createQuestionDraft(editorId, {
          title: "Invalid empty subquestion",
          statement: "X",
          explanation: "Y",
          taxonomyNodeId: taxonomyId,
          type: "open_ended",
          alternatives: [],
          subquestions: [
            { letter: "A", statement: "", explanation: "Gabarito" },
          ],
        }),
      ).rejects.toThrow();

      // 4. Validation: Reject subquestions on multiple-choice questions
      await expect(
        editorialService.createQuestionDraft(editorId, {
          title: "Invalid MC with subquestions",
          statement: "X",
          explanation: "Y",
          taxonomyNodeId: taxonomyId,
          type: "multiple_choice",
          alternatives: [
            { optionLetter: "A", text: "Alt A", isCorrect: true },
            { optionLetter: "B", text: "Alt B", isCorrect: false },
          ],
          subquestions: [
            { letter: "A", statement: "Sub A", explanation: "Gabarito" },
          ],
        }),
      ).rejects.toThrow();
    } finally {
      // Cleanup
      const createdVersions = await db
        .select({
          id: questionVersions.id,
          questionId: questionVersions.questionId,
        })
        .from(questionVersions)
        .where(eq(questionVersions.createdBy, editorId));

      const versionIds = createdVersions.map((v) => v.id);
      const questionIds = Array.from(
        new Set(createdVersions.map((v) => v.questionId)),
      );

      if (versionIds.length > 0) {
        await db
          .delete(questionVersions)
          .where(inArray(questionVersions.id, versionIds));
      }
      if (questionIds.length > 0) {
        await db.delete(questions).where(inArray(questions.id, questionIds));
      }
      await db.delete(taxonomyNodes).where(eq(taxonomyNodes.id, taxonomyId));
      await db.delete(users).where(eq(users.id, editorId));
    }
  });
});
