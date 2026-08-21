import { z } from "zod";

export const sessionStatusSchema = z.enum(["in_progress", "completed"]);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export const metacognitiveMarkSchema = z.enum([
  "domine",
  "duda",
  "vacile",
  "no_sabia",
]);
export type MetacognitiveMark = z.infer<typeof metacognitiveMarkSchema>;

export const studySessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: sessionStatusSchema,
  createdAt: z.date(),
  completedAt: z.date().nullable(),
});
export type StudySession = z.infer<typeof studySessionSchema>;

export const studySessionItemSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  questionVersionId: z.string(),
  position: z.number().int().nonnegative(),
  createdAt: z.date(),
});
export type StudySessionItem = z.infer<typeof studySessionItemSchema>;

export const responseSchema = z.object({
  id: z.string(),
  sessionItemId: z.string(),
  selectedAlternativeId: z.string().nullable(),
  responseText: z.string().nullable(),
  isCorrect: z.boolean().nullable(),
  timeTakenSeconds: z.number().int().nonnegative().default(0),
  metacognitiveMark: metacognitiveMarkSchema.nullable(),
  isFavorite: z.boolean().default(false),
  verifiedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Response = z.infer<typeof responseSchema>;

export function calculateSessionResults(responses: Response[]) {
  const verifiedResponses = responses.filter((r) => r.verifiedAt !== null);
  const correctCount = verifiedResponses.filter(
    (r) => r.isCorrect === true,
  ).length;
  const totalCount = verifiedResponses.length;
  const precision = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
  const totalTimeSeconds = verifiedResponses.reduce(
    (acc, curr) => acc + curr.timeTakenSeconds,
    0,
  );

  return {
    correctCount,
    totalCount,
    precision,
    totalTimeSeconds,
  };
}
