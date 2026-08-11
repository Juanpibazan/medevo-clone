import { DrizzleContentRepository } from "./infrastructure/drizzle-content-repository";
import { ContentService } from "./application/content-service";

export const contentService = new ContentService(
  new DrizzleContentRepository(),
);
export { ContentService } from "./application/content-service";
export type { ContentRepository } from "./application/content-service";
export type {
  Question,
  QuestionVersion,
  Alternative,
  TaxonomyNode,
  TaxonomyLevel,
  AlternativeLetter,
  QuestionStatus,
} from "./domain/content";
export {
  taxonomyLevelSchema,
  questionStatusSchema,
  alternativeLetterSchema,
  validateQuestionAlternatives,
} from "./domain/content";
