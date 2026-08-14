import { describe, expect, it, vi, beforeEach } from "vitest";
import { BillingService } from "../../src/modules/billing/application/billing-service";
import type { BillingRepository } from "../../src/modules/billing/infrastructure/drizzle-billing-repository";
import { type Subscription, DAILY_LIMIT_FREE } from "../../src/modules/billing/domain/billing";

describe("BillingService Unit Tests", () => {
  let mockRepository: BillingRepository;
  let service: BillingService;

  const mockSubscription: Subscription = {
    id: "sub-1",
    userId: "user-1",
    status: "active",
    planCode: "premium",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 10000000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepository = {
      getActiveSubscription: vi.fn(),
      createOrUpdateSubscription: vi.fn(),
      getVerifiedResponsesCountToday: vi.fn(),
    };
    service = new BillingService(mockRepository);
  });

  it("should return premium status when subscription is active", async () => {
    vi.mocked(mockRepository.getActiveSubscription).mockResolvedValue(mockSubscription);

    const quota = await service.checkDailyQuota("user-1");

    expect(quota.tier).toBe("premium");
    expect(quota.isBlocked).toBe(false);
    expect(quota.limit).toBe(Infinity);
  });

  it("should return free status with 0 usage when no active subscription exists", async () => {
    vi.mocked(mockRepository.getActiveSubscription).mockResolvedValue(null);
    vi.mocked(mockRepository.getVerifiedResponsesCountToday).mockResolvedValue(0);

    const quota = await service.checkDailyQuota("user-1");

    expect(quota.tier).toBe("free");
    expect(quota.isBlocked).toBe(false);
    expect(quota.answeredToday).toBe(0);
    expect(quota.limit).toBe(DAILY_LIMIT_FREE);
  });

  it("should block user when daily free limit is reached", async () => {
    vi.mocked(mockRepository.getActiveSubscription).mockResolvedValue(null);
    vi.mocked(mockRepository.getVerifiedResponsesCountToday).mockResolvedValue(DAILY_LIMIT_FREE);

    const quota = await service.checkDailyQuota("user-1");

    expect(quota.tier).toBe("free");
    expect(quota.isBlocked).toBe(true);
    expect(quota.answeredToday).toBe(DAILY_LIMIT_FREE);
  });

  it("should block user when daily free limit is exceeded", async () => {
    vi.mocked(mockRepository.getActiveSubscription).mockResolvedValue(null);
    vi.mocked(mockRepository.getVerifiedResponsesCountToday).mockResolvedValue(DAILY_LIMIT_FREE + 2);

    const quota = await service.checkDailyQuota("user-1");

    expect(quota.tier).toBe("free");
    expect(quota.isBlocked).toBe(true);
    expect(quota.answeredToday).toBe(DAILY_LIMIT_FREE + 2);
  });

  it("should successfully upgrade a user to premium subscription", async () => {
    vi.mocked(mockRepository.createOrUpdateSubscription).mockImplementation(async (sub) => ({
      ...sub,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const subscription = await service.upgradeToPremium("user-1");

    expect(subscription.userId).toBe("user-1");
    expect(subscription.status).toBe("active");
    expect(subscription.planCode).toBe("premium");
    expect(mockRepository.createOrUpdateSubscription).toHaveBeenCalledOnce();
  });
});
