import { DrizzlePracticeRepository } from "./infrastructure/drizzle-practice-repository";
import { PracticeService } from "./application/practice-service";
import { contentService } from "@/modules/content";
import { learningService } from "@/modules/learning";

export const practiceService = new PracticeService(
  new DrizzlePracticeRepository(),
  contentService,
  async (userId, questionId, rating) => {
    await learningService.scheduleReview(userId, questionId, rating);
  },
);

export { PracticeService } from "./application/practice-service";
export type { PracticeRepository } from "./application/practice-service";
export type {
  Response,
  StudySession,
  StudySessionItem,
} from "./domain/practice";
export {
  sessionStatusSchema,
  metacognitiveMarkSchema,
  calculateSessionResults,
} from "./domain/practice";
export type { MetacognitiveMark } from "./domain/practice";
