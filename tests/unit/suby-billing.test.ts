// @vitest-environment node
import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { parseSubyConfig } from "@/modules/billing/domain/suby-config";
import {
  blocksNewCheckout,
  grantsPremium,
  normalizeSubscriptionStatus,
  subscriptionEventPrecedence,
} from "@/modules/billing/domain/billing";
import {
  mapSubyEvent,
  verifySubyWebhookSignature,
} from "@/modules/billing/infrastructure/suby-webhook";
import {
  SubyClient,
  validateSubyCheckoutUrl,
} from "@/modules/billing/infrastructure/suby-client";

vi.mock("server-only", () => ({}));

const validConfig = {
  SUBY_ENABLED: "true",
  SUBY_ENV: "sandbox",
  SUBY_BASE_URL: "https://api.beta.suby.fi",
  SUBY_CHECKOUT_HOST: "checkout.beta.suby.fi",
  SUBY_API_KEY: "sk_sandbox_test",
  SUBY_WEBHOOK_SECRET: "whsec_test",
  SUBY_MONTHLY_PRODUCT_ID: "pro_month",
  SUBY_YEARLY_PRODUCT_ID: "pro_year",
  NEXT_PUBLIC_APP_URL: "https://example.test",
};

describe("Suby sandbox boundaries", () => {
  it("is disabled without partial credentials and rejects live or foreign API origins", () => {
    expect(parseSubyConfig({})).toEqual({ enabled: false });
    expect(() =>
      parseSubyConfig({ ...validConfig, SUBY_API_KEY: "sk_live_test" }),
    ).toThrow();
    expect(() =>
      parseSubyConfig({ ...validConfig, SUBY_BASE_URL: "https://evil.test" }),
    ).toThrow();
    expect(() =>
      parseSubyConfig({
        ...validConfig,
        SUBY_YEARLY_PRODUCT_ID: validConfig.SUBY_MONTHLY_PRODUCT_ID,
      }),
    ).toThrow();
  });

  it("only accepts HTTPS checkout URLs on the exact configured host", () => {
    expect(
      validateSubyCheckoutUrl(
        "https://checkout.beta.suby.fi/cs_test",
        "checkout.beta.suby.fi",
      ),
    ).toBe("https://checkout.beta.suby.fi/cs_test");
    expect(() =>
      validateSubyCheckoutUrl(
        "https://checkout.beta.suby.fi.evil.test/cs_test",
        "checkout.beta.suby.fi",
      ),
    ).toThrow();
  });

  it("creates hosted subscription checkout with exclusive tax and idempotency", async () => {
    const parsed = parseSubyConfig(validConfig);
    if (!parsed.enabled) throw new Error("Expected enabled Suby config");
    const request = vi.fn().mockResolvedValue(
      Response.json({
        success: true,
        data: {
          id: "cs_test",
          url: "https://checkout.beta.suby.fi/cs_test",
        },
      }),
    );
    await new SubyClient(parsed, request).createCheckout({
      customerId: "cus_test",
      productId: "pro_month",
      successUrl: "https://example.test/es/welcome",
      cancelUrl: "https://example.test/es/pricing",
      locale: "es",
      idempotencyKey: "attempt-1",
    });
    const [url, init] = request.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(
      "https://api.beta.suby.fi/v3/checkout/sessions",
    );
    expect(init.headers).toMatchObject({ "Idempotency-Key": "attempt-1" });
    expect(JSON.parse(String(init.body))).toMatchObject({
      mode: "subscription",
      customerId: "cus_test",
      productId: "pro_month",
      taxBehavior: "exclusive",
    });
  });

  it("creates and updates customer with firstName and lastName", async () => {
    const parsed = parseSubyConfig(validConfig);
    if (!parsed.enabled) throw new Error("Expected enabled Suby config");
    const createRequest = vi.fn().mockResolvedValue(
      Response.json({
        success: true,
        data: { id: "cus_123" },
      }),
    );
    const client = new SubyClient(parsed, createRequest);
    const customer = await client.createCustomer(
      { email: "user@example.com", firstName: "Juan", lastName: "Pérez" },
      "att-1",
    );
    expect(customer.id).toBe("cus_123");
    const [createUrl, createInit] = createRequest.mock.calls[0] as [
      URL,
      RequestInit,
    ];
    expect(createUrl.toString()).toBe("https://api.beta.suby.fi/v3/customers");
    expect(createInit.method).toBe("POST");
    expect(createInit.headers).toMatchObject({
      "Idempotency-Key": "att-1:customer",
    });
    expect(JSON.parse(String(createInit.body))).toEqual({
      email: "user@example.com",
      firstName: "Juan",
      lastName: "Pérez",
    });

    const updateRequest = vi.fn().mockResolvedValue(
      Response.json({
        success: true,
        data: { id: "cus_123" },
      }),
    );
    const updateClient = new SubyClient(parsed, updateRequest);
    await updateClient.updateCustomer("cus_123", {
      firstName: "Juan Carlos",
      lastName: "Pérez",
    });
    const [updateUrl, updateInit] = updateRequest.mock.calls[0] as [
      URL,
      RequestInit,
    ];
    expect(updateUrl.toString()).toBe(
      "https://api.beta.suby.fi/v3/customers/cus_123",
    );
    expect(updateInit.method).toBe("PATCH");
    expect(JSON.parse(String(updateInit.body))).toEqual({
      firstName: "Juan Carlos",
      lastName: "Pérez",
    });
  });

  it("only accepts the configured USD product with a positive integer price", async () => {
    const parsed = parseSubyConfig(validConfig);
    if (!parsed.enabled) throw new Error("Expected enabled Suby config");
    const validRequest = vi.fn().mockResolvedValue(
      Response.json({
        success: true,
        data: { id: "pro_month", priceCents: "1299", currency: "usd" },
      }),
    );
    await expect(
      new SubyClient(parsed, validRequest).getProduct("pro_month"),
    ).resolves.toMatchObject({ priceCents: 1299, currency: "USD" });

    for (const data of [
      { id: "pro_other", priceCents: 1299, currency: "USD" },
      { id: "pro_month", priceCents: -1, currency: "USD" },
      { id: "pro_month", priceCents: "NaN", currency: "USD" },
      { id: "pro_month", priceCents: 1299, currency: "EUR" },
    ]) {
      const request = vi
        .fn()
        .mockResolvedValue(Response.json({ success: true, data }));
      await expect(
        new SubyClient(parsed, request).getProduct("pro_month"),
      ).rejects.toThrow();
    }
  });
});

