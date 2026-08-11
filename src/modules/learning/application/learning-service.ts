import { FSRS, type Card, type Rating } from "../domain/fsrs";
import type { Question, QuestionVersion, Alternative } from "@/modules/content";

export interface LearningRepository {
  getReviewQueueItem(userId: string, questionId: string): Promise<Card | null>;
  saveReviewQueueItem(
    userId: string,
    questionId: string,
    card: Card,
  ): Promise<void>;
  getDueQuestionIds(
    userId: string,
    now: Date,
    limit: number,
  ): Promise<string[]>;
  getErrorNotebookQuestionIds(userId: string): Promise<string[]>;
  getFavoritesQuestionIds(userId: string): Promise<string[]>;
}

export class LearningService {
  private readonly fsrs = new FSRS();

  constructor(
    private readonly repository: LearningRepository,
    private readonly contentService: {
      getQuestionWithActiveVersion(questionId: string): Promise<{
        question: Question;
        activeVersion: QuestionVersion;
        alternatives: Alternative[];
      } | null>;
    },
  ) {}

  async scheduleReview(userId: string, questionId: string, rating: Rating) {
    let card = await this.repository.getReviewQueueItem(userId, questionId);
    if (!card) {
      card = this.fsrs.init();
    }

    const updated = this.fsrs.review(card, rating, new Date());
    await this.repository.saveReviewQueueItem(userId, questionId, updated);
  }

  async getReviewQueueItem(userId: string, questionId: string) {
    return this.repository.getReviewQueueItem(userId, questionId);
  }

  async getDueQuestions(userId: string, limit = 10) {
    const ids = await this.repository.getDueQuestionIds(
      userId,
      new Date(),
      limit,
    );
    const questions = await Promise.all(
      ids.map((id) => this.contentService.getQuestionWithActiveVersion(id)),
    );
    return questions.filter((q) => q !== null);
  }

  async getErrorNotebook(userId: string) {
    const ids = await this.repository.getErrorNotebookQuestionIds(userId);
    const questions = await Promise.all(
      ids.map((id) => this.contentService.getQuestionWithActiveVersion(id)),
    );
    return questions.filter((q) => q !== null);
  }

  async getFavorites(userId: string) {
    const ids = await this.repository.getFavoritesQuestionIds(userId);
    const questions = await Promise.all(
      ids.map((id) => this.contentService.getQuestionWithActiveVersion(id)),
    );
    return questions.filter((q) => q !== null);
  }
}
