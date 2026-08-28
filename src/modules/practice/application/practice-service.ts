import {
  type Response,
  type StudySession,
  type StudySessionItem,
  calculateSessionResults,
} from "../domain/practice";
import type {
  Question,
  QuestionVersion,
  Alternative,
  TaxonomyNode,
  QuestionImage,
} from "@/modules/content";

export interface PracticeRepository {
  createSession(
    sessionId: string,
    userId: string,
    items: Array<{ id: string; questionVersionId: string; position: number }>,
  ): Promise<StudySession>;

  getSession(
    sessionId: string,
    userId: string,
  ): Promise<{
    session: StudySession;
    items: Array<
      StudySessionItem & {
        questionVersionId: string;
        response: Response | null;
      }
    >;
  } | null>;

  saveResponse(
    responseId: string,
    sessionItemId: string,
    patch: Partial<Response>,
  ): Promise<Response>;

  finishSession(sessionId: string): Promise<StudySession>;

  getActiveSession(userId: string): Promise<StudySession | null>;

  getUserQuestionStatuses(
    userId: string,
  ): Promise<Array<{ questionId: string; isCorrect: boolean }>>;
}

// Injectable function type to avoid direct circular dependencies if needed
export type ScheduleReviewFn = (
  userId: string,
  questionId: string,
  rating: 1 | 2 | 3 | 4,
) => Promise<void>;

export class PracticeService {
  constructor(
    private readonly repository: PracticeRepository,
    private readonly contentService: {
      getQuestionVersion(versionId: string): Promise<{
        question: Question;
        version: QuestionVersion;
        alternatives: Alternative[];
        images: QuestionImage[];
      } | null>;
      getPublishedQuestions(): Promise<
        Array<{
          question: Question;
          activeVersion: QuestionVersion;
          alternatives: Alternative[];
          images: QuestionImage[];
        }>
      >;
      listTaxonomyNodes(): Promise<TaxonomyNode[]>;
    },
    private readonly scheduleReviewFn?: ScheduleReviewFn,
  ) {}

  async getActiveSession(userId: string) {
    return this.repository.getActiveSession(userId);
  }

  async createSession(
    userId: string,
    specificQuestionVersionIds?: string[],
    options?: { taxonomyNodeId?: string },
  ) {
    let versionIds = specificQuestionVersionIds;

    if (!versionIds) {
      let published = await this.contentService.getPublishedQuestions();
      if (published.length === 0) {
        throw new Error("No published questions available to practice");
      }

      if (options?.taxonomyNodeId) {
        const allNodes = await this.contentService.listTaxonomyNodes();
        const allowedNodeIds = new Set<string>();

        const resolveChildren = (parentId: string) => {
          const children = allNodes.filter((n) => n.parentId === parentId);
          for (const child of children) {
            if (!allowedNodeIds.has(child.id)) {
              allowedNodeIds.add(child.id);
              resolveChildren(child.id);
            }
          }
        };

        allowedNodeIds.add(options.taxonomyNodeId);
        resolveChildren(options.taxonomyNodeId);

        published = published.filter((q) =>
          allowedNodeIds.has(q.activeVersion.taxonomyNodeId),
        );

        if (published.length === 0) {
          throw new Error("no_questions_for_filters");
        }
      }

      // Get user's latest response status for all answered questions
      const userStatuses =
        await this.repository.getUserQuestionStatuses(userId);
      const statusMap = new Map<string, boolean>();
      for (const status of userStatuses) {
        statusMap.set(status.questionId, status.isCorrect);
      }

      // Partition published questions into Tiers
      const tier1: typeof published = []; // Unanswered
      const tier2: typeof published = []; // Answered incorrectly on last attempt
      const tier3: typeof published = []; // Answered correctly on last attempt (mastered)

      for (const q of published) {
        if (!statusMap.has(q.question.id)) {
          tier1.push(q);
        } else if (statusMap.get(q.question.id) === false) {
          tier2.push(q);
        } else {
          tier3.push(q);
        }
      }

      // Shuffle within each tier to guarantee randomness
      const t1 = [...tier1].sort(() => 0.5 - Math.random());
      const t2 = [...tier2].sort(() => 0.5 - Math.random());
      const t3 = [...tier3].sort(() => 0.5 - Math.random());

      // Select up to 10 preserving tier priority (Tier 1 > Tier 2 > Tier 3)
      const selected = [...t1, ...t2, ...t3].slice(0, 10);
      versionIds = selected.map((q) => q.activeVersion.id);
    }

    const sessionId = crypto.randomUUID();
    const items = versionIds.map((vid, idx) => ({
      id: crypto.randomUUID(),
      questionVersionId: vid,
      position: idx,
    }));

    return this.repository.createSession(sessionId, userId, items);
  }

