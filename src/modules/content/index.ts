import { DrizzleContentRepository } from "./infrastructure/drizzle-content-repository";
import { ContentService } from "./application/content-service";
import { EditorialService } from "./application/editorial-service";

export const contentService = new ContentService(
  new DrizzleContentRepository(),
);

export const editorialService = new EditorialService();

export { ContentService } from "./application/content-service";
export { EditorialService } from "./application/editorial-service";
export type { QuestionDraftInput } from "./application/editorial-service";
export type { ContentRepository } from "./application/content-service";
export type {
  Question,
  QuestionVersion,
  Alternative,
  TaxonomyNode,
  TaxonomyLevel,
  AlternativeLetter,
  QuestionStatus,
  QuestionType,
  QuestionImage,
} from "./domain/content";
export {
  taxonomyLevelSchema,
  questionStatusSchema,
  alternativeLetterSchema,
  questionTypeSchema,
  questionImageSchema,
  validateQuestionAlternatives,
} from "./domain/content";
