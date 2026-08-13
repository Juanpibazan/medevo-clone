import { eq, and, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { subscriptions, responses, studySessionItems, studySessions } from "@/db/schema";
import type { Subscription } from "../domain/billing";

export interface BillingRepository {
  getActiveSubscription(userId: string): Promise<Subscription | null>;
  createOrUpdateSubscription(subscription: Omit<Subscription, "createdAt" | "updatedAt">): Promise<Subscription>;
  getVerifiedResponsesCountToday(userId: string, startOfDay: Date, endOfDay: Date): Promise<number>;
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
          eq(subscriptions.status, "active"),
          gte(subscriptions.currentPeriodEnd, now)
        )
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
    };
  }

  async createOrUpdateSubscription(
    subscription: Omit<Subscription, "createdAt" | "updatedAt">
  ): Promise<Subscription> {
    const now = new Date();
    
    // Check if subscription already exists for this user
    const [existing] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, subscription.userId))
      .limit(1);

    if (existing) {
      await db
        .update(subscriptions)
        .set({
          status: subscription.status,
          planCode: subscription.planCode,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, existing.id));
    } else {
      await db.insert(subscriptions).values({
        id: subscription.id,
        userId: subscription.userId,
        status: subscription.status,
        planCode: subscription.planCode,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        createdAt: now,
        updatedAt: now,
      });
    }

    const [updated] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, subscription.userId))
      .limit(1);

    if (!updated) {
      throw new Error("Failed to retrieve updated subscription");
    }

    return {
      id: updated.id,
      userId: updated.userId,
      status: updated.status,
      planCode: updated.planCode,
      currentPeriodStart: updated.currentPeriodStart,
      currentPeriodEnd: updated.currentPeriodEnd,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async getVerifiedResponsesCountToday(
    userId: string,
    startOfDay: Date,
    endOfDay: Date
  ): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(responses)
      .innerJoin(studySessionItems, eq(responses.sessionItemId, studySessionItems.id))
      .innerJoin(studySessions, eq(studySessionItems.sessionId, studySessions.id))
      .where(
        and(
          eq(studySessions.userId, userId),
          gte(responses.verifiedAt, startOfDay),
          lt(responses.verifiedAt, endOfDay)
        )
      );

    return Number(result?.count ?? 0);
  }
}