  async getSession(sessionId: string, userId: string) {
    const data = await this.repository.getSession(sessionId, userId);
    if (!data) return null;

    const mappedItems = await Promise.all(
      data.items.map(async (item) => {
        const questionData = await this.contentService.getQuestionVersion(
          item.questionVersionId,
        );
        if (!questionData) {
          throw new Error(
            `Question version ${item.questionVersionId} not found`,
          );
        }

        const { version, alternatives, images } = questionData;
        const isVerified =
          item.response?.verifiedAt !== null &&
          item.response?.verifiedAt !== undefined;

        // If not verified, strip the isCorrect property and the explanation
        const safeAlternatives = alternatives.map((alt) => {
          if (isVerified) {
            return {
              id: alt.id,
              optionLetter: alt.optionLetter,
              text: alt.text,
              isCorrect: alt.isCorrect,
            };
          }
          return {
            id: alt.id,
            optionLetter: alt.optionLetter,
            text: alt.text,
          };
        });

        const safeSubquestions = version.subquestions
          ? version.subquestions.map((sub) => ({
              letter: sub.letter,
              statement: sub.statement,
              explanation: isVerified ? sub.explanation : null,
            }))
          : null;

        return {
          id: item.id,
          sessionId: item.sessionId,
          questionVersionId: item.questionVersionId,
          position: item.position,
          createdAt: item.createdAt,
          title: version.title,
          statement: version.statement,
          type: version.type,
          explanation: isVerified ? version.explanation : null,
          subquestions: safeSubquestions,
          alternatives: safeAlternatives,
          images: images.map((img) => ({
            id: img.id,
            url: img.url,
            position: img.position,
          })),
          response: item.response,
        };
      }),
    );

    return {
      session: data.session,
      items: mappedItems,
    };
  }

  async saveDraftResponse(
    sessionId: string,
    itemId: string,
    userId: string,
    alternativeId: string | null,
    elapsedSeconds: number,
    responseText?: string,
  ) {
    const data = await this.repository.getSession(sessionId, userId);
    if (!data || data.session.status !== "in_progress") {
      throw new Error("Session not active");
    }

    const item = data.items.find((i) => i.id === itemId);
    if (!item) throw new Error("Session item not found");

    if (item.response?.verifiedAt) {
      throw new Error("Response already verified");
    }

    const responseId = item.response?.id ?? crypto.randomUUID();

    return this.repository.saveResponse(responseId, itemId, {
      selectedAlternativeId: alternativeId,
      responseText: responseText ?? null,
      timeTakenSeconds: elapsedSeconds,
      updatedAt: new Date(),
    });
  }

