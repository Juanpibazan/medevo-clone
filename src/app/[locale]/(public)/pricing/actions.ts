"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/modules/identity";
import type { CheckoutResult } from "@/modules/billing/domain/billing";
import { getPaddleConfig } from "@/modules/billing/infrastructure/paddle-config";
import { createPaddleCheckoutCustomData } from "@/modules/billing/infrastructure/paddle-checkout-signature";
import { getSubyConfig } from "@/modules/billing/infrastructure/suby-config";
import {
  SubyClient,
  validateSubyCheckoutUrl,
} from "@/modules/billing/infrastructure/suby-client";
import { DrizzleBillingRepository } from "@/modules/billing/infrastructure/drizzle-billing-repository";

const inputSchema = z.object({
  provider: z.enum(["paddle", "suby"]),
  cycle: z.enum(["month", "year"]),
  locale: z.enum(["pt-BR", "es"]),
});

export async function startCheckoutAction(
  input: z.input<typeof inputSchema>,
): Promise<CheckoutResult> {
  const parsed = inputSchema.parse(input);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("AUTH_REQUIRED");
  const repository = new DrizzleBillingRepository();
  const attempt = await repository.reserveCheckoutAttempt(
    session.user.id,
    parsed.provider,
    parsed.cycle,
  );
  if (attempt.kind === "blocked") throw new Error("CHECKOUT_BLOCKED");
  try {
    if (parsed.provider === "paddle") {
      const config = getPaddleConfig();
      const priceId =
        parsed.cycle === "month"
          ? config.PADDLE_MONTHLY_PRICE_ID
          : config.PADDLE_YEARLY_PRICE_ID;
      await repository.completeCheckoutAttempt(attempt.id, null);
      return {
        kind: "paddle_overlay",
        provider: "paddle",
        priceId,
        clientToken: config.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
        environment: "sandbox",
        successUrl: `${config.NEXT_PUBLIC_APP_URL}/${parsed.locale}/welcome`,
        customerEmail: session.user.email,
        customData: createPaddleCheckoutCustomData(
          session.user.id,
          config.PADDLE_CHECKOUT_SIGNING_SECRET,
        ),
      };
    }
    const config = getSubyConfig();
    if (!config.enabled) throw new Error("PROVIDER_UNAVAILABLE");
    const client = new SubyClient(config);
    let customerId = await repository.getProviderCustomer(
      session.user.id,
      "suby",
    );
    if (!customerId) {
      customerId = (
        await client.createCustomer(session.user.email, attempt.idempotencyKey)
      ).id;
      await repository.linkProviderCustomer(
        session.user.id,
        "suby",
        customerId,
      );
    }
    const productId =
      parsed.cycle === "month"
        ? config.SUBY_MONTHLY_PRODUCT_ID
        : config.SUBY_YEARLY_PRODUCT_ID;
    const checkout = await client.createCheckout({
      customerId,
      productId,
      successUrl: `${config.NEXT_PUBLIC_APP_URL}/${parsed.locale}/welcome`,
      cancelUrl: `${config.NEXT_PUBLIC_APP_URL}/${parsed.locale}/pricing`,
      locale: parsed.locale,
      idempotencyKey: attempt.idempotencyKey,
    });
    const url = validateSubyCheckoutUrl(
      checkout.url,
      config.SUBY_CHECKOUT_HOST,
    );
    await repository.completeCheckoutAttempt(attempt.id, checkout.id ?? null);
    return { kind: "hosted_redirect", provider: "suby", url };
  } catch (error) {
    if (attempt.kind === "created")
      await repository.failCheckoutAttempt(attempt.id);
    throw error;
  }
}
