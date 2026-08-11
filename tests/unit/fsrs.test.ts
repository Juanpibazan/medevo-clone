import { describe, expect, it } from "vitest";
import { FSRS } from "@/modules/learning/domain/fsrs";

describe("FSRS Domain Algorithm", () => {
  const fsrs = new FSRS();

  it("should initialize a new card with default FSRS properties", () => {
    const card = fsrs.init();
    expect(card.stability).toBe(0);
    expect(card.difficulty).toBe(0);
    expect(card.elapsedDays).toBe(0);
    expect(card.scheduledDays).toBe(0);
    expect(card.state).toBe(0); // 0 corresponds to New
  });

  it("should transition state from New to Learning or Review on first review", () => {
    const card = fsrs.init();
    const now = new Date();

    // Again (1) -> state 1 (Learning)
    const cardAgain = fsrs.review(card, 1, now);
    expect(cardAgain.state).toBe(1);
    expect(cardAgain.scheduledDays).toBe(1);

    // Good (3) -> state 2 (Review)
    const cardGood = fsrs.review(card, 3, now);
    expect(cardGood.state).toBe(2);
    expect(cardGood.scheduledDays).toBeGreaterThanOrEqual(1);
  });

  it("should calculate correct difficulty adjustments based on rating", () => {
    const card = fsrs.init();
    const now = new Date();

    const cardAgain = fsrs.review(card, 1, now);
    const cardEasy = fsrs.review(card, 4, now);

    // Again (1) should lead to higher difficulty than Easy (4)
    expect(cardAgain.difficulty).toBeGreaterThan(cardEasy.difficulty);
    // Difficulty must be clamped to [1, 10]
    expect(cardAgain.difficulty).toBeLessThanOrEqual(10);
    expect(cardAgain.difficulty).toBeGreaterThanOrEqual(1);
  });

  it("should schedule subsequent review correctly", () => {
    const card = fsrs.init();
    const now = new Date();

    // First review -> Good (3)
    const cardAfterFirst = fsrs.review(card, 3, now);
    expect(cardAfterFirst.state).toBe(2);

    // Second review 5 days later -> Good (3)
    const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const cardAfterSecond = fsrs.review(cardAfterFirst, 3, fiveDaysLater);

    expect(cardAfterSecond.elapsedDays).toBe(5);
    expect(cardAfterSecond.repetition).toBe(2);
    expect(cardAfterSecond.stability).toBeGreaterThan(cardAfterFirst.stability);
    expect(cardAfterSecond.scheduledDays).toBeGreaterThanOrEqual(1);
  });
});