  async verifyResponse(
    sessionId: string,
    itemId: string,
    userId: string,
    alternativeId: string | null,
    elapsedSeconds: number,
    isCorrectOverride?: boolean,
  ) {
    const data = await this.repository.getSession(sessionId, userId);
    if (!data || data.session.status !== "in_progress") {
      throw new Error("Session not active");
    }

    const item = data.items.find((i) => i.id === itemId);
    if (!item) throw new Error("Session item not found");

    if (item.response?.verifiedAt) {
      throw new Error("Response already verified");
    }

    const questionData = await this.contentService.getQuestionVersion(
      item.questionVersionId,
    );
    if (!questionData) throw new Error("Question version not found");

    let isCorrect = false;
    if (questionData.version.type === "open_ended") {
      if (isCorrectOverride === undefined) {
        throw new Error("Self-evaluation is required for discursive questions");
      }
      isCorrect = isCorrectOverride;
    } else {
      if (!alternativeId) {
        throw new Error(
          "Alternative selection is required for multiple choice questions",
        );
      }
      const correctAlt = questionData.alternatives.find((a) => a.isCorrect);
      isCorrect = correctAlt?.id === alternativeId;
    }

    const responseId = item.response?.id ?? crypto.randomUUID();

    const response = await this.repository.saveResponse(responseId, itemId, {
      selectedAlternativeId: alternativeId,
      isCorrect,
      timeTakenSeconds: elapsedSeconds,
      verifiedAt: new Date(),
      updatedAt: new Date(),
    });

    if (this.scheduleReviewFn) {
      const rating = isCorrect ? (3 as const) : (1 as const);
      await this.scheduleReviewFn(userId, questionData.question.id, rating);
    }

    return {
      response,
      correctAlternativeId:
        questionData.version.type === "open_ended"
          ? null
          : (questionData.alternatives.find((a) => a.isCorrect)?.id ?? null),
      explanation: questionData.version.explanation,
      subquestions: questionData.version.subquestions ?? null,
    };
  }

  async saveMetacognitiveMark(
    sessionId: string,
    itemId: string,
    userId: string,
    mark: "domine" | "duda" | "vacile" | "no_sabia",
  ) {
    const data = await this.repository.getSession(sessionId, userId);
    if (!data) throw new Error("Session not found");

    const item = data.items.find((i) => i.id === itemId);
    if (!item) throw new Error("Session item not found");
    if (!item.response?.verifiedAt) {
      throw new Error("Cannot save mark before response is verified");
    }

    const response = await this.repository.saveResponse(
      item.response.id,
      itemId,
      {
        metacognitiveMark: mark,
        updatedAt: new Date(),
      },
    );

    if (this.scheduleReviewFn && response.isCorrect !== null) {
      const questionData = await this.contentService.getQuestionVersion(
        item.questionVersionId,
      );
      if (questionData) {
        let rating: 1 | 2 | 3 | 4 = 3;
        if (response.isCorrect === false) {
          rating = 1;
        } else {
          if (mark === "domine") rating = 4;
          else if (mark === "duda" || mark === "vacile") rating = 2;
          else if (mark === "no_sabia") rating = 3;
        }
        await this.scheduleReviewFn(userId, questionData.question.id, rating);
      }
    }

    return response;
  }

  async toggleFavorite(sessionId: string, itemId: string, userId: string) {
    const data = await this.repository.getSession(sessionId, userId);
    if (!data) throw new Error("Session not found");

    const item = data.items.find((i) => i.id === itemId);
    if (!item) throw new Error("Session item not found");

    const currentFavorite = item.response?.isFavorite ?? false;
    const responseId = item.response?.id ?? crypto.randomUUID();

    return this.repository.saveResponse(responseId, itemId, {
      isFavorite: !currentFavorite,
      updatedAt: new Date(),
    });
  }

  async finishSession(sessionId: string, userId: string) {
    const data = await this.repository.getSession(sessionId, userId);
    if (!data) throw new Error("Session not found");

    await this.repository.finishSession(sessionId);

    const updated = await this.repository.getSession(sessionId, userId);
    if (!updated) throw new Error("Session failed to load");

    const responsesList = updated.items
      .map((i) => i.response)
      .filter((r): r is Response => r !== null);
    const metrics = calculateSessionResults(responsesList);

    return {
      session: updated.session,
      metrics,
    };
  }
}
