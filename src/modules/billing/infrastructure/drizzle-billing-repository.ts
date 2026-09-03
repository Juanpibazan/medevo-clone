import { eq, and, gte, inArray, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  subscriptions,
  responses,
  studySessionItems,
  studySessions,
  paddleWebhookEvents,
  users,
} from "@/db/schema";
import type { PaddleSubscriptionEvent, Subscription } from "../domain/billing";

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

export class DrizzleBillingRepository implements BillingRepository {
  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    const now = new Date();
    const [row] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          inArray(subscriptions.status, ["active", "trialing"]),
          gte(subscriptions.currentPeriodEnd, now),
        ),
      )
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      userId: row.userId,
      status: row.status,
      planCode: row.planCode,
      currentPeriodStart: row.currentPeriodStart,
      currentPeriodEnd: row.currentPeriodEnd,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      paddleSubscriptionId: row.paddleSubscriptionId,
      paddleCustomerId: row.paddleCustomerId,
      paddlePriceId: row.paddlePriceId,
      lastPaddleEventAt: row.lastPaddleEventAt,
    };
  }

  async processPaddleSubscriptionEvent(event: PaddleSubscriptionEvent) {
    return db.transaction(async (tx) => {
      // Paddle may deliver events for one subscription concurrently. A
      // transaction-scoped PostgreSQL lock makes the occurredAt ordering check
      // race-free without blocking events for other subscriptions.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${event.subscriptionId}, 0))`,
      );
      const [knownUser] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, event.userId))
        .limit(1);
      if (!knownUser) return "ignored" as const;
      const inserted = await tx
        .insert(paddleWebhookEvents)
        .values({
          eventId: event.eventId,
          subscriptionId: event.subscriptionId,
          eventType: event.eventType,
          occurredAt: event.occurredAt,
          outcome: "processed",
        })
        .onConflictDoNothing()
        .returning({ id: paddleWebhookEvents.eventId });
      if (!inserted.length) return "duplicate" as const;
      const [newerEvent] = await tx
        .select({ eventId: paddleWebhookEvents.eventId })
        .from(paddleWebhookEvents)
        .where(
          and(
            eq(paddleWebhookEvents.subscriptionId, event.subscriptionId),
            ne(paddleWebhookEvents.eventId, event.eventId),
            gte(paddleWebhookEvents.occurredAt, event.occurredAt),
          ),
        )
        .limit(1);
      if (newerEvent) {
        await tx
          .update(paddleWebhookEvents)
          .set({ outcome: "ignored", reason: "out_of_order" })
          .where(eq(paddleWebhookEvents.eventId, event.eventId));
        return "ignored" as const;
      }
      const [existing] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.paddleSubscriptionId, event.subscriptionId))
        .limit(1);
      if (
        existing?.lastPaddleEventAt &&
        event.occurredAt <= existing.lastPaddleEventAt
      ) {
        await tx
          .update(paddleWebhookEvents)
          .set({ outcome: "ignored", reason: "out_of_order" })
          .where(eq(paddleWebhookEvents.eventId, event.eventId));
        return "ignored" as const;
      }
      if (!existing && (!event.currentPeriodStart || !event.currentPeriodEnd)) {
        await tx
          .update(paddleWebhookEvents)
          .set({ outcome: "ignored", reason: "missing_period" })
          .where(eq(paddleWebhookEvents.eventId, event.eventId));
        return "ignored" as const;
      }
      const values = {
        userId: event.userId,
        status: event.status,
        planCode: "premium",
        currentPeriodStart:
          event.currentPeriodStart ?? existing?.currentPeriodStart,
        currentPeriodEnd: event.currentPeriodEnd ?? existing?.currentPeriodEnd,
        paddleSubscriptionId: event.subscriptionId,
        paddleCustomerId: event.customerId,
        paddlePriceId: event.priceId,
        lastPaddleEventAt: event.occurredAt,
        updatedAt: new Date(),
      };
      if (existing)
        await tx
          .update(subscriptions)
          .set(values)
          .where(eq(subscriptions.id, existing.id));
      else
        await tx
          .insert(subscriptions)
          .values({ id: crypto.randomUUID(), ...values });
      return "processed" as const;
    });
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
