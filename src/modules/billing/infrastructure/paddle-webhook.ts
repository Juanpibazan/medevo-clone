import "server-only";
import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import { z } from "zod";
import { getPaddleConfig } from "./paddle-config";
import {
  PADDLE_SUBSCRIPTION_EVENTS,
  type PaddleSubscriptionEvent,
  normalizeSubscriptionStatus,
} from "../domain/billing";
import { verifyPaddleCheckoutUser } from "./paddle-checkout-signature";

const dataSchema = z.object({
  id: z.string(),
  status: z.string(),
  customerId: z.string(),
  customData: z.record(z.string(), z.unknown()).nullable(),
  items: z.array(
    z.object({ quantity: z.number(), price: z.object({ id: z.string() }) }),
  ),
  currentBillingPeriod: z
    .object({ startsAt: z.string(), endsAt: z.string() })
    .nullable(),
  scheduledChange: z
    .object({ action: z.string(), effectiveAt: z.string() })
    .nullable()
    .optional(),
});

export async function verifyAndMapPaddleEvent(
  rawBody: string,
  signature: string,
): Promise<PaddleSubscriptionEvent | null> {
  const config = getPaddleConfig();
  const paddle = new Paddle(config.PADDLE_API_KEY, {
    environment: Environment.sandbox,
  });
  const event = await paddle.webhooks.unmarshal(
    rawBody,
    config.PADDLE_NOTIFICATION_WEBHOOK_SECRET,
    signature,
  );
  if (
    !PADDLE_SUBSCRIPTION_EVENTS.includes(
      event.eventType as (typeof PADDLE_SUBSCRIPTION_EVENTS)[number],
    )
  )
    return null;
  const parsed = dataSchema.safeParse(event.data);
  if (!parsed.success) return null;
  const data = parsed.data;
  const userId = data.customData?.app_user_id;
  const userSignature = data.customData?.app_user_signature;
  if (
    typeof userId !== "string" ||
    typeof userSignature !== "string" ||
    !verifyPaddleCheckoutUser(
      userId,
      userSignature,
      config.PADDLE_CHECKOUT_SIGNING_SECRET,
    ) ||
    data.items.length !== 1
  )
    return null;
  const item = data.items[0];
  if (!item) return null;
  return {
    provider: "paddle",
    eventId: event.eventId,
    eventType: event.eventType as PaddleSubscriptionEvent["eventType"],
    occurredAt: new Date(event.occurredAt),
    subscriptionId: data.id,
    customerId: data.customerId,
    userId,
    productId: item.price.id,
    quantity: item.quantity,
    status: normalizeSubscriptionStatus(data.status),
    currentPeriodStart: data.currentBillingPeriod
      ? new Date(data.currentBillingPeriod.startsAt)
      : null,
    accessEndsAt: data.currentBillingPeriod
      ? new Date(data.currentBillingPeriod.endsAt)
      : null,
    cancelAtPeriodEnd: data.scheduledChange?.action === "cancel",
    cancelsAt:
      data.scheduledChange?.action === "cancel"
        ? new Date(data.scheduledChange.effectiveAt)
        : null,
  };
}
