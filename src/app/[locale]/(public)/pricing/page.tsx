import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { auth, type SupportedLocale } from "@/modules/identity";
import { normalizeCountryCode } from "@/modules/billing/domain/billing";
import { getPaddleConfig } from "@/modules/billing/infrastructure/paddle-config";
import { createPaddleCheckoutCustomData } from "@/modules/billing/infrastructure/paddle-checkout-signature";
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
  const config = getPaddleConfig();
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
      month: config.PADDLE_MONTHLY_PRICE_ID,
      year: config.PADDLE_YEARLY_PRICE_ID,
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
        clientToken={config.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN}
        paddleEnvironment={config.PADDLE_ENV}
        appUrl={config.NEXT_PUBLIC_APP_URL}
        user={
          session
            ? { id: session.user.id, email: session.user.email }
            : undefined
        }
        checkoutCustomData={
          session
            ? createPaddleCheckoutCustomData(
                session.user.id,
                config.PADDLE_CHECKOUT_SIGNING_SECRET,
              )
            : undefined
        }
      />
    </main>
  );
}
