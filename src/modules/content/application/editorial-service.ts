import { db } from "@/db/client";
import {
  questions,
  questionVersions,
  questionAlternatives,
  questionImages,
  editorialReviews,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  validateQuestionAlternatives,
  validateQuestionSubquestions,
} from "../domain/content";
import type { AlternativeLetter, QuestionType } from "../domain/content";

export interface QuestionDraftInput {
  title: string;
  statement: string;
  explanation: string;
  taxonomyNodeId: string;
  type?: QuestionType;
  alternatives: Array<{
    optionLetter: AlternativeLetter;
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
}

export class EditorialService {
  async createQuestionDraft(
    editorId: string,
    input: QuestionDraftInput,
  ): Promise<{ questionId: string; versionId: string }> {
    const qType = input.type ?? "multiple_choice";
    const validation = validateQuestionAlternatives(input.alternatives, qType);
    if (!validation.success) {
      throw new Error(`Invalid alternatives configuration: ${validation.code}`);
    }

    const subValidation = validateQuestionSubquestions(
      input.subquestions,
      qType,
    );
    if (!subValidation.success) {
      throw new Error(
        `Invalid subquestions configuration: ${subValidation.code}`,
      );
    }

    const questionId = crypto.randomUUID();
    const versionId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      await tx.insert(questions).values({
        id: questionId,
      });

      await tx.insert(questionVersions).values({
        id: versionId,
        questionId,
        versionNumber: 1,
        status: "draft",
        type: qType,
        title: input.title,
        statement: input.statement,
        explanation: input.explanation,
        subquestions: input.subquestions || null,
        taxonomyNodeId: input.taxonomyNodeId,
        createdBy: editorId,
      });

      if (input.images && input.images.length > 0) {
        const imagesToInsert = input.images.map((img) => ({
          id: crypto.randomUUID(),
          questionVersionId: versionId,
          url: img.url,
          position: img.position,
        }));
        await tx.insert(questionImages).values(imagesToInsert);
      }

      const alternativesToInsert = input.alternatives.map((alt) => ({
        id: crypto.randomUUID(),
        questionVersionId: versionId,
        optionLetter: alt.optionLetter,
        text: alt.text,
        isCorrect: alt.isCorrect,
      }));

      if (alternativesToInsert.length > 0) {
        await tx.insert(questionAlternatives).values(alternativesToInsert);
      }
    });

