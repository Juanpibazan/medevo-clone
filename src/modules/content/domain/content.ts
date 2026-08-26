import { z } from "zod";

export const taxonomyLevelSchema = z.enum([
  "specialty",
  "theme",
  "focus",
  "subfocus",
]);
export type TaxonomyLevel = z.infer<typeof taxonomyLevelSchema>;

export const questionStatusSchema = z.enum([
  "draft",
  "in_review",
  "published",
  "annulled",
]);
export type QuestionStatus = z.infer<typeof questionStatusSchema>;

export const alternativeLetterSchema = z.enum(["A", "B", "C", "D", "E"]);
export type AlternativeLetter = z.infer<typeof alternativeLetterSchema>;

export const questionTypeSchema = z.enum(["multiple_choice", "open_ended"]);
export type QuestionType = z.infer<typeof questionTypeSchema>;

export const questionImageSchema = z.object({
  id: z.string(),
  questionVersionId: z.string(),
  url: z.string(),
  position: z.number().int().nonnegative(),
  createdAt: z.date(),
});
export type QuestionImage = z.infer<typeof questionImageSchema>;

export const taxonomyNodeSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  name: z.string().min(1, "Name must not be empty"),
  level: taxonomyLevelSchema,
  createdAt: z.date(),
});
export type TaxonomyNode = z.infer<typeof taxonomyNodeSchema>;

export const alternativeSchema = z.object({
  id: z.string(),
  questionVersionId: z.string(),
  optionLetter: alternativeLetterSchema,
  text: z.string().min(1, "Alternative text must not be empty"),
  isCorrect: z.boolean(),
  createdAt: z.date(),
});
export type Alternative = z.infer<typeof alternativeSchema>;

export const questionVersionSchema = z.object({
  id: z.string(),
  questionId: z.string(),
  versionNumber: z.number().int().positive(),
  status: questionStatusSchema,
  type: questionTypeSchema,
  title: z.string().min(1, "Title must not be empty"),
  statement: z.string().min(1, "Statement must not be empty"),
  explanation: z.string(),
  subquestions: z
    .array(
      z.object({
        letter: z.string(),
        statement: z.string(),
        explanation: z.string(),
      }),
    )
    .nullable()
    .optional(),
  taxonomyNodeId: z.string(),
  createdBy: z.string(),
  createdAt: z.date(),
});
export type QuestionVersion = z.infer<typeof questionVersionSchema>;

export const questionSchema = z.object({
  id: z.string(),
  publishedVersionId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Question = z.infer<typeof questionSchema>;

// Business validation rules
export function validateQuestionAlternatives(
  alternatives: Array<
    Omit<Alternative, "id" | "questionVersionId" | "createdAt">
  >,
  type: QuestionType = "multiple_choice",
) {
  if (type === "open_ended") {
    if (alternatives && alternatives.length > 0) {
      return { success: false, code: "open_ended_cannot_have_alternatives" };
    }
    return { success: true };
  }

  if (alternatives.length < 2 || alternatives.length > 5) {
    return { success: false, code: "invalid_alternative_count" };
  }
  const letters = alternatives.map((a) => a.optionLetter);
  const uniqueLetters = new Set(letters);
  if (letters.length !== uniqueLetters.size) {
    return { success: false, code: "duplicate_option_letters" };
  }
  const correctCount = alternatives.filter((a) => a.isCorrect).length;
  if (correctCount !== 1) {
    return {
      success: false,
      code: "must_have_exactly_one_correct_alternative",
    };
  }
  return { success: true };
}
