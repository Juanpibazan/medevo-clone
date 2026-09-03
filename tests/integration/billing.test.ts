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
  paddleWebhookEvents,
  billingWebhookEvents,
} from "@/db/schema";
import { billingService } from "@/modules/billing";
import { DrizzleBillingRepository } from "@/modules/billing/infrastructure/drizzle-billing-repository";

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

      // Paddle webhook is the only provisioning path.
      const now = new Date();
      const repository = new DrizzleBillingRepository();
      const paddleEvent = {
        provider: "paddle",
        eventId: `evt_${userId}`,
        eventType: "subscription.activated",
        occurredAt: now,
        subscriptionId: `sub_${userId}`,
        customerId: `ctm_${userId}`,
        userId,
        productId: "pri_test",
        quantity: 1,
        status: "active",
        currentPeriodStart: now,
        accessEndsAt: new Date(now.getTime() + 86_400_000),
        cancelAtPeriodEnd: false,
        cancelsAt: null,
      } as const;
      expect(
        await repository.processPaddleSubscriptionEvent({
          ...paddleEvent,
          eventId: `evt_terminal_first_${userId}`,
          eventType: "subscription.canceled",
          occurredAt: new Date(now.getTime() + 10_000),
          subscriptionId: `sub_terminal_${userId}`,
          status: "canceled",
          currentPeriodStart: null,
          accessEndsAt: null,
        }),
      ).toBe("ignored");
      expect(
        await repository.processPaddleSubscriptionEvent({
          ...paddleEvent,
          eventId: `evt_terminal_old_${userId}`,
          occurredAt: new Date(now.getTime() + 9_000),
          subscriptionId: `sub_terminal_${userId}`,
        }),
      ).toBe("ignored");
      expect(await billingService.getActiveSubscription(userId)).toBeNull();

      await Promise.all([
        repository.processPaddleSubscriptionEvent({
          ...paddleEvent,
          eventId: `evt_race_active_${userId}`,
          occurredAt: new Date(now.getTime() + 19_000),
          subscriptionId: `sub_race_${userId}`,
        }),
        repository.processPaddleSubscriptionEvent({
          ...paddleEvent,
          eventId: `evt_race_terminal_${userId}`,
          eventType: "subscription.canceled",
          occurredAt: new Date(now.getTime() + 20_000),
          subscriptionId: `sub_race_${userId}`,
          status: "canceled",
          currentPeriodStart: null,
          accessEndsAt: null,
        }),
      ]);
      expect(await billingService.getActiveSubscription(userId)).toBeNull();

      expect(await repository.processPaddleSubscriptionEvent(paddleEvent)).toBe(
        "processed",
      );
      expect(await repository.processPaddleSubscriptionEvent(paddleEvent)).toBe(
        "duplicate",
      );
      expect(
        await repository.processPaddleSubscriptionEvent({
          ...paddleEvent,
          eventId: `evt_old_${userId}`,
          occurredAt: new Date(now.getTime() - 1000),
          status: "canceled",
        }),
      ).toBe("ignored");

      expect(
        await repository.processPaddleSubscriptionEvent({
          ...paddleEvent,
          eventId: `evt_paused_${userId}`,
          eventType: "subscription.paused",
          occurredAt: new Date(now.getTime() + 1000),
          status: "paused",
          currentPeriodStart: null,
          accessEndsAt: null,
        }),
      ).toBe("processed");

      const pausedSubscription =
        await billingService.getActiveSubscription(userId);
      expect(pausedSubscription).toBeNull();

      await repository.processPaddleSubscriptionEvent({
        ...paddleEvent,
        eventId: `evt_reactivated_${userId}`,
        occurredAt: new Date(now.getTime() + 2000),
      });

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
      await db
        .delete(paddleWebhookEvents)
        .where(
          inArray(paddleWebhookEvents.subscriptionId, [
            `sub_${userId}`,
            `sub_terminal_${userId}`,
            `sub_race_${userId}`,
          ]),
        );
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  it("provisions Suby by customer link and deduplicates events per provider", async () => {
    const userId = randomUUID();
    const sharedEventId = `evt_shared_${userId}`;
    const unknownEventId = `evt_unknown_${userId}`;
    const unknownProductEventId = `evt_unknown_product_${userId}`;
    const now = new Date();
    const repository = new DrizzleBillingRepository();
    try {
      await db.insert(users).values({
        id: userId,
        name: "Multi-provider Student",
        email: `${userId}@example.test`,
      });
      await repository.linkProviderCustomer(userId, "suby", `cus_${userId}`);
      const subyEvent = {
        provider: "suby",
        eventId: sharedEventId,
        eventType: "subscription.created",
        occurredAt: now,
        subscriptionId: `sub_suby_${userId}`,
        customerId: `cus_${userId}`,
        productId: "pro_month",
        quantity: 1,
        status: "active",
        currentPeriodStart: null,
        accessEndsAt: new Date(now.getTime() + 86_400_000),
        cancelAtPeriodEnd: false,
        cancelsAt: null,
      } as const;
      expect(await repository.processSubscriptionEvent(subyEvent)).toBe(
        "processed",
      );
      expect(await repository.processSubscriptionEvent(subyEvent)).toBe(
        "duplicate",
      );
      expect(
        await repository.processPaddleSubscriptionEvent({
          ...subyEvent,
          provider: "paddle",
          eventType: "subscription.activated",
          subscriptionId: `sub_paddle_${userId}`,
          customerId: `ctm_${userId}`,
          productId: "pri_month",
          userId,
          currentPeriodStart: now,
        }),
      ).toBe("processed");
      expect(
        await repository.processSubscriptionEvent({
          ...subyEvent,
          eventId: unknownEventId,
          subscriptionId: `sub_unknown_${userId}`,
          customerId: "cus_unknown",
        }),
      ).toBe("ignored");
      await repository.recordIgnoredWebhookEvent(
        {
          ...subyEvent,
          eventId: unknownProductEventId,
          productId: "pro_foreign",
        },
        "unknown_product",
      );
      const events = await db
        .select()
        .from(billingWebhookEvents)
        .where(
          inArray(billingWebhookEvents.eventId, [
            sharedEventId,
            unknownEventId,
            unknownProductEventId,
          ]),
        );
      expect(
        events.filter((event) => event.eventId === sharedEventId),
      ).toHaveLength(2);
      expect(
        events.find((event) => event.eventId === unknownEventId)?.reason,
      ).toBe("unknown_customer");
      expect(
        events.find((event) => event.eventId === unknownProductEventId)?.reason,
      ).toBe("unknown_product");

      const cancelsAt = new Date(now.getTime() + 86_400_000);
      expect(
        await repository.processSubscriptionEvent({
          ...subyEvent,
          eventId: `evt_cancel_${userId}`,
          eventType: "subscription.updated",
          occurredAt: new Date(now.getTime() + 1000),
          cancelAtPeriodEnd: true,
          cancelsAt,
        }),
      ).toBe("processed");
      const subySubscription = (
        await repository.getUserSubscriptions(userId)
      ).find((subscription) => subscription.provider === "suby");
      expect(subySubscription).toMatchObject({
        status: "active",
        cancelAtPeriodEnd: true,
        cancelsAt,
      });
      expect(
        await repository.processSubscriptionEvent({
          ...subyEvent,
          eventId: `evt_optional_cancel_${userId}`,
          eventType: "subscription.renewed",
          occurredAt: new Date(now.getTime() + 2000),
          cancelAtPeriodEnd: undefined,
          cancelsAt: undefined,
        }),
      ).toBe("processed");
      expect(
        (await repository.getUserSubscriptions(userId)).find(
          (subscription) => subscription.provider === "suby",
        ),
      ).toMatchObject({ cancelAtPeriodEnd: true, cancelsAt });
    } finally {
      await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
      await db
        .delete(billingWebhookEvents)
        .where(
          inArray(billingWebhookEvents.eventId, [
            sharedEventId,
            unknownEventId,
            unknownProductEventId,
            `evt_cancel_${userId}`,
            `evt_optional_cancel_${userId}`,
          ]),
        );
      await db
        .delete(paddleWebhookEvents)
        .where(eq(paddleWebhookEvents.eventId, sharedEventId));
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  it("keeps legacy Premium rows readable and blocks a second checkout", async () => {
    const userId = randomUUID();
    const repository = new DrizzleBillingRepository();
    try {
      await db.insert(users).values({
        id: userId,
        name: "Legacy Billing Student",
        email: `${userId}@example.test`,
      });
      await db.insert(subscriptions).values({
        id: randomUUID(),
        userId,
        status: "active",
        currentPeriodEnd: new Date(Date.now() + 86_400_000),
      });

      const active = await billingService.getActiveSubscription(userId);
      expect(active).toMatchObject({
        userId,
        status: "active",
        providerSubscriptionId: null,
        providerCustomerId: null,
        providerProductId: null,
      });
      expect(
        await repository.reserveCheckoutAttempt(userId, "suby", "month"),
      ).toMatchObject({ kind: "blocked" });
      expect((await billingService.checkDailyQuota(userId)).tier).toBe(
        "premium",
      );
    } finally {
      await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  it("keeps a Paddle attempt pending to block delayed cross-provider purchases", async () => {
    const userId = randomUUID();
    const repository = new DrizzleBillingRepository();
    try {
      await db.insert(users).values({
        id: userId,
        name: "Checkout Retry Student",
        email: `${userId}@example.test`,
      });
      expect(
        await repository.reserveCheckoutAttempt(userId, "paddle", "year"),
      ).toMatchObject({ kind: "created" });
      expect(await repository.getPendingCheckoutAttempt(userId)).toMatchObject({
        provider: "paddle",
        billingCycle: "year",
      });

      expect(
        await repository.reserveCheckoutAttempt(userId, "suby", "month"),
      ).toMatchObject({ kind: "blocked" });
    } finally {
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  it("rejects a Paddle customer already linked to another user", async () => {
    const ownerId = randomUUID();
    const otherId = randomUUID();
    const customerId = `ctm_${ownerId}`;
    const eventId = `evt_owner_${ownerId}`;
    const repository = new DrizzleBillingRepository();
    try {
      await db.insert(users).values([
        {
          id: ownerId,
          name: "Billing Customer Owner",
          email: `${ownerId}@example.test`,
        },
        {
          id: otherId,
          name: "Other Billing Customer",
          email: `${otherId}@example.test`,
        },
      ]);
      await repository.linkProviderCustomer(ownerId, "paddle", customerId);
      const now = new Date();
      expect(
        await repository.processPaddleSubscriptionEvent({
          provider: "paddle",
          eventId,
          eventType: "subscription.created",
          occurredAt: now,
          subscriptionId: `sub_${otherId}`,
          customerId,
          userId: otherId,
          productId: "pri_month",
          quantity: 1,
          status: "active",
          currentPeriodStart: now,
          accessEndsAt: new Date(now.getTime() + 86_400_000),
          cancelAtPeriodEnd: false,
          cancelsAt: null,
        }),
      ).toBe("ignored");
      expect(await repository.getUserSubscriptions(otherId)).toHaveLength(0);
      expect(
        (
          await db
            .select()
            .from(billingWebhookEvents)
            .where(eq(billingWebhookEvents.eventId, eventId))
        )[0]?.reason,
      ).toBe("customer_ownership_mismatch");
    } finally {
      await db
        .delete(billingWebhookEvents)
        .where(eq(billingWebhookEvents.eventId, eventId));
      await db.delete(users).where(inArray(users.id, [ownerId, otherId]));
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
      await db
        .update(questions)
        .set({ publishedVersionId: versionId1 })
        .where(eq(questions.id, questionId1));
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
      await db
        .update(questions)
        .set({ publishedVersionId: versionId2 })
        .where(eq(questions.id, questionId2));
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
        {
          id: itemId1,
          sessionId,
          questionVersionId: versionId1,
          position: 0,
          createdAt: now,
        },
        {
          id: itemId2,
          sessionId,
          questionVersionId: versionId2,
          position: 1,
          createdAt: now,
        },
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
      await db
        .delete(responses)
        .where(
          inArray(
            responses.sessionItemId,
            db
              .select({ id: studySessionItems.id })
              .from(studySessionItems)
              .innerJoin(
                studySessions,
                eq(studySessionItems.sessionId, studySessions.id),
              )
              .where(eq(studySessions.userId, userId)),
          ),
        );
      await db
        .delete(studySessionItems)
        .where(
          inArray(
            studySessionItems.sessionId,
            db
              .select({ id: studySessions.id })
              .from(studySessions)
              .where(eq(studySessions.userId, userId)),
          ),
        );
      await db.delete(studySessions).where(eq(studySessions.userId, userId));
      await db
        .delete(questionAlternatives)
        .where(
          inArray(questionAlternatives.questionVersionId, [
            versionId1,
            versionId2,
          ]),
        );
      await db
        .delete(questionVersions)
        .where(inArray(questionVersions.id, [versionId1, versionId2]));
      await db
        .delete(questions)
        .where(inArray(questions.id, [questionId1, questionId2]));
      await db.delete(taxonomyNodes).where(eq(taxonomyNodes.id, taxonomyId));
      await db.delete(users).where(eq(users.id, userId));
    }
  });
});
