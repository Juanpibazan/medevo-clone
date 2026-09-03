import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { auth, type SupportedLocale } from "@/modules/identity";
import { normalizeCountryCode } from "@/modules/billing/domain/billing";
import { getPaddleConfig } from "@/modules/billing/infrastructure/paddle-config";
import { blocksNewCheckout } from "@/modules/billing/domain/billing";
import { DrizzleBillingRepository } from "@/modules/billing/infrastructure/drizzle-billing-repository";
import { getSubyConfig } from "@/modules/billing/infrastructure/suby-config";
import { SubyClient } from "@/modules/billing/infrastructure/suby-client";
import { SiteHeader } from "@/components/site-header";
import { PricingClient, type Tier } from "./pricing-client";

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params;
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  let config: ReturnType<typeof getPaddleConfig> | undefined;
  try {
    config = getPaddleConfig();
  } catch {
    config = undefined;
  }
  let subyConfig: ReturnType<typeof getSubyConfig> = { enabled: false };
  try {
    subyConfig = getSubyConfig();
  } catch {
    subyConfig = { enabled: false };
  }
  const subscriptions = session
    ? await new DrizzleBillingRepository().getUserSubscriptions(session.user.id)
    : [];
  const checkoutBlocked = subscriptions.some((item) =>
    blocksNewCheckout(item.status),
  );
  let subyPrices: { month: string; year: string } | undefined;
  if (subyConfig.enabled) {
    try {
      const client = new SubyClient(subyConfig);
      const [month, year] = await Promise.all([
        client.getProduct(subyConfig.SUBY_MONTHLY_PRODUCT_ID),
        client.getProduct(subyConfig.SUBY_YEARLY_PRODUCT_ID),
      ]);
      const format = (price: typeof month) =>
        new Intl.NumberFormat(locale, {
          style: "currency",
          currency: price.currency.toUpperCase(),
        }).format(price.priceCents / 100);
      subyPrices = { month: format(month), year: format(year) };
    } catch {
      subyPrices = undefined;
    }
  }
  const t = await getTranslations("pricing");
  const tier: Tier = {
    name: "Premium",
    description: t("description"),
    features: [
      t("features.unlimited"),
      t("features.explanations"),
      t("features.errors"),
    ],
    priceId: {
      month: config?.PADDLE_MONTHLY_PRICE_ID ?? "unavailable_month",
      year: config?.PADDLE_YEARLY_PRICE_ID ?? "unavailable_year",
    },
  };
  return (
    <main className="shell">
      <SiteHeader isAuthenticated={Boolean(session)} />
      <PricingClient
        tier={tier}
        locale={locale}
        countryCode={normalizeCountryCode(
          requestHeaders.get("x-vercel-ip-country"),
        )}
        clientToken={config?.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN}
        paddleEnvironment="sandbox"
        paddleAvailable={Boolean(config)}
        isAuthenticated={Boolean(session)}
        checkoutBlocked={checkoutBlocked}
        suby={
          subyConfig.enabled
            ? { available: Boolean(subyPrices), prices: subyPrices }
            : undefined
        }
      />
    </main>
  );
}
