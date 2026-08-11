import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  questions,
  questionVersions,
  questionAlternatives,
  taxonomyNodes,
} from "@/db/schema";
import type { ContentRepository } from "../application/content-service";
import type {
  Alternative,
  Question,
  QuestionVersion,
  TaxonomyNode,
  QuestionStatus,
  AlternativeLetter,
  TaxonomyLevel,
} from "../domain/content";

export class DrizzleContentRepository implements ContentRepository {
  async findPublishedQuestions(): Promise<
    Array<{
      question: Question;
      activeVersion: QuestionVersion;
      alternatives: Alternative[];
    }>
  > {
    const activeQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.publishedVersionId, questions.publishedVersionId));

    const filtered = activeQuestions.filter(
      (q) => q.publishedVersionId !== null,
    ) as Array<
      Omit<typeof questions.$inferSelect, "publishedVersionId"> & {
        publishedVersionId: string;
      }
    >;

    if (filtered.length === 0) return [];

    const versionIds = filtered.map((q) => q.publishedVersionId);

    const versions = await db
      .select()
      .from(questionVersions)
      .where(inArray(questionVersions.id, versionIds));

    const alternatives = await db
      .select()
      .from(questionAlternatives)
      .where(inArray(questionAlternatives.questionVersionId, versionIds));

    return filtered.map((q) => {
      const version = versions.find((v) => v.id === q.publishedVersionId)!;
      const alts = alternatives.filter(
        (a) => a.questionVersionId === version.id,
      );
      return {
        question: {
          id: q.id,
          publishedVersionId: q.publishedVersionId,
          createdAt: q.createdAt,
          updatedAt: q.updatedAt,
        },
        activeVersion: {
          id: version.id,
          questionId: version.questionId,
          versionNumber: version.versionNumber,
          status: version.status as QuestionStatus,
          title: version.title,
          statement: version.statement,
          explanation: version.explanation,
          taxonomyNodeId: version.taxonomyNodeId,
          createdBy: version.createdBy,
          createdAt: version.createdAt,
        },
        alternatives: alts.map((a) => ({
          id: a.id,
          questionVersionId: a.questionVersionId,
          optionLetter: a.optionLetter as AlternativeLetter,
          text: a.text,
          isCorrect: a.isCorrect,
          createdAt: a.createdAt,
        })),
      };
    });
  }

  async getQuestionVersion(versionId: string): Promise<{
    question: Question;
    version: QuestionVersion;
    alternatives: Alternative[];
  } | null> {
    const [version] = await db
      .select()
      .from(questionVersions)
      .where(eq(questionVersions.id, versionId))
      .limit(1);

    if (!version) return null;

    const [q] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, version.questionId))
      .limit(1);

    if (!q) return null;

    const alts = await db
      .select()
      .from(questionAlternatives)
      .where(eq(questionAlternatives.questionVersionId, versionId));

    return {
      question: {
        id: q.id,
        publishedVersionId: q.publishedVersionId,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      },
      version: {
        id: version.id,
        questionId: version.questionId,
        versionNumber: version.versionNumber,
        status: version.status as QuestionStatus,
        title: version.title,
        statement: version.statement,
        explanation: version.explanation,
        taxonomyNodeId: version.taxonomyNodeId,
        createdBy: version.createdBy,
        createdAt: version.createdAt,
      },
      alternatives: alts.map((a) => ({
        id: a.id,
        questionVersionId: a.questionVersionId,
        optionLetter: a.optionLetter as AlternativeLetter,
        text: a.text,
        isCorrect: a.isCorrect,
        createdAt: a.createdAt,
      })),
    };
  }

  async getQuestionWithActiveVersion(questionId: string): Promise<{
    question: Question;
    activeVersion: QuestionVersion;
    alternatives: Alternative[];
  } | null> {
    const [q] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);

    if (!q || !q.publishedVersionId) return null;

    const data = await this.getQuestionVersion(q.publishedVersionId);
    if (!data) return null;

    return {
      question: data.question,
      activeVersion: data.version,
      alternatives: data.alternatives,
    };
  }

  async createQuestionWithVersion(
    questionId: string,
    versionId: string,
    versionInput: Omit<
      QuestionVersion,
      "id" | "questionId" | "versionNumber" | "status" | "createdAt"
    >,
    alternativesInput: Array<
      Omit<Alternative, "id" | "questionVersionId" | "createdAt">
    >,
  ): Promise<{
    question: Question;
    version: QuestionVersion;
    alternatives: Alternative[];
  }> {
    return db.transaction(async (tx) => {
      await tx.insert(questions).values({
        id: questionId,
      });

      await tx.insert(questionVersions).values({
        id: versionId,
        questionId,
        versionNumber: 1,
        status: "published",
        title: versionInput.title,
        statement: versionInput.statement,
        explanation: versionInput.explanation,
        taxonomyNodeId: versionInput.taxonomyNodeId,
        createdBy: versionInput.createdBy,
      });

      await tx
        .update(questions)
        .set({ publishedVersionId: versionId, updatedAt: new Date() })
        .where(eq(questions.id, questionId));

      const altsToInsert = alternativesInput.map((a) => ({
        id: crypto.randomUUID(),
        questionVersionId: versionId,
        optionLetter: a.optionLetter,
        text: a.text,
        isCorrect: a.isCorrect,
      }));

      await tx.insert(questionAlternatives).values(altsToInsert);

      const [insertedQ] = await tx
        .select()
        .from(questions)
        .where(eq(questions.id, questionId));
      const [insertedV] = await tx
        .select()
        .from(questionVersions)
        .where(eq(questionVersions.id, versionId));
      const insertedAlts = await tx
        .select()
        .from(questionAlternatives)
        .where(eq(questionAlternatives.questionVersionId, versionId));

      return {
        question: insertedQ as Question,
        version: {
          id: insertedV.id,
          questionId: insertedV.questionId,
          versionNumber: insertedV.versionNumber,
          status: insertedV.status as QuestionStatus,
          title: insertedV.title,
          statement: insertedV.statement,
          explanation: insertedV.explanation,
          taxonomyNodeId: insertedV.taxonomyNodeId,
          createdBy: insertedV.createdBy,
          createdAt: insertedV.createdAt,
        },
        alternatives: insertedAlts.map((a) => ({
          id: a.id,
          questionVersionId: a.questionVersionId,
          optionLetter: a.optionLetter as AlternativeLetter,
          text: a.text,
          isCorrect: a.isCorrect,
          createdAt: a.createdAt,
        })),
      };
    });
  }

  async listQuestions(): Promise<
    Array<{ question: Question; activeVersion: QuestionVersion | null }>
  > {
    const list = await db.select().from(questions);
    if (list.length === 0) return [];

    const versionIds = list
      .map((q) => q.publishedVersionId)
      .filter((id): id is string => id !== null);

    const versions =
      versionIds.length > 0
        ? await db
            .select()
            .from(questionVersions)
            .where(inArray(questionVersions.id, versionIds))
        : [];

    return list.map((q) => {
      const activeVersionRow = q.publishedVersionId
        ? versions.find((v) => v.id === q.publishedVersionId) || null
        : null;
      const activeVersion: QuestionVersion | null = activeVersionRow
        ? {
            id: activeVersionRow.id,
            questionId: activeVersionRow.questionId,
            versionNumber: activeVersionRow.versionNumber,
            status: activeVersionRow.status as QuestionStatus,
            title: activeVersionRow.title,
            statement: activeVersionRow.statement,
            explanation: activeVersionRow.explanation,
            taxonomyNodeId: activeVersionRow.taxonomyNodeId,
            createdBy: activeVersionRow.createdBy,
            createdAt: activeVersionRow.createdAt,
          }
        : null;

      return {
        question: q as Question,
        activeVersion,
      };
    });
  }

  async listTaxonomyNodes(): Promise<TaxonomyNode[]> {
    const nodes = await db.select().from(taxonomyNodes);
    return nodes.map((n) => ({
      id: n.id,
      parentId: n.parentId,
      name: n.name,
      level: n.level as TaxonomyLevel,
      createdAt: n.createdAt,
    }));
  }

  async getTaxonomyAncestors(nodeId: string): Promise<TaxonomyNode[]> {
    const all = await this.listTaxonomyNodes();
    const ancestors: TaxonomyNode[] = [];
    let current = all.find((n) => n.id === nodeId);
    while (current) {
      ancestors.unshift(current);
      if (!current.parentId) break;
      current = all.find((n) => n.id === current!.parentId);
    }
    return ancestors;
  }
}
