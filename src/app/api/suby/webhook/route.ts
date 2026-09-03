import { getSubyConfig } from "@/modules/billing/infrastructure/suby-config";
import {
  mapSubyEvent,
  verifySubyWebhookSignature,
} from "@/modules/billing/infrastructure/suby-webhook";
import { DrizzleBillingRepository } from "@/modules/billing/infrastructure/drizzle-billing-repository";

export const runtime = "nodejs";
const MAX_WEBHOOK_BYTES = 256 * 1024;

async function readBoundedBody(request: Request) {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_WEBHOOK_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_WEBHOOK_BYTES)
    return new Response("Payload too large", { status: 413 });
  const timestamp = request.headers.get("x-webhook-timestamp") ?? "";
  const signature = request.headers.get("x-webhook-signature") ?? "";
  const rawBody = await readBoundedBody(request);
  if (!rawBody) return new Response("Payload too large", { status: 413 });
  let config;
  try {
    config = getSubyConfig();
  } catch {
    return new Response("Webhook unavailable", { status: 500 });
  }
  if (!config.enabled)
    return new Response("Webhook unavailable", { status: 503 });
  if (
    !verifySubyWebhookSignature({
      rawBody,
      timestamp,
      signature,
      secret: config.SUBY_WEBHOOK_SECRET,
    })
  )
    return new Response("Invalid signature", { status: 400 });
  let event;
  try {
    event = mapSubyEvent(rawBody);
    if (!event) return new Response("Ignored", { status: 200 });
  } catch {
    return new Response("Invalid event", { status: 400 });
  }
  if (
    ![config.SUBY_MONTHLY_PRODUCT_ID, config.SUBY_YEARLY_PRODUCT_ID].includes(
      event.productId,
    )
  ) {
    try {
      await new DrizzleBillingRepository().recordIgnoredWebhookEvent(
        event,
        "unknown_product",
      );
      return new Response("Ignored", { status: 200 });
    } catch {
      return new Response("Processing failed", { status: 500 });
    }
  }
  try {
    await new DrizzleBillingRepository().processSubscriptionEvent(event);
    return new Response("Processed", { status: 200 });
  } catch {
    return new Response("Processing failed", { status: 500 });
  }
}
