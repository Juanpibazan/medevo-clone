import { DrizzleBillingRepository } from "./infrastructure/drizzle-billing-repository";
import { BillingService } from "./application/billing-service";

export const billingService = new BillingService(new DrizzleBillingRepository());

export { BillingService } from "./application/billing-service";
export type { BillingRepository } from "./infrastructure/drizzle-billing-repository";
export type { Subscription, SubscriptionTier } from "./domain/billing";
export { DAILY_LIMIT_FREE } from "./domain/billing";
