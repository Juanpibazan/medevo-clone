"use server";

import { headers } from "next/headers";
import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import { auth } from "@/modules/identity";
import { blocksNewCheckout } from "@/modules/billing/domain/billing";
import { getPaddleConfig } from "@/modules/billing/infrastructure/paddle-config";
import { getSubyConfig } from "@/modules/billing/infrastructure/suby-config";
import { SubyClient } from "@/modules/billing/infrastructure/suby-client";
import { DrizzleBillingRepository } from "@/modules/billing/infrastructure/drizzle-billing-repository";

export async function cancelSubscriptionAction() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("AUTH_REQUIRED");
  const repository = new DrizzleBillingRepository();
  return repository.withUserBillingLock(session.user.id, async (locked) => {
    const candidates = (await locked.getUserSubscriptions()).filter(
      (subscription) => blocksNewCheckout(subscription.status),
    );
    if (candidates.length !== 1) throw new Error("MANUAL_SUPPORT_REQUIRED");
    const subscription = candidates[0];
    if (!subscription) throw new Error("NOT_CANCELABLE");
    if (
      !subscription.providerSubscriptionId ||
      !subscription.providerCustomerId ||
      !subscription.providerProductId
    )
      throw new Error("MANUAL_SUPPORT_REQUIRED");
    if (subscription.cancelAtPeriodEnd) {
      const existingDate = subscription.cancelsAt ?? subscription.accessEndsAt;
      return { cancelsAt: existingDate.toISOString() };
    }
    let cancelsAt = subscription.accessEndsAt;
    if (subscription.provider === "paddle") {
      const config = getPaddleConfig();
      const paddle = new Paddle(config.PADDLE_API_KEY, {
        environment: Environment.sandbox,
      });
      const updated = await paddle.subscriptions.cancel(
        subscription.providerSubscriptionId,
        { effectiveFrom: "next_billing_period" },
      );
      if (updated.scheduledChange?.action !== "cancel")
        throw new Error("CANCELLATION_NOT_CONFIRMED");
      cancelsAt = new Date(updated.scheduledChange.effectiveAt);
    } else {
      const config = getSubyConfig();
      if (!config.enabled) throw new Error("PROVIDER_UNAVAILABLE");
      cancelsAt = (
        await new SubyClient(config).cancelAtPeriodEnd(
          subscription.providerSubscriptionId,
          `cancel:${subscription.id}`,
        )
      ).cancelsAt;
    }
    await locked.markCancellationScheduled(subscription.id, cancelsAt);
    return { cancelsAt: cancelsAt.toISOString() };
  });
}
