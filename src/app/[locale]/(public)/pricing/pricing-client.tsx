"use client";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
export interface Tier {
  name: "Premium";
  description: string;
  features: string[];
  priceId: { month: string; year: string };
}
type Cycle = "month" | "year";
let paddlePromise: Promise<Paddle | undefined> | undefined;

async function getPaddle(clientToken: string, environment: "sandbox") {
  const pending =
    paddlePromise ??
    (paddlePromise = initializePaddle({
      environment,
      token: clientToken,
    }));
  try {
    return await pending;
  } catch (error) {
    if (paddlePromise === pending) paddlePromise = undefined;
    throw error;
  }
}

export function mapPreviewTotals(paddle: Paddle | undefined, tier: Tier) {
  return async (countryCode?: string) => {
    if (!paddle) throw new Error("Paddle unavailable");
    const preview = await paddle.PricePreview({
      items: [
        { priceId: tier.priceId.month, quantity: 1 },
        { priceId: tier.priceId.year, quantity: 1 },
      ],
      ...(countryCode ? { address: { countryCode } } : {}),
    });
    const totals = Object.fromEntries(
      preview.data.details.lineItems.map((item) => [
        item.price.id,
        item.formattedTotals.total,
      ]),
    );
    if (!totals[tier.priceId.month] || !totals[tier.priceId.year]) {
      throw new Error("Paddle did not return every requested price");
    }
    return totals;
  };
}
export function PricingClient({
  tier,
  locale,
  countryCode,
  clientToken,
  paddleEnvironment,
  appUrl,
  user,
  checkoutCustomData,
}: {
  tier: Tier;
  locale: "pt-BR" | "es";
  countryCode?: string;
  clientToken: string;
  paddleEnvironment: "sandbox";
  appUrl: string;
  user?: { id: string; email: string };
  checkoutCustomData?: {
    app_user_id: string;
    app_user_signature: string;
  };
}) {
  const t = useTranslations("pricing");
  const router = useRouter();
  const [cycle, setCycle] = useState<Cycle>("year");
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [paddle, setPaddle] = useState<Paddle>();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const load = async () => {
    setState("loading");
    try {
      const instance = await getPaddle(clientToken, paddleEnvironment);
      setPaddle(instance);
      setPrices(await mapPreviewTotals(instance, tier)(countryCode));
      setState("ready");
    } catch {
      setState("error");
    }
  };
  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        const instance = await getPaddle(clientToken, paddleEnvironment);
        const totals = await mapPreviewTotals(instance, tier)(countryCode);
        if (!cancelled) {
          setPaddle(instance);
          setPrices(totals);
          setState("ready");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    }
    void initialize();
    return () => {
      cancelled = true;
    };
  }, [clientToken, countryCode, paddleEnvironment, tier]);
  const priceId = tier.priceId[cycle];
  const subscribe = () => {
    if (!user || !checkoutCustomData) {
      router.push(
        `/${locale}/entrar?callbackUrl=${encodeURIComponent(`/${locale}/pricing`)}`,
      );
      return;
    }
    paddle?.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: {
        email: user.email,
        ...(countryCode ? { address: { countryCode } } : {}),
      },
      customData: checkoutCustomData,
      settings: {
        displayMode: "overlay",
        variant: "one-page",
        successUrl: `${appUrl}/welcome`,
        locale: locale === "pt-BR" ? "pt" : "es",
      },
    });
  };
  return (
    <section className="pricing-wrap" aria-labelledby="pricing-title">
      <div className="pricing-copy">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 id="pricing-title">{t("title")}</h1>
        <p>{t("intro")}</p>
      </div>
      <div
        className="billing-toggle"
        role="radiogroup"
        aria-label={t("cycleLabel")}
      >
        {(["month", "year"] as const).map((value) => (
          <label key={value}>
            <input
              type="radio"
              name="billing-cycle"
              value={value}
              checked={cycle === value}
              onChange={() => setCycle(value)}
            />
            <span>{t(value)}</span>
          </label>
        ))}
      </div>
      <article className="pricing-card">
        <div className="study-sheet" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <p className="plan-label">{tier.name}</p>
        <h2 aria-live="polite">
          {state === "ready"
            ? prices[priceId]
            : state === "error"
              ? "—"
              : t("loading")}
        </h2>
        <p className="period">
          {t(cycle === "month" ? "perMonth" : "perYear")}
        </p>
        <p className="plan-description">{tier.description}</p>
        <ul>
          {tier.features.map((feature) => (
            <li key={feature}>
              <span aria-hidden="true">✓</span>
              {feature}
            </li>
          ))}
        </ul>
        {state === "error" && (
          <p role="alert" className="pricing-error">
            {t("priceError")}{" "}
            <button type="button" onClick={() => void load()}>
              {t("retry")}
            </button>
          </p>
        )}
        <button
          className="button subscribe-button"
          type="button"
          disabled={state !== "ready" || !paddle}
          onClick={subscribe}
        >
          {user ? t("subscribe") : t("signInToSubscribe")}
        </button>
        <p className="checkout-note">{t("checkoutNote")}</p>
      </article>
    </section>
  );
}
