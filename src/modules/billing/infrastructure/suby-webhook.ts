import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  normalizeSubscriptionStatus,
  SUBY_SUBSCRIPTION_EVENTS,
  type BillingSubscriptionEvent,
} from "../domain/billing";

export function verifySubyWebhookSignature(input: {
  rawBody: string | Uint8Array;
  timestamp: string;
  signature: string;
  secret: string;
  now?: Date;
}) {
  if (!/^\d{10}$/.test(input.timestamp)) return false;
  const seconds = Number(input.timestamp);
  if (!Number.isSafeInteger(seconds)) return false;
  if (Math.abs((input.now ?? new Date()).getTime() / 1000 - seconds) > 300)
    return false;
  if (!/^v1=[a-f0-9]{64}$/i.test(input.signature)) return false;
  const digest = createHmac("sha256", input.secret)
    .update(`${input.timestamp}.`, "utf8")
    .update(input.rawBody)
    .digest("hex");
  const expected = `v1=${digest}`;
  const actualBuffer = Buffer.from(input.signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

const dataSchema = z.object({
  object: z.literal("subscription"),
  id: z.string(),
  status: z.string(),
  customer: z.object({ id: z.string() }),
  product: z.object({ id: z.string() }),
  currentCycleDueAt: z.string().datetime().optional(),
  current_cycle_due_at: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  cancel_at_period_end: z.boolean().optional(),
  cancelsAt: z.string().datetime().nullable().optional(),
  cancels_at: z.string().datetime().nullable().optional(),
});
const eventSchema = z.object({
  id: z.string(),
  type: z.string(),
  createdAt: z.string().datetime(),
  livemode: z.literal(false),
  data: dataSchema,
});

function alias<T>(camel: T | undefined, snake: T | undefined, field: string) {
  if (camel !== undefined && snake !== undefined && camel !== snake)
    throw new Error(`Conflicting Suby ${field} aliases`);
  return camel ?? snake;
}

export function mapSubyEvent(
  rawBody: string | Uint8Array,
): BillingSubscriptionEvent | null {
  const body =
    typeof rawBody === "string"
      ? rawBody
      : new TextDecoder("utf-8", { fatal: true }).decode(rawBody);
  const parsed = eventSchema.parse(JSON.parse(body));
  if (
    !SUBY_SUBSCRIPTION_EVENTS.includes(
      parsed.type as (typeof SUBY_SUBSCRIPTION_EVENTS)[number],
    )
  )
    return null;
  const accessEnd = alias(
    parsed.data.currentCycleDueAt ?? parsed.data.expiresAt,
    parsed.data.current_cycle_due_at ?? parsed.data.expires_at,
    "access end",
  );
  const cancellation = alias(
    parsed.data.cancelsAt,
    parsed.data.cancels_at,
    "cancellation date",
  );
  const cancelAtPeriodEnd = alias(
    parsed.data.cancelAtPeriodEnd,
    parsed.data.cancel_at_period_end,
    "cancel-at-period-end",
  );
  return {
    provider: "suby",
    eventId: parsed.id,
    eventType: parsed.type as (typeof SUBY_SUBSCRIPTION_EVENTS)[number],
    occurredAt: new Date(parsed.createdAt),
    subscriptionId: parsed.data.id,
    customerId: parsed.data.customer.id,
    productId: parsed.data.product.id,
    quantity: 1,
    status: normalizeSubscriptionStatus(parsed.data.status),
    currentPeriodStart: null,
    accessEndsAt: accessEnd ? new Date(accessEnd) : null,
    cancelAtPeriodEnd,
    cancelsAt:
      cancellation === undefined
        ? undefined
        : cancellation === null
          ? null
          : new Date(cancellation),
  };
}