describe("Suby webhook verification", () => {
  const rawBody = '{"id":"evt_test"}';
  const secret = "whsec_test";
  const now = new Date("2026-09-03T12:00:00Z");
  const timestamp = String(now.getTime() / 1000);
  const signature = `v1=${createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")}`;

  it("accepts a valid signature and rejects invalid, differently-sized and stale signatures", () => {
    expect(
      verifySubyWebhookSignature({
        rawBody,
        secret,
        timestamp,
        signature,
        now,
      }),
    ).toBe(true);
    expect(
      verifySubyWebhookSignature({
        rawBody,
        secret,
        timestamp,
        signature: "v1=aa",
        now,
      }),
    ).toBe(false);
    expect(
      verifySubyWebhookSignature({
        rawBody,
        secret,
        timestamp: "1e9",
        signature,
        now,
      }),
    ).toBe(false);
    expect(
      verifySubyWebhookSignature({
        rawBody,
        secret,
        timestamp,
        signature: signature.replace(/.$/, "0"),
        now,
      }),
    ).toBe(false);
    expect(
      verifySubyWebhookSignature({
        rawBody,
        secret,
        timestamp: String(Number(timestamp) - 301),
        signature,
        now,
      }),
    ).toBe(false);
  });

  it("normalizes snake_case subscription data and rejects live events", () => {
    const payload = JSON.stringify({
      id: "evt_1",
      type: "subscription.created",
      createdAt: "2026-09-03T12:00:00.000Z",
      api_version: "2026-05-12",
      livemode: false,
      data: {
        object: "subscription",
        id: "sub_1",
        status: "ACTIVE",
        customer: { id: "cus_1" },
        product: { id: "pro_month" },
        current_cycle_due_at: "2026-10-03T12:00:00.000Z",
        cancel_at_period_end: false,
      },
    });
    expect(mapSubyEvent(payload)).toMatchObject({
      provider: "suby",
      status: "active",
      customerId: "cus_1",
    });
    const withoutCancellation = mapSubyEvent(
      payload.replace(',"cancel_at_period_end":false', ""),
    );
    expect(withoutCancellation?.cancelAtPeriodEnd).toBeUndefined();
    expect(withoutCancellation?.cancelsAt).toBeUndefined();
    expect(() =>
      mapSubyEvent(payload.replace('"livemode":false', '"livemode":true')),
    ).toThrow();
    expect(() =>
      mapSubyEvent(
        payload.replace(
          '"current_cycle_due_at":"2026-10-03T12:00:00.000Z"',
          '"currentCycleDueAt":"2026-11-03T12:00:00.000Z","current_cycle_due_at":"2026-10-03T12:00:00.000Z"',
        ),
      ),
    ).toThrow(/Conflicting/);
  });
});

describe("provider-neutral subscription policy", () => {
  it("separates Premium access from checkout blocking", () => {
    const now = new Date("2026-09-03T12:00:00Z");
    const later = new Date("2026-09-04T12:00:00Z");
    expect(normalizeSubscriptionStatus("CANCELLED")).toBe("canceled");
    expect(normalizeSubscriptionStatus("unknown")).toBe("incomplete");
    expect(grantsPremium("active", later, now)).toBe(true);
    expect(grantsPremium("past_due", later, now)).toBe(false);
    expect(blocksNewCheckout("past_due")).toBe(true);
    expect(blocksNewCheckout("paused")).toBe(true);
    expect(blocksNewCheckout("canceled")).toBe(false);
    expect(
      subscriptionEventPrecedence("subscription.canceled"),
    ).toBeGreaterThan(subscriptionEventPrecedence("subscription.updated"));
  });
});
