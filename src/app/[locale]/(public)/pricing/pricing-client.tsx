"use client";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { BillingProvider } from "@/modules/billing/domain/billing";
import { startCheckoutAction } from "./actions";

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
    (paddlePromise = initializePaddle({ environment, token: clientToken }));
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
    if (!totals[tier.priceId.month] || !totals[tier.priceId.year])
      throw new Error("Paddle did not return every requested price");
    return totals;
  };
}

export function PricingClient({
  tier,
  locale,
  countryCode,
  clientToken,
  paddleEnvironment,
  isAuthenticated,
  paddleAvailable = true,
  checkoutBlocked = false,
  suby,
}: {
  tier: Tier;
  locale: "pt-BR" | "es";
  countryCode?: string;
  clientToken?: string;
  paddleEnvironment: "sandbox";
  isAuthenticated?: boolean;
  paddleAvailable?: boolean;
  checkoutBlocked?: boolean;
  suby?: {
    available: boolean;
    prices?: { month: string; year: string };
  };
}) {
  const t = useTranslations("pricing");
  const router = useRouter();
  const [cycle, setCycle] = useState<Cycle>("year");
  const [provider, setProvider] = useState<BillingProvider>(() =>
    paddleAvailable ? "paddle" : suby?.available ? "suby" : "paddle",
  );
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [paddle, setPaddle] = useState<Paddle>();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(false);
  const authenticated = Boolean(isAuthenticated);

  const load = async () => {
    setState("loading");
    try {
      if (!clientToken) throw new Error("Paddle unavailable");
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
    void (async () => {
      try {
        if (!clientToken) throw new Error("Paddle unavailable");
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
    })();
    return () => {
      cancelled = true;
    };
  }, [clientToken, countryCode, paddleEnvironment, tier]);

  const priceId = tier.priceId[cycle];
  const subscribe = async () => {
    if (!authenticated) {
      router.push(
        `/${locale}/entrar?callbackUrl=${encodeURIComponent(`/${locale}/pricing`)}`,
      );
      return;
    }
    setSubmitting(true);
    setCheckoutError(false);
    try {
      const result = await startCheckoutAction({ provider, cycle, locale });
      if (result.kind === "hosted_redirect") {
        window.location.assign(result.url);
        return;
      }
      const instance = await getPaddle(result.clientToken, result.environment);
      instance?.Checkout.open({
        items: [{ priceId: result.priceId, quantity: 1 }],
        customer: { email: result.customerEmail },
        customData: result.customData,
        settings: {
          displayMode: "overlay",
          variant: "one-page",
          successUrl: result.successUrl,
          locale: locale === "pt-BR" ? "pt" : "es",
        },
      });
    } catch {
      setCheckoutError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="pricing-wrap" aria-labelledby="pricing-title">
      <div className="pricing-copy">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 id="pricing-title">{t("title")}</h1>
        <p>{t("intro")}</p>
      </div>
      <fieldset
        className="billing-toggle"
        disabled={submitting || checkoutBlocked}
      >
        <legend className="sr-only">{t("cycleLabel")}</legend>
        {(["month", "year"] as const).map((value) => (
          <label key={value}>
            <input
              type="radio"
              name="billing-cycle"
              value={value}
              checked={cycle === value}
              onChange={() => {
                setCycle(value);
                setCheckoutError(false);
              }}
            />
            <span>{t(value)}</span>
          </label>
        ))}
      </fieldset>
      <fieldset
        className="billing-toggle provider-toggle"
        disabled={submitting || checkoutBlocked}
      >
        <legend className="sr-only">{t("providerLabel")}</legend>
        <label>
          <input
            type="radio"
            name="billing-provider"
            value="paddle"
            checked={provider === "paddle"}
            onChange={() => {
              setProvider("paddle");
              setCheckoutError(false);
            }}
          />
          <span>{t("providers.paddle")}</span>
        </label>
        {suby && (
          <label>
            <input
              type="radio"
              name="billing-provider"
              value="suby"
              checked={provider === "suby"}
              onChange={() => {
                setProvider("suby");
                setCheckoutError(false);
              }}
            />
            <span>{t("providers.suby")}</span>
          </label>
        )}
      </fieldset>
      <article className="pricing-card">
        <p className="plan-label">{tier.name}</p>
        <h2 aria-live="polite">
          {provider === "suby"
            ? suby?.available
              ? suby.prices?.[cycle]
              : "—"
            : state === "ready"
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
        {provider === "paddle" && state === "error" && (
          <p role="alert" className="pricing-error">
            {t("priceError")}{" "}
            <button type="button" onClick={() => void load()}>
              {t("retry")}
            </button>
          </p>
        )}
        {provider === "suby" && !suby?.available && (
          <p role="alert" className="pricing-error">
            {t("providerUnavailable")}
          </p>
        )}
        {provider === "suby" && suby?.available && (
          <p className="checkout-note">{t("subyTaxNote")}</p>
        )}
        {checkoutError && (
          <p role="alert" className="pricing-error">
            {t("checkoutError")}
          </p>
        )}
        {checkoutBlocked && (
          <p className="pricing-error">
            {t("checkoutBlocked")}{" "}
            <a href={`/${locale}/app/billing`}>{t("manageSubscription")}</a>
          </p>
        )}
        <button
          className="button subscribe-button"
          type="button"
          disabled={
            submitting ||
            checkoutBlocked ||
            (provider === "paddle" &&
              (!paddleAvailable || state !== "ready" || !paddle)) ||
            (provider === "suby" && !suby?.available)
          }
          onClick={() => void subscribe()}
        >
          {checkoutBlocked
            ? t("alreadySubscribed")
            : submitting
              ? t("startingCheckout")
              : authenticated
                ? t("subscribe")
                : t("signInToSubscribe")}
        </button>
        <p className="checkout-note">
          {provider === "paddle" ? t("checkoutNote") : t("subyCheckoutNote")}
        </p>
        <p className="checkout-note">{t("renewalNote")}</p>
      </article>
    </section>
  );
}