    return { questionId, versionId };
  }

  async createDraftFromPublished(
    editorId: string,
    questionId: string,
  ): Promise<{ versionId: string }> {
    return db.transaction(async (tx) => {
      const [question] = await tx
        .select()
        .from(questions)
        .where(eq(questions.id, questionId))
        .limit(1);

      if (!question) {
        throw new Error("Question not found");
      }

      if (!question.publishedVersionId) {
        throw new Error("Question has no published version");
      }

      // Check if there is already a draft or in_review version
      const existingVersions = await tx
        .select()
        .from(questionVersions)
        .where(eq(questionVersions.questionId, questionId))
        .orderBy(desc(questionVersions.versionNumber));

      const hasPending = existingVersions.some(
        (v) => v.status === "draft" || v.status === "in_review",
      );
      if (hasPending) {
        throw new Error(
          "A draft or review version already exists for this question",
        );
      }

      const publishedVersion = existingVersions.find(
        (v) => v.id === question.publishedVersionId,
      );
      if (!publishedVersion) {
        throw new Error("Published version details not found");
      }

      const publishedAlternatives = await tx
        .select()
        .from(questionAlternatives)
        .where(eq(questionAlternatives.questionVersionId, publishedVersion.id));

      const publishedImages = await tx
        .select()
        .from(questionImages)
        .where(eq(questionImages.questionVersionId, publishedVersion.id));

      const newVersionId = crypto.randomUUID();
      const newVersionNumber = publishedVersion.versionNumber + 1;

      await tx.insert(questionVersions).values({
        id: newVersionId,
        questionId,
        versionNumber: newVersionNumber,
        status: "draft",
        type: publishedVersion.type,
        title: publishedVersion.title,
        statement: publishedVersion.statement,
        explanation: publishedVersion.explanation,
        subquestions: publishedVersion.subquestions,
        taxonomyNodeId: publishedVersion.taxonomyNodeId,
        createdBy: editorId,
      });

      const newAlternatives = publishedAlternatives.map((alt) => ({
        id: crypto.randomUUID(),
        questionVersionId: newVersionId,
        optionLetter: alt.optionLetter as AlternativeLetter,
        text: alt.text,
        isCorrect: alt.isCorrect,
      }));

      if (newAlternatives.length > 0) {
        await tx.insert(questionAlternatives).values(newAlternatives);
      }

      if (publishedImages.length > 0) {
        const newImages = publishedImages.map((img) => ({
          id: crypto.randomUUID(),
          questionVersionId: newVersionId,
          url: img.url,
          position: img.position,
        }));
        await tx.insert(questionImages).values(newImages);
      }

      return { versionId: newVersionId };
    });
  }

  async updateQuestionDraft(
    editorId: string,
    versionId: string,
    input: QuestionDraftInput,
  ): Promise<void> {
    const qType = input.type ?? "multiple_choice";
    const validation = validateQuestionAlternatives(input.alternatives, qType);
    if (!validation.success) {
      throw new Error(`Invalid alternatives configuration: ${validation.code}`);
    }

    const subValidation = validateQuestionSubquestions(
      input.subquestions,
      qType,
    );
    if (!subValidation.success) {
      throw new Error(
        `Invalid subquestions configuration: ${subValidation.code}`,
      );
    }

    await db.transaction(async (tx) => {
      const [version] = await tx
        .select()
        .from(questionVersions)
        .where(eq(questionVersions.id, versionId))
        .limit(1);

      if (!version) {
        throw new Error("Question version not found");
      }

      if (version.status !== "draft") {
        throw new Error("Only draft versions can be edited");
      }

      // Update version metadata
      await tx
        .update(questionVersions)
        .set({
          title: input.title,
          statement: input.statement,
          explanation: input.explanation,
          subquestions: input.subquestions || null,
          taxonomyNodeId: input.taxonomyNodeId,
          type: qType,
          createdBy: editorId, // update last editor
        })
        .where(eq(questionVersions.id, versionId));

      // Remove existing alternatives
      await tx
        .delete(questionAlternatives)
        .where(eq(questionAlternatives.questionVersionId, versionId));

      // Insert new alternatives if it's multiple choice
      const alternativesToInsert = input.alternatives.map((alt) => ({
        id: crypto.randomUUID(),
        questionVersionId: versionId,
        optionLetter: alt.optionLetter,
        text: alt.text,
        isCorrect: alt.isCorrect,
      }));

      if (alternativesToInsert.length > 0) {
        await tx.insert(questionAlternatives).values(alternativesToInsert);
      }

      // Update images
      await tx
        .delete(questionImages)
        .where(eq(questionImages.questionVersionId, versionId));

      if (input.images && input.images.length > 0) {
        const imagesToInsert = input.images.map((img) => ({
          id: crypto.randomUUID(),
          questionVersionId: versionId,
          url: img.url,
          position: img.position,
        }));
        await tx.insert(questionImages).values(imagesToInsert);
      }

      // Update question updatedAt
      await tx
        .update(questions)
        .set({ updatedAt: new Date() })
        .where(eq(questions.id, version.questionId));
    });
  }

  async submitForReview(editorId: string, versionId: string): Promise<void> {
    const [version] = await db
      .select()
      .from(questionVersions)
      .where(eq(questionVersions.id, versionId))
      .limit(1);

    if (!version) {
      throw new Error("Question version not found");
    }

    if (version.status !== "draft") {
      throw new Error("Only draft versions can be submitted for review");
    }

    await db
      .update(questionVersions)
      .set({ status: "in_review" })
      .where(eq(questionVersions.id, versionId));
  }

  async reviewQuestion(
    reviewerId: string,
    versionId: string,
    decision: "approved" | "changes_requested",
    comments?: string,
  ): Promise<void> {
    await db.transaction(async (tx) => {
      const [version] = await tx
        .select()
        .from(questionVersions)
        .where(eq(questionVersions.id, versionId))
        .limit(1);

      if (!version) {
        throw new Error("Question version not found");
      }

      if (version.status !== "in_review") {
        throw new Error("Only versions in review can be reviewed");
      }

      const reviewId = crypto.randomUUID();
      const dbStatus =
        decision === "approved" ? "approved" : "changes_requested";

      await tx.insert(editorialReviews).values({
        id: reviewId,
        questionVersionId: versionId,
        reviewerId,
        status: dbStatus,
        comments: comments || null,
      });

      if (decision === "approved") {
        // Set version status to published
        await tx
          .update(questionVersions)
          .set({ status: "published" })
          .where(eq(questionVersions.id, versionId));

        // Update the question's active published version
        await tx
          .update(questions)
          .set({
            publishedVersionId: versionId,
            updatedAt: new Date(),
          })
          .where(eq(questions.id, version.questionId));
      } else {
        // Return to draft status
        await tx
          .update(questionVersions)
          .set({ status: "draft" })
          .where(eq(questionVersions.id, versionId));
      }
    });
  }

  async annulQuestion(reviewerId: string, questionId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [question] = await tx
        .select()
        .from(questions)
        .where(eq(questions.id, questionId))
        .limit(1);

      if (!question) {
        throw new Error("Question not found");
      }

      if (!question.publishedVersionId) {
        throw new Error("Question has no active published version to annul");
      }

      const versionId = question.publishedVersionId;

      // Update version status to annulled
      await tx
        .update(questionVersions)
        .set({ status: "annulled" })
        .where(eq(questionVersions.id, versionId));

      const reviewId = crypto.randomUUID();
      await tx.insert(editorialReviews).values({
        id: reviewId,
        questionVersionId: versionId,
        reviewerId,
        status: "annulled",
        comments: "Question annulled by reviewer",
      });
    });
  }
}
