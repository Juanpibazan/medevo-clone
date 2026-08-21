import { eq, inArray, and, desc } from "drizzle-orm";
import { db } from "@/db/client";
import {
  questions,
  questionVersions,
  questionAlternatives,
  questionImages,
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
  QuestionImage,
  QuestionType,
} from "../domain/content";

export class DrizzleContentRepository implements ContentRepository {
  async findPublishedQuestions(): Promise<
    Array<{
      question: Question;
      activeVersion: QuestionVersion;
      alternatives: Alternative[];
      images: QuestionImage[];
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
      .where(
        and(
          inArray(questionVersions.id, versionIds),
          eq(questionVersions.status, "published"),
        ),
      );

    const alternatives = await db
      .select()
      .from(questionAlternatives)
      .where(inArray(questionAlternatives.questionVersionId, versionIds));

    const images = await db
      .select()
      .from(questionImages)
      .where(inArray(questionImages.questionVersionId, versionIds))
      .orderBy(questionImages.position);

    const results = [];
    for (const q of filtered) {
      const version = versions.find((v) => v.id === q.publishedVersionId);
      if (!version) continue;
      const alts = alternatives.filter(
        (a) => a.questionVersionId === version.id,
      );
      const imgs = images.filter((i) => i.questionVersionId === version.id);
      results.push({
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
          type: version.type as QuestionType,
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
        images: imgs.map((i) => ({
          id: i.id,
          questionVersionId: i.questionVersionId,
          url: i.url,
          position: i.position,
          createdAt: i.createdAt,
        })),
      });
    }
    return results;
  }

  async getQuestionVersion(versionId: string): Promise<{
    question: Question;
    version: QuestionVersion;
    alternatives: Alternative[];
    images: QuestionImage[];
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

    const images = await db
      .select()
      .from(questionImages)
      .where(eq(questionImages.questionVersionId, versionId))
      .orderBy(questionImages.position);

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
        type: version.type as QuestionType,
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
      images: images.map((i) => ({
        id: i.id,
        questionVersionId: i.questionVersionId,
        url: i.url,
        position: i.position,
        createdAt: i.createdAt,
      })),
    };
  }

  async getQuestionWithActiveVersion(questionId: string): Promise<{
    question: Question;
    activeVersion: QuestionVersion;
    alternatives: Alternative[];
    images: QuestionImage[];
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
      images: data.images,
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
    imagesInput?: Array<{ url: string; position: number }>,
  ): Promise<{
    question: Question;
    version: QuestionVersion;
    alternatives: Alternative[];
    images: QuestionImage[];
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
        type: versionInput.type ?? "multiple_choice",
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

      if (altsToInsert.length > 0) {
        await tx.insert(questionAlternatives).values(altsToInsert);
      }

      if (imagesInput && imagesInput.length > 0) {
        const imagesToInsert = imagesInput.map((img) => ({
          id: crypto.randomUUID(),
          questionVersionId: versionId,
          url: img.url,
          position: img.position,
        }));
        await tx.insert(questionImages).values(imagesToInsert);
      }

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
      const insertedImages = await tx
        .select()
        .from(questionImages)
        .where(eq(questionImages.questionVersionId, versionId))
        .orderBy(questionImages.position);

      return {
        question: insertedQ as Question,
        version: {
          id: insertedV.id,
          questionId: insertedV.questionId,
          versionNumber: insertedV.versionNumber,
          status: insertedV.status as QuestionStatus,
          type: insertedV.type as QuestionType,
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
        images: insertedImages.map((i) => ({
          id: i.id,
          questionVersionId: i.questionVersionId,
          url: i.url,
          position: i.position,
          createdAt: i.createdAt,
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
            type: activeVersionRow.type as QuestionType,
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

  async listAllQuestionsWithVersions(): Promise<
    Array<{
      question: Question;
      versions: QuestionVersion[];
    }>
  > {
    const list = await db.select().from(questions);
    if (list.length === 0) return [];

    const versions = await db
      .select()
      .from(questionVersions)
      .orderBy(desc(questionVersions.versionNumber));

    return list.map((q) => {
      const qVersions = versions.filter((v) => v.questionId === q.id);
      return {
        question: q as Question,
        versions: qVersions.map((v) => ({
          id: v.id,
          questionId: v.questionId,
          versionNumber: v.versionNumber,
          status: v.status as QuestionStatus,
          type: v.type as QuestionType,
          title: v.title,
          statement: v.statement,
          explanation: v.explanation,
          taxonomyNodeId: v.taxonomyNodeId,
          createdBy: v.createdBy,
          createdAt: v.createdAt,
        })),
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
