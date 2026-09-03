export type BillingProvider = "paddle" | "suby";
export type BillingCycle = "month" | "year";
export type SubscriptionTier = "free" | "premium";
export type NormalizedSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "paused"
  | "canceled"
  | "expired"
  | "incomplete";

export interface Subscription {
  id: string;
  userId: string;
  provider: BillingProvider;
  providerSubscriptionId: string | null;
  providerCustomerId: string | null;
  providerProductId: string | null;
  status: NormalizedSubscriptionStatus;
  planCode: string;
  currentPeriodStart: Date | null;
  accessEndsAt: Date;
  cancelAtPeriodEnd: boolean;
  cancelsAt: Date | null;
  lastProviderEventAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  paddleSubscriptionId: string | null;
  paddleCustomerId: string | null;
  paddlePriceId: string | null;
  lastPaddleEventAt: Date | null;
}

export type CheckoutResult =
  | {
      kind: "paddle_overlay";
      provider: "paddle";
      priceId: string;
      clientToken: string;
      environment: "sandbox";
      successUrl: string;
      customerEmail: string;
      customData: { app_user_id: string; app_user_signature: string };
    }
  | { kind: "hosted_redirect"; provider: "suby"; url: string };

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

export const SUBY_SUBSCRIPTION_EVENTS = [
  "subscription.created",
  "subscription.renewed",
  "subscription.updated",
  "subscription.past_due",
  "subscription.canceled",
  "subscription.expired",
] as const;
export type SubySubscriptionEventType =
  (typeof SUBY_SUBSCRIPTION_EVENTS)[number];

export interface BillingSubscriptionEvent {
  provider: BillingProvider;
  eventId: string;
  eventType: PaddleSubscriptionEventType | SubySubscriptionEventType;
  occurredAt: Date;
  subscriptionId: string;
  customerId: string;
  userId?: string;
  productId: string;
  quantity: number;
  status: NormalizedSubscriptionStatus;
  currentPeriodStart: Date | null;
  accessEndsAt: Date | null;
  cancelAtPeriodEnd?: boolean;
  cancelsAt?: Date | null;
}

export type PaddleSubscriptionEvent = BillingSubscriptionEvent & {
  provider: "paddle";
  userId: string;
};

export function normalizeSubscriptionStatus(
  value: string,
): NormalizedSubscriptionStatus {
  const status = value.trim().toLowerCase().replace("cancelled", "canceled");
  return [
    "active",
    "trialing",
    "past_due",
    "paused",
    "canceled",
    "expired",
    "incomplete",
  ].includes(status)
    ? (status as NormalizedSubscriptionStatus)
    : "incomplete";
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

export function blocksNewCheckout(status: string) {
  return !["canceled", "expired"].includes(status);
}

export function subscriptionEventPrecedence(
  eventType: PaddleSubscriptionEventType | SubySubscriptionEventType,
) {
  if (
    eventType === "subscription.canceled" ||
    eventType === "subscription.expired"
  )
    return 50;
  if (
    eventType === "subscription.past_due" ||
    eventType === "subscription.paused"
  )
    return 40;
  if (eventType === "subscription.updated") return 30;
  return 20;
}

export const DAILY_LIMIT_FREE = 10;
