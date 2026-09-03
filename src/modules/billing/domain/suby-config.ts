import { z } from "zod";

const enabledSchema = z
  .object({
    SUBY_ENABLED: z.literal("true"),
    SUBY_ENV: z.literal("sandbox"),
    SUBY_BASE_URL: z.string().url(),
    SUBY_CHECKOUT_HOST: z.string().min(1),
    SUBY_API_KEY: z.string().startsWith("sk_sandbox_"),
    SUBY_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
    SUBY_MONTHLY_PRODUCT_ID: z.string().startsWith("pro_"),
    SUBY_YEARLY_PRODUCT_ID: z.string().startsWith("pro_"),
    NEXT_PUBLIC_APP_URL: z.string().url(),
  })
  .refine(
    (value) => value.SUBY_MONTHLY_PRODUCT_ID !== value.SUBY_YEARLY_PRODUCT_ID,
    { message: "Suby monthly and yearly products must differ" },
  );

export type SubyConfig = z.infer<typeof enabledSchema>;

export function parseSubyConfig(
  input: Record<string, string | undefined>,
): { enabled: false } | ({ enabled: true } & SubyConfig) {
  if (input.SUBY_ENABLED !== "true") return { enabled: false };
  const parsed = enabledSchema.parse(input);
  const baseUrl = new URL(parsed.SUBY_BASE_URL);
  if (
    baseUrl.protocol !== "https:" ||
    baseUrl.hostname !== "api.beta.suby.fi" ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.port ||
    baseUrl.pathname !== "/" ||
    baseUrl.search ||
    baseUrl.hash
  )
    throw new Error("SUBY_BASE_URL must be an HTTPS origin");
  let checkoutHost: URL;
  try {
    checkoutHost = new URL(`https://${parsed.SUBY_CHECKOUT_HOST}`);
  } catch {
    throw new Error("SUBY_CHECKOUT_HOST must be a hostname");
  }
  if (
    checkoutHost.hostname !== parsed.SUBY_CHECKOUT_HOST.toLowerCase() ||
    checkoutHost.port ||
    checkoutHost.pathname !== "/" ||
    checkoutHost.search ||
    checkoutHost.hash
  )
    throw new Error("SUBY_CHECKOUT_HOST must be a hostname");
  return { enabled: true, ...parsed };
}
