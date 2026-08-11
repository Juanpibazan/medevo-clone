import { DrizzleLearningRepository } from "./infrastructure/drizzle-learning-repository";
import { LearningService } from "./application/learning-service";
import { contentService } from "@/modules/content";

export const learningService = new LearningService(
  new DrizzleLearningRepository(),
  contentService,
);

export { LearningService } from "./application/learning-service";
export type { LearningRepository } from "./application/learning-service";
export type { Card, Rating } from "./domain/fsrs";
export { FSRS } from "./domain/fsrs";
