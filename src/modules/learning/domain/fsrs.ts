export interface Card {
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  repetition: number;
  state: number; // 0: New, 1: Learning, 2: Review, 3: Relearning
  lastReviewAt?: Date;
  nextReviewAt: Date;
}

export type Rating = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

// FSRS v4 default weights
const DEFAULT_W = [
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05,
  0.34, 1.26, 0.26, 2.05,
];

export class FSRS {
  private readonly w: number[];
  private readonly requestRetrievability: number;

  constructor(w = DEFAULT_W, requestRetrievability = 0.9) {
    this.w = w;
    this.requestRetrievability = requestRetrievability;
  }

  // Initialize a new card
  init(): Card {
    return {
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      repetition: 0,
      state: 0, // New
      nextReviewAt: new Date(),
    };
  }

  // Update card based on rating and date of review
  review(card: Card, rating: Rating, now: Date): Card {
    const nextCard = { ...card };
    const elapsedDays = card.lastReviewAt
      ? Math.max(
          0,
          Math.round(
            (now.getTime() - card.lastReviewAt.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

    nextCard.elapsedDays = elapsedDays;
    nextCard.repetition += 1;
    nextCard.lastReviewAt = now;

    if (card.state === 0) {
      // First review (New state)
      nextCard.state = rating === 1 ? 1 : 2; // 1: Again -> Learning, others -> Review
      nextCard.difficulty = this.clamp(
        this.w[4] - (rating - 3) * this.w[5],
        1,
        10,
      );
      nextCard.stability = this.w[rating - 1];
    } else {
      // Subsequent review (Learning, Review, Relearning)
      const retrievability = Math.pow(
        1 + (0.07 * elapsedDays) / card.stability,
        -0.5,
      );

      if (rating === 1) {
        // Forgotten
        nextCard.state = 3; // Relearning
        nextCard.difficulty = this.clamp(card.difficulty + this.w[6], 1, 10);
        nextCard.stability =
          this.w[11] *
          Math.pow(card.difficulty, -this.w[12]) *
          Math.pow(card.stability + 1, this.w[13]) *
          Math.exp((1 - retrievability) * this.w[14]);
      } else {
        // Correctly recalled
        nextCard.state = 2; // Review
        nextCard.difficulty = this.clamp(
          card.difficulty - this.w[6] * (rating - 3),
          1,
          10,
        );

        const difficultyFactor = 11 - nextCard.difficulty;
        const stabilityFactor = Math.pow(card.stability, -this.w[8]);
        const retrievabilityFactor = Math.exp((1 - retrievability) * this.w[9]);
        const easyBonus = rating === 4 ? this.w[10] : 1;

        nextCard.stability =
          card.stability *
          (1 +
            Math.exp(this.w[7]) *
              difficultyFactor *
              stabilityFactor *
              retrievabilityFactor *
              easyBonus);
      }
    }

    // Interval calculation
    let scheduledDays = 1;
    if (nextCard.state === 2) {
      // Review state interval based on retrievability
      const factor = Math.log(this.requestRetrievability) / Math.log(0.9);
      scheduledDays = Math.max(1, Math.round(nextCard.stability * factor));
    } else {
      // Learning/Relearning states: 1 day interval
      scheduledDays = 1;
    }

    nextCard.scheduledDays = scheduledDays;
    nextCard.nextReviewAt = new Date(
      now.getTime() + scheduledDays * 24 * 60 * 60 * 1000,
    );

    return nextCard;
  }

  private clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
  }
}
