import { describe, expect, it } from "vitest";
import {
  grantsPremium,
  normalizeCountryCode,
} from "@/modules/billing/domain/billing";
import { parsePaddleConfig } from "@/modules/billing/domain/paddle-config";

describe("Paddle billing domain", () => {
  it("normalizes valid request country codes and rejects sentinels", () => {
    expect(normalizeCountryCode(" br ")).toBe("BR");
    expect(normalizeCountryCode("OTHERS")).toBeUndefined();
    expect(normalizeCountryCode(null)).toBeUndefined();
  });
  it("only grants premium to active or trialing subscriptions in period", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(grantsPremium("active", new Date("2026-01-02T00:00:00Z"), now)).toBe(
      true,
    );
    expect(
      grantsPremium("trialing", new Date("2026-01-02T00:00:00Z"), now),
    ).toBe(true);
    expect(
      grantsPremium("past_due", new Date("2026-01-02T00:00:00Z"), now),
    ).toBe(false);
    expect(grantsPremium("active", now, now)).toBe(false);
  });
});

describe("Paddle config", () => {
  const valid = {
    PADDLE_ENV: "sandbox",
    NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: "test_token",
    PADDLE_API_KEY: "pdl_sdbx_key",
    PADDLE_NOTIFICATION_WEBHOOK_SECRET: "secret",
    PADDLE_CHECKOUT_SIGNING_SECRET: "checkout-signing-secret-at-least-32-chars",
    PADDLE_MONTHLY_PRICE_ID: "pri_month",
    PADDLE_YEARLY_PRICE_ID: "pri_year",
    NEXT_PUBLIC_APP_URL: "https://example.test",
  };
  it("accepts an explicit sandbox configuration", () => {
    expect(parsePaddleConfig(valid).PADDLE_ENV).toBe("sandbox");
  });
  it("fails when environment is absent or credentials use live prefixes", () => {
    expect(() =>
      parsePaddleConfig({ ...valid, PADDLE_ENV: undefined }),
    ).toThrow();
    expect(() =>
      parsePaddleConfig({
        ...valid,
        NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: "live_token",
      }),
    ).toThrow();
    expect(() =>
      parsePaddleConfig({ ...valid, PADDLE_API_KEY: "pdl_live_key" }),
    ).toThrow();
  });
});
