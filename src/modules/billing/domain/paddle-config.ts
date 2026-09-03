import { z } from "zod";

const paddleConfigSchema = z.object({
  PADDLE_ENV: z.literal("sandbox"),
  NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: z.string().startsWith("test_"),
  PADDLE_API_KEY: z.string().includes("_sdbx"),
  PADDLE_NOTIFICATION_WEBHOOK_SECRET: z.string().min(1),
  PADDLE_CHECKOUT_SIGNING_SECRET: z.string().min(32),
  PADDLE_MONTHLY_PRICE_ID: z.string().startsWith("pri_"),
  PADDLE_YEARLY_PRICE_ID: z.string().startsWith("pri_"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export function parsePaddleConfig(input: Record<string, string | undefined>) {
  return paddleConfigSchema.parse(input);
}
