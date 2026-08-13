import { todayInSaoPaulo } from "@/modules/identity";
import { type Subscription, type SubscriptionTier, DAILY_LIMIT_FREE } from "../domain/billing";
import type { BillingRepository } from "../infrastructure/drizzle-billing-repository";

export class BillingService {
  constructor(private readonly repository: BillingRepository) {}

  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    return this.repository.getActiveSubscription(userId);
  }

  async upgradeToPremium(userId: string): Promise<Subscription> {
    const id = crypto.randomUUID();
    const now = new Date();
    // Premium subscription active for 1 year
    const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    
    return this.repository.createOrUpdateSubscription({
      id,
      userId,
      status: "active",
      planCode: "premium",
      currentPeriodStart: now,
      currentPeriodEnd: nextYear,
    });
  }

  async checkDailyQuota(userId: string): Promise<{
    isBlocked: boolean;
    answeredToday: number;
    limit: number;
    tier: SubscriptionTier;
  }> {
    const activeSub = await this.getActiveSubscription(userId);
    const tier: SubscriptionTier = activeSub ? "premium" : "free";

    if (tier === "premium") {
      return {
        isBlocked: false,
        answeredToday: 0, // Not needed for quota enforcement under premium
        limit: Infinity,
        tier,
      };
    }

    const todayStr = todayInSaoPaulo();
    // America/Sao_Paulo is permanently UTC-3
    const startOfDay = new Date(`${todayStr}T00:00:00-03:00`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999-03:00`);

    const answeredToday = await this.repository.getVerifiedResponsesCountToday(
      userId,
      startOfDay,
      endOfDay
    );

    return {
      isBlocked: answeredToday >= DAILY_LIMIT_FREE,
      answeredToday,
      limit: DAILY_LIMIT_FREE,
      tier,
    };
  }
}
