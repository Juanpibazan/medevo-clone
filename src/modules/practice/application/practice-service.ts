import {
  type Response,
  type StudySession,
  type StudySessionItem,
  calculateSessionResults,
} from "../domain/practice";
import type { Question, QuestionVersion, Alternative } from "@/modules/content";

export interface PracticeRepository {
  createSession(
    sessionId: string,
    userId: string,
    items: Array<{ id: string; questionVersionId: string; position: number }>
  ): Promise<StudySession>;

  getSession(
    sessionId: string,
    userId: string
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
    patch: Partial<Response>
  ): Promise<Response>;

  finishSession(sessionId: string): Promise<StudySession>;

  getActiveSession(userId: string): Promise<StudySession | null>;
}

// Injectable function type to avoid direct circular dependencies if needed
export type ScheduleReviewFn = (
  userId: string,
  questionId: string,
  rating: 1 | 2 | 3 | 4
) => Promise<void>;

export class PracticeService {
  constructor(
    private readonly repository: PracticeRepository,
    private readonly contentService: {
      getQuestionVersion(
        versionId: string
      ): Promise<{
        question: Question;
        version: QuestionVersion;
        alternatives: Alternative[];
      } | null>;
      getPublishedQuestions(): Promise<
        Array<{
          question: Question;
          activeVersion: QuestionVersion;
          alternatives: Alternative[];
        }>
      >;
    },
    private readonly scheduleReviewFn?: ScheduleReviewFn
  ) {}

  async getActiveSession(userId: string) {
    return this.repository.getActiveSession(userId);
  }

  async createSession(userId: string, specificQuestionVersionIds?: string[]) {
    let versionIds = specificQuestionVersionIds;

    if (!versionIds) {
      const published = await this.contentService.getPublishedQuestions();
      if (published.length === 0) {
        throw new Error("No published questions available to practice");
      }

      // Shuffle and pick up to 10
      const shuffled = [...published].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 10);
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
        const questionData = await this.contentService.getQuestionVersion(item.questionVersionId);
        if (!questionData) {
          throw new Error(`Question version ${item.questionVersionId} not found`);
        }

        const { version, alternatives } = questionData;
        const isVerified = item.response?.verifiedAt !== null;

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

        return {
          id: item.id,
          sessionId: item.sessionId,
          questionVersionId: item.questionVersionId,
          position: item.position,
          createdAt: item.createdAt,
          title: version.title,
          statement: version.statement,
          explanation: isVerified ? version.explanation : null,
          alternatives: safeAlternatives,
          response: item.response,
        };
      })
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
    alternativeId: string,
    elapsedSeconds: number
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
      timeTakenSeconds: elapsedSeconds,
      updatedAt: new Date(),
    });
  }

  async verifyResponse(
    sessionId: string,
    itemId: string,
    userId: string,
    alternativeId: string,
    elapsedSeconds: number
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

    const questionData = await this.contentService.getQuestionVersion(item.questionVersionId);
    if (!questionData) throw new Error("Question version not found");

    const correctAlt = questionData.alternatives.find((a) => a.isCorrect);
    const isCorrect = correctAlt?.id === alternativeId;

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
      correctAlternativeId: correctAlt?.id ?? null,
      explanation: questionData.version.explanation,
    };
  }

  async saveMetacognitiveMark(
    sessionId: string,
    itemId: string,
    userId: string,
    mark: "domine" | "duda" | "vacile" | "no_sabia"
  ) {
    const data = await this.repository.getSession(sessionId, userId);
    if (!data) throw new Error("Session not found");

    const item = data.items.find((i) => i.id === itemId);
    if (!item) throw new Error("Session item not found");
    if (!item.response?.verifiedAt) {
      throw new Error("Cannot save mark before response is verified");
    }

    const response = await this.repository.saveResponse(item.response.id, itemId, {
      metacognitiveMark: mark,
      updatedAt: new Date(),
    });

    if (this.scheduleReviewFn && response.isCorrect !== null) {
      const questionData = await this.contentService.getQuestionVersion(item.questionVersionId);
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

    const responsesList = updated.items.map((i) => i.response).filter((r): r is Response => r !== null);
    const metrics = calculateSessionResults(responsesList);

    return {
      session: updated.session,
      metrics,
    };
  }
}
