import { getPaddleConfig } from "@/modules/billing/infrastructure/paddle-config";
import { verifyAndMapPaddleEvent } from "@/modules/billing/infrastructure/paddle-webhook";
import { DrizzleBillingRepository } from "@/modules/billing/infrastructure/drizzle-billing-repository";

export async function POST(request: Request) {
  const signature = request.headers.get("paddle-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  const rawBody = await request.text();
  let config;
  try {
    config = getPaddleConfig();
  } catch {
    return new Response("Webhook unavailable", { status: 500 });
  }
  let event;
  try {
    event = await verifyAndMapPaddleEvent(rawBody, signature);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  if (!event) return new Response("Ignored", { status: 200 });
  if (
    event.quantity !== 1 ||
    ![config.PADDLE_MONTHLY_PRICE_ID, config.PADDLE_YEARLY_PRICE_ID].includes(
      event.priceId,
    )
  )
    return new Response("Ignored", { status: 200 });
  try {
    await new DrizzleBillingRepository().processPaddleSubscriptionEvent(event);
  } catch {
    return new Response("Processing failed", { status: 500 });
  }
  return new Response("Processed", { status: 200 });
}
