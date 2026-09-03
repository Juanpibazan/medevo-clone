import { and, eq, gt, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  billingCheckoutAttempts,
  billingProviderCustomers,
  billingWebhookEvents,
  paddleWebhookEvents,
  responses,
  studySessionItems,
  studySessions,
  subscriptions,
  users,
} from "@/db/schema";
import {
  blocksNewCheckout,
  subscriptionEventPrecedence,
  type BillingCycle,
  type BillingProvider,
  type BillingSubscriptionEvent,
  type PaddleSubscriptionEvent,
  type Subscription,
} from "../domain/billing";

export interface BillingRepository {
  getActiveSubscription(userId: string): Promise<Subscription | null>;
  processPaddleSubscriptionEvent(
    event: PaddleSubscriptionEvent,
  ): Promise<"processed" | "duplicate" | "ignored">;
  getVerifiedResponsesCountToday(
    userId: string,
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<number>;
}

interface LockedBillingRepository {
  getUserSubscriptions(): Promise<Subscription[]>;
  markCancellationScheduled(
    subscriptionId: string,
    cancelsAt: Date,
  ): Promise<void>;
}

function mapSubscription(row: typeof subscriptions.$inferSelect): Subscription {
  return {
    id: row.id,
    userId: row.userId,
    provider: row.provider,
    providerSubscriptionId: row.providerSubscriptionId,
    providerCustomerId: row.providerCustomerId,
    providerProductId: row.providerProductId,
    status: row.status as Subscription["status"],
    planCode: row.planCode,
    currentPeriodStart: row.currentPeriodStart,
    accessEndsAt: row.currentPeriodEnd,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    cancelsAt: row.cancelsAt,
    lastProviderEventAt: row.lastProviderEventAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    paddleSubscriptionId: row.paddleSubscriptionId,
    paddleCustomerId: row.paddleCustomerId,
    paddlePriceId: row.paddlePriceId,
    lastPaddleEventAt: row.lastPaddleEventAt,
  };
}

export class DrizzleBillingRepository implements BillingRepository {
  async withUserBillingLock<T>(
    userId: string,
    operation: (repository: LockedBillingRepository) => Promise<T>,
  ): Promise<T> {
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`billing:${userId}`}, 0))`,
      );
      return operation({
        getUserSubscriptions: async () => {
          const rows = await tx
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.userId, userId));
          return rows.map(mapSubscription);
        },
        markCancellationScheduled: async (subscriptionId, cancelsAt) => {
          await tx
            .update(subscriptions)
            .set({
              cancelAtPeriodEnd: true,
              cancelsAt,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(subscriptions.id, subscriptionId),
                eq(subscriptions.userId, userId),
              ),
            );
        },
      });
    });
  }

  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    const [row] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          inArray(subscriptions.status, ["active", "trialing"]),
          gt(subscriptions.currentPeriodEnd, new Date()),
        ),
      )
      .limit(1);
    return row ? mapSubscription(row) : null;
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    const rows = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    return rows.map(mapSubscription);
  }

  async getPendingCheckoutAttempt(userId: string) {
    const [attempt] = await db
      .select({
        provider: billingCheckoutAttempts.provider,
        billingCycle: billingCheckoutAttempts.billingCycle,
        expiresAt: billingCheckoutAttempts.expiresAt,
      })
      .from(billingCheckoutAttempts)
      .where(
        and(
          eq(billingCheckoutAttempts.userId, userId),
          inArray(billingCheckoutAttempts.status, ["pending", "created"]),
          gte(billingCheckoutAttempts.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return attempt ?? null;
  }

  async reserveCheckoutAttempt(
    userId: string,
    provider: BillingProvider,
    cycle: BillingCycle,
  ): Promise<
    | { kind: "created"; id: string; idempotencyKey: string }
    | { kind: "reused"; id: string; idempotencyKey: string }
    | { kind: "blocked" }
  > {
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`checkout:${userId}`}, 0))`,
      );
      const current = await tx
        .select({ status: subscriptions.status })
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId));
      if (current.some((item) => blocksNewCheckout(item.status)))
        return { kind: "blocked" } as const;
      const [pending] = await tx
        .select()
        .from(billingCheckoutAttempts)
        .where(
          and(
            eq(billingCheckoutAttempts.userId, userId),
            inArray(billingCheckoutAttempts.status, ["pending", "created"]),
            gte(billingCheckoutAttempts.expiresAt, new Date()),
          ),
        )
        .limit(1);
      if (pending) {
        if (pending.provider !== provider || pending.billingCycle !== cycle)
          return { kind: "blocked" } as const;
        if (provider === "paddle") return { kind: "blocked" } as const;
        return {
          kind: "reused",
          id: pending.id,
          idempotencyKey: pending.idempotencyKey,
        } as const;
      }
      const id = crypto.randomUUID();
      const idempotencyKey = crypto.randomUUID();
      await tx.insert(billingCheckoutAttempts).values({
        id,
        userId,
        provider,
        billingCycle: cycle,
        idempotencyKey,
        expiresAt: new Date(Date.now() + 30 * 60_000),
      });
      return { kind: "created", id, idempotencyKey } as const;
    });
  }

  async completeCheckoutAttempt(id: string, providerCheckoutId: string | null) {
    await db
      .update(billingCheckoutAttempts)
      .set({ status: "created", providerCheckoutId, updatedAt: new Date() })
      .where(eq(billingCheckoutAttempts.id, id));
  }

  async failCheckoutAttempt(id: string) {
    await db
      .update(billingCheckoutAttempts)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(billingCheckoutAttempts.id, id));
  }

  async getProviderCustomer(userId: string, provider: BillingProvider) {
    const [row] = await db
      .select()
      .from(billingProviderCustomers)
      .where(
        and(
          eq(billingProviderCustomers.userId, userId),
          eq(billingProviderCustomers.provider, provider),
        ),
      )
      .limit(1);
    return row?.providerCustomerId ?? null;
  }

  async linkProviderCustomer(
    userId: string,
    provider: BillingProvider,
    providerCustomerId: string,
  ) {
    await db
      .insert(billingProviderCustomers)
      .values({ id: crypto.randomUUID(), userId, provider, providerCustomerId })
      .onConflictDoNothing();
    const [linked] = await db
      .select()
      .from(billingProviderCustomers)
      .where(
        and(
          eq(billingProviderCustomers.provider, provider),
          eq(billingProviderCustomers.userId, userId),
        ),
      )
      .limit(1);
    if (linked?.providerCustomerId !== providerCustomerId)
      throw new Error("Provider customer belongs to a different link");
  }

  async processPaddleSubscriptionEvent(event: PaddleSubscriptionEvent) {
    return this.processSubscriptionEvent(event);
  }

  async recordIgnoredWebhookEvent(
    event: BillingSubscriptionEvent,
    reason: string,
  ) {
    await db
      .insert(billingWebhookEvents)
      .values({
        provider: event.provider,
        eventId: event.eventId,
        subscriptionId: event.subscriptionId,
        eventType: event.eventType,
        occurredAt: event.occurredAt,
        outcome: "ignored",
        reason,
      })
      .onConflictDoNothing();
  }

  async processSubscriptionEvent(event: BillingSubscriptionEvent) {
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${event.provider}:${event.subscriptionId}`}, 0))`,
      );
      const inserted = await tx
        .insert(billingWebhookEvents)
        .values({
          provider: event.provider,
          eventId: event.eventId,
          subscriptionId: event.subscriptionId,
          eventType: event.eventType,
          occurredAt: event.occurredAt,
          outcome: "processed",
        })
        .onConflictDoNothing()
        .returning({ eventId: billingWebhookEvents.eventId });
      if (!inserted.length) return "duplicate" as const;
      const markIgnored = async (reason: string) => {
        await tx
          .update(billingWebhookEvents)
          .set({ outcome: "ignored", reason })
          .where(
            and(
              eq(billingWebhookEvents.provider, event.provider),
              eq(billingWebhookEvents.eventId, event.eventId),
            ),
          );
        return "ignored" as const;
      };
      let userId = event.userId;
      const [link] = await tx
        .select({ userId: billingProviderCustomers.userId })
        .from(billingProviderCustomers)
        .where(
          and(
            eq(billingProviderCustomers.provider, event.provider),
            eq(billingProviderCustomers.providerCustomerId, event.customerId),
          ),
        )
        .limit(1);
      if (userId && link && link.userId !== userId)
        return markIgnored("customer_ownership_mismatch");
      if (!userId) userId = link?.userId;
      if (!userId) return markIgnored("unknown_customer");
      const [knownUser] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!knownUser) return markIgnored("unknown_user");
      const competingEvents = await tx
        .select({
          eventType: billingWebhookEvents.eventType,
          occurredAt: billingWebhookEvents.occurredAt,
        })
        .from(billingWebhookEvents)
        .where(
          and(
            eq(billingWebhookEvents.provider, event.provider),
            eq(billingWebhookEvents.subscriptionId, event.subscriptionId),
            ne(billingWebhookEvents.eventId, event.eventId),
            or(
              eq(billingWebhookEvents.outcome, "processed"),
              eq(billingWebhookEvents.reason, "missing_period"),
            ),
            gte(billingWebhookEvents.occurredAt, event.occurredAt),
          ),
        );
      const sameTimestamp = competingEvents.filter(
        (candidate) =>
          candidate.occurredAt.getTime() === event.occurredAt.getTime(),
      );
      if (
        competingEvents.some(
          (candidate) => candidate.occurredAt > event.occurredAt,
        ) ||
        sameTimestamp.some(
          (candidate) =>
            subscriptionEventPrecedence(
              candidate.eventType as BillingSubscriptionEvent["eventType"],
            ) >= subscriptionEventPrecedence(event.eventType),
        )
      )
        return markIgnored("out_of_order");
      const [existing] = await tx
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.provider, event.provider),
            eq(subscriptions.providerSubscriptionId, event.subscriptionId),
          ),
        )
        .limit(1);
      if (existing?.userId !== undefined && existing.userId !== userId)
        return markIgnored("ownership_mismatch");
      if (
        existing?.providerCustomerId &&
        existing.providerCustomerId !== event.customerId
      )
        return markIgnored("customer_mismatch");
      if (
        existing?.lastProviderEventAt &&
        (event.occurredAt < existing.lastProviderEventAt ||
          (event.occurredAt.getTime() ===
            existing.lastProviderEventAt.getTime() &&
            sameTimestamp.length === 0))
      )
        return markIgnored("out_of_order");
      if (!existing && !event.accessEndsAt)
        return markIgnored("missing_period");
      const providerValues = {
        userId,
        status: event.status,
        planCode: "premium",
        provider: event.provider,
        providerSubscriptionId: event.subscriptionId,
        providerCustomerId: event.customerId,
        providerProductId: event.productId,
        lastProviderEventAt: event.occurredAt,
        currentPeriodStart:
          event.currentPeriodStart ?? existing?.currentPeriodStart ?? null,
        currentPeriodEnd: event.accessEndsAt ?? existing?.currentPeriodEnd,
        cancelAtPeriodEnd:
          event.cancelAtPeriodEnd ?? existing?.cancelAtPeriodEnd ?? false,
        cancelsAt:
          event.cancelsAt !== undefined
            ? event.cancelsAt
            : (existing?.cancelsAt ?? null),
        updatedAt: new Date(),
        ...(event.provider === "paddle"
          ? {
              paddleSubscriptionId: event.subscriptionId,
              paddleCustomerId: event.customerId,
              paddlePriceId: event.productId,
              lastPaddleEventAt: event.occurredAt,
            }
          : {}),
      };
      if (existing)
        await tx
          .update(subscriptions)
          .set(providerValues)
          .where(eq(subscriptions.id, existing.id));
      else
        await tx
          .insert(subscriptions)
          .values({ id: crypto.randomUUID(), ...providerValues });
      if (event.provider === "paddle") {
        await tx
          .insert(paddleWebhookEvents)
          .values({
            eventId: event.eventId,
            subscriptionId: event.subscriptionId,
            eventType: event.eventType,
            occurredAt: event.occurredAt,
            outcome: "processed",
          })
          .onConflictDoNothing();
        await tx
          .insert(billingProviderCustomers)
          .values({
            id: crypto.randomUUID(),
            userId,
            provider: "paddle",
            providerCustomerId: event.customerId,
          })
          .onConflictDoNothing();
      }
      return "processed" as const;
    });
  }

  async markCancellationScheduled(subscriptionId: string, cancelsAt: Date) {
    await db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: true,
        cancelsAt,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscriptionId));
  }

  async getVerifiedResponsesCountToday(
    userId: string,
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(responses)
      .innerJoin(
        studySessionItems,
        eq(responses.sessionItemId, studySessionItems.id),
      )
      .innerJoin(
        studySessions,
        eq(studySessionItems.sessionId, studySessions.id),
      )
      .where(
        and(
          eq(studySessions.userId, userId),
          gte(responses.verifiedAt, startOfDay),
          lt(responses.verifiedAt, endOfDay),
        ),
      );
    return Number(result?.count ?? 0);
  }
}
