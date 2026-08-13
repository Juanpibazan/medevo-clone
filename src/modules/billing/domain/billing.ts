export type SubscriptionTier = "free" | "premium";

export interface Subscription {
  id: string;
  userId: string;
  status: string; // 'active', 'cancelled', 'expired'
  planCode: string; // 'premium'
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const DAILY_LIMIT_FREE = 10;
