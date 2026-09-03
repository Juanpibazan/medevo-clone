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
  paddleSubscriptionId: string | null;
  paddleCustomerId: string | null;
  paddlePriceId: string | null;
  lastPaddleEventAt: Date | null;
}

export const PADDLE_SUBSCRIPTION_EVENTS = [
  "subscription.created",
  "subscription.activated",
  "subscription.updated",
  "subscription.canceled",
  "subscription.past_due",
  "subscription.paused",
  "subscription.resumed",
  "subscription.trialing",
] as const;
export type PaddleSubscriptionEventType =
  (typeof PADDLE_SUBSCRIPTION_EVENTS)[number];

export interface PaddleSubscriptionEvent {
  eventId: string;
  eventType: PaddleSubscriptionEventType;
  occurredAt: Date;
  subscriptionId: string;
  customerId: string;
  userId: string;
  priceId: string;
  quantity: number;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
}

export function normalizeCountryCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : undefined;
}

export function grantsPremium(
  status: string,
  periodEnd: Date,
  now = new Date(),
) {
  return (status === "active" || status === "trialing") && periodEnd > now;
}

export const DAILY_LIMIT_FREE = 10;
