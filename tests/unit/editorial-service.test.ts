import { describe, expect, it } from "vitest";
import { validateQuestionAlternatives } from "@/modules/content/domain/content";

describe("Question Alternatives Validation Unit Tests", () => {
  it("should fail validation if there are less than 2 alternatives", () => {
    const result = validateQuestionAlternatives([
      { optionLetter: "A", text: "Berlin", isCorrect: true },
    ]);
    expect(result.success).toBe(false);
    expect(result.code).toBe("invalid_alternative_count");
  });

  it("should fail validation if there are more than 5 alternatives", () => {
    const result = validateQuestionAlternatives([
      { optionLetter: "A", text: "1", isCorrect: true },
      { optionLetter: "B", text: "2", isCorrect: false },
      { optionLetter: "C", text: "3", isCorrect: false },
      { optionLetter: "D", text: "4", isCorrect: false },
      { optionLetter: "E", text: "5", isCorrect: false },
      { optionLetter: "E", text: "6", isCorrect: false },
    ]);
    expect(result.success).toBe(false);
    expect(result.code).toBe("invalid_alternative_count");
  });

  it("should fail validation if duplicate option letters are used", () => {
    const result = validateQuestionAlternatives([
      { optionLetter: "A", text: "Berlin", isCorrect: true },
      { optionLetter: "A", text: "Paris", isCorrect: false },
    ]);
    expect(result.success).toBe(false);
    expect(result.code).toBe("duplicate_option_letters");
  });

  it("should fail validation if there is no correct alternative", () => {
    const result = validateQuestionAlternatives([
      { optionLetter: "A", text: "Berlin", isCorrect: false },
      { optionLetter: "B", text: "Paris", isCorrect: false },
    ]);
    expect(result.success).toBe(false);
    expect(result.code).toBe("must_have_exactly_one_correct_alternative");
  });

  it("should fail validation if there are multiple correct alternatives", () => {
    const result = validateQuestionAlternatives([
      { optionLetter: "A", text: "Berlin", isCorrect: true },
      { optionLetter: "B", text: "Paris", isCorrect: true },
    ]);
    expect(result.success).toBe(false);
    expect(result.code).toBe("must_have_exactly_one_correct_alternative");
  });

  it("should pass validation if alternatives are correct (exactly one correct and between 2 to 5 options)", () => {
    const result = validateQuestionAlternatives([
      { optionLetter: "A", text: "Berlin", isCorrect: false },
      { optionLetter: "B", text: "Paris", isCorrect: true },
      { optionLetter: "C", text: "Madrid", isCorrect: false },
    ]);
    expect(result.success).toBe(true);
  });
});
