// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db, pool } from "@/db/client";
import {
  users,
  questions,
  questionVersions,
  questionAlternatives,
  taxonomyNodes,
  studySessions,
  studySessionItems,
  responses,
  subscriptions,
} from "@/db/schema";
import { billingService } from "@/modules/billing";

describe("Billing & Subscription Integration Tests", () => {
  afterAll(() => pool.end());

  it("should create, read, and update subscriptions in the database", async () => {
    const userId = randomUUID();

    try {
      // Setup user
      await db.insert(users).values({
        id: userId,
        name: "Billing Test Student",
        email: `${userId}@example.test`,
      });

      // Initially free tier (no active subscription in db)
      const subBefore = await billingService.getActiveSubscription(userId);
      expect(subBefore).toBeNull();

      const quotaBefore = await billingService.checkDailyQuota(userId);
      expect(quotaBefore.tier).toBe("free");
      expect(quotaBefore.isBlocked).toBe(false);

      // Upgrade to Premium
      const premiumSub = await billingService.upgradeToPremium(userId);
      expect(premiumSub.status).toBe("active");
      expect(premiumSub.planCode).toBe("premium");

      // Verify active subscription exists now
      const subAfter = await billingService.getActiveSubscription(userId);
      expect(subAfter).not.toBeNull();
      expect(subAfter!.userId).toBe(userId);
      expect(subAfter!.status).toBe("active");

      const quotaAfter = await billingService.checkDailyQuota(userId);
      expect(quotaAfter.tier).toBe("premium");
      expect(quotaAfter.isBlocked).toBe(false);

      // Simulate cancellation / expiration by directly modifying DB status
      await db
        .update(subscriptions)
        .set({ status: "expired" })
        .where(eq(subscriptions.userId, userId));

      const subExpired = await billingService.getActiveSubscription(userId);
      expect(subExpired).toBeNull(); // expired sub should not be returned as active

      const quotaExpired = await billingService.checkDailyQuota(userId);
      expect(quotaExpired.tier).toBe("free");
    } finally {
      // Cleanup
      await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  it("should accurately count verified responses for daily quota calculations", async () => {
    const userId = randomUUID();
    const taxonomyId = "billing-tax-node";
    const questionId1 = "billing-q-01";
    const questionId2 = "billing-q-02";
    const versionId1 = "billing-qv-01";
    const versionId2 = "billing-qv-02";
    const altId1 = "billing-alt-01";
    const altId2 = "billing-alt-02";

    try {
      // 1. Insert user & content
      await db.insert(users).values({
        id: userId,
        name: "Quota Test Student",
        email: `${userId}@example.test`,
      });

      await db.insert(taxonomyNodes).values({
        id: taxonomyId,
        name: "Billing Specialty",
        level: "specialty",
      });

      await db.insert(questions).values({ id: questionId1 });
      await db.insert(questionVersions).values({
        id: versionId1,
        questionId: questionId1,
        versionNumber: 1,
        status: "published",
        title: "Billing Q1",
        statement: "Billing statement 1",
        explanation: "Exp 1",
        taxonomyNodeId: taxonomyId,
        createdBy: userId,
      });
      await db.update(questions).set({ publishedVersionId: versionId1 }).where(eq(questions.id, questionId1));
      await db.insert(questionAlternatives).values({
        id: altId1,
        questionVersionId: versionId1,
        optionLetter: "A",
        text: "Alt 1",
        isCorrect: true,
      });

      await db.insert(questions).values({ id: questionId2 });
      await db.insert(questionVersions).values({
        id: versionId2,
        questionId: questionId2,
        versionNumber: 1,
        status: "published",
        title: "Billing Q2",
        statement: "Billing statement 2",
        explanation: "Exp 2",
        taxonomyNodeId: taxonomyId,
        createdBy: userId,
      });
      await db.update(questions).set({ publishedVersionId: versionId2 }).where(eq(questions.id, questionId2));
      await db.insert(questionAlternatives).values({
        id: altId2,
        questionVersionId: versionId2,
        optionLetter: "B",
        text: "Alt 2",
        isCorrect: true,
      });

      // 2. Create study session
      const now = new Date();
      const sessionId = randomUUID();
      await db.insert(studySessions).values({
        id: sessionId,
        userId,
        status: "in_progress",
        createdAt: now,
      });

      const itemId1 = randomUUID();
      const itemId2 = randomUUID();
      await db.insert(studySessionItems).values([
        { id: itemId1, sessionId, questionVersionId: versionId1, position: 0, createdAt: now },
        { id: itemId2, sessionId, questionVersionId: versionId2, position: 1, createdAt: now },
      ]);

      // Initially, 0 verified responses today
      const quota0 = await billingService.checkDailyQuota(userId);
      expect(quota0.answeredToday).toBe(0);

      // Verify response 1 today
      const respId1 = randomUUID();
      await db.insert(responses).values({
        id: respId1,
        sessionItemId: itemId1,
        selectedAlternativeId: altId1,
        isCorrect: true,
        verifiedAt: now,
      });

      const quota1 = await billingService.checkDailyQuota(userId);
      expect(quota1.answeredToday).toBe(1);

      // Add another response but verified YESTERDAY (should not count for today)
      const yesterday = new Date(now.getTime() - 25 * 60 * 60 * 1000);
      const respId2 = randomUUID();
      await db.insert(responses).values({
        id: respId2,
        sessionItemId: itemId2,
        selectedAlternativeId: altId2,
        isCorrect: true,
        verifiedAt: yesterday,
      });

      const quota2 = await billingService.checkDailyQuota(userId);
      expect(quota2.answeredToday).toBe(1); // remains 1 because yesterday's response is excluded
    } finally {
      // Cleanup
      await db.delete(responses).where(
        inArray(
          responses.sessionItemId,
          db
            .select({ id: studySessionItems.id })
            .from(studySessionItems)
            .innerJoin(studySessions, eq(studySessionItems.sessionId, studySessions.id))
            .where(eq(studySessions.userId, userId))
        )
      );
      await db.delete(studySessionItems).where(
        inArray(
          studySessionItems.sessionId,
          db
            .select({ id: studySessions.id })
            .from(studySessions)
            .where(eq(studySessions.userId, userId))
        )
      );
      await db.delete(studySessions).where(eq(studySessions.userId, userId));
      await db.delete(questionAlternatives).where(inArray(questionAlternatives.questionVersionId, [versionId1, versionId2]));
      await db.delete(questionVersions).where(inArray(questionVersions.id, [versionId1, versionId2]));
      await db.delete(questions).where(inArray(questions.id, [questionId1, questionId2]));
      await db.delete(taxonomyNodes).where(eq(taxonomyNodes.id, taxonomyId));
      await db.delete(users).where(eq(users.id, userId));
    }
  });
});
