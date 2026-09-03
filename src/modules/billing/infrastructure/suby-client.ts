import "server-only";
import { z } from "zod";
import type { SubyConfig } from "../domain/suby-config";

const customerSchema = z.object({ id: z.string().startsWith("cus_") });
const checkoutSchema = z.object({
  id: z.string().startsWith("cs_").optional(),
  url: z.string().url(),
});
const productSchema = z.object({
  id: z.string().startsWith("pro_"),
  priceCents: z
    .union([
      z.string().regex(/^\d+$/).transform(Number),
      z.number().int().safe(),
    ])
    .pipe(z.number().int().safe().positive()),
  currency: z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase()),
});
const cancelSchema = z.object({
  id: z.string(),
  cancelAtPeriodEnd: z.boolean().optional(),
  cancel_at_period_end: z.boolean().optional(),
  currentCycleDueAt: z.string().datetime().optional(),
  current_cycle_due_at: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional(),
});

export class SubyApiError extends Error {
  constructor(
    readonly status: number,
    message = "Suby request failed",
  ) {
    super(message);
  }
}

export class SubyClient {
  constructor(
    private readonly config: SubyConfig,
    private readonly request: typeof fetch = fetch,
  ) {}

  private async call<T extends z.ZodType>(
    path: string,
    schema: T,
    options: { method?: "GET" | "POST"; body?: unknown; key?: string } = {},
  ): Promise<z.infer<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await this.request(
        new URL(path, this.config.SUBY_BASE_URL),
        {
          method: options.method ?? "GET",
          headers: {
            "X-Suby-Api-Key": this.config.SUBY_API_KEY,
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.key ? { "Idempotency-Key": options.key } : {}),
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
          cache: "no-store",
        },
      );
      if (!response.ok) throw new SubyApiError(response.status);
      const responseEnvelope = z
        .object({ success: z.literal(true), data: z.unknown() })
        .parse(await response.json());
      return schema.parse(responseEnvelope.data);
    } finally {
      clearTimeout(timeout);
    }
  }

  createCustomer(email: string, idempotencyKey: string) {
    return this.call("/v3/customers", customerSchema, {
      method: "POST",
      key: `${idempotencyKey}:customer`,
      body: { email },
    });
  }

  createCheckout(input: {
    customerId: string;
    productId: string;
    successUrl: string;
    cancelUrl: string;
    locale: "pt-BR" | "es";
    idempotencyKey: string;
  }) {
    return this.call("/v3/checkout/sessions", checkoutSchema, {
      method: "POST",
      key: input.idempotencyKey,
      body: {
        mode: "subscription",
        customerId: input.customerId,
        productId: input.productId,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        locale: input.locale,
        taxBehavior: "exclusive",
      },
    });
  }

  async getProduct(productId: string) {
    const product = await this.call(
      `/v3/products/${encodeURIComponent(productId)}`,
      productSchema,
    );
    if (product.id !== productId || product.currency !== "USD")
      throw new SubyApiError(502, "Unexpected Suby product response");
    return product;
  }

  async cancelAtPeriodEnd(subscriptionId: string, idempotencyKey: string) {
    const data = await this.call(
      `/v3/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
      cancelSchema,
      {
        method: "POST",
        key: idempotencyKey,
        body: { atPeriodEnd: true },
      },
    );
    if (data.cancelAtPeriodEnd !== true && data.cancel_at_period_end !== true)
      throw new SubyApiError(
        502,
        "Suby did not confirm period-end cancellation",
      );
    const date =
      data.currentCycleDueAt ??
      data.current_cycle_due_at ??
      data.expiresAt ??
      data.expires_at;
    if (!date) throw new SubyApiError(502, "Suby omitted cancellation date");
    return { cancelsAt: new Date(date) };
  }
}

export function validateSubyCheckoutUrl(url: string, expectedHost: string) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== expectedHost ||
    parsed.username ||
    parsed.password ||
    parsed.port
  )
    throw new Error("Untrusted Suby checkout URL");
  return parsed.toString();
}
