import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth, type SupportedLocale } from "@/modules/identity";
import { StudentHeader } from "@/components/student-header";
import { DrizzleBillingRepository } from "@/modules/billing/infrastructure/drizzle-billing-repository";
import {
  blocksNewCheckout,
  grantsPremium,
  type Subscription,
} from "@/modules/billing/domain/billing";
import { CancelSubscription } from "./cancel-subscription";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    redirect(
      `/${locale}/entrar?callbackUrl=${encodeURIComponent(`/${locale}/app/billing`)}`,
    );
  const repository = new DrizzleBillingRepository();
  const [subscriptions, pendingCheckout] = await Promise.all([
    repository.getUserSubscriptions(session.user.id),
    repository.getPendingCheckoutAttempt(session.user.id),
  ]);
  const active = subscriptions.filter((item) =>
    grantsPremium(item.status, item.accessEndsAt),
  );
  const nonTerminal = subscriptions.filter((item) =>
    blocksNewCheckout(item.status),
  );
  const current = active[0] ?? nonTerminal[0];
  const multiple = nonTerminal.length > 1;
  const t = await getTranslations("billing");
  const date = (value: Date) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(value);
  const completeProviderIdentity = (subscription: Subscription) =>
    Boolean(
      subscription.providerSubscriptionId &&
      subscription.providerCustomerId &&
      subscription.providerProductId,
    );
  const subscriptionDetails = (subscription: Subscription) => (
    <dl className="profile-summary" key={subscription.id}>
      <div>
        <dt>{t("provider")}</dt>
        <dd>{t(`providers.${subscription.provider}`)}</dd>
      </div>
      <div>
        <dt>{t("status")}</dt>
        <dd>{t(`statuses.${subscription.status}`)}</dd>
      </div>
      <div>
        <dt>{t("accessUntil")}</dt>
        <dd>{date(subscription.accessEndsAt)}</dd>
      </div>
      {subscription.cancelAtPeriodEnd && subscription.cancelsAt && (
        <div>
          <dt>{t("cancellation")}</dt>
          <dd>{t("cancelsAt", { date: date(subscription.cancelsAt) })}</dd>
        </div>
      )}
    </dl>
  );
  return (
    <main className="shell">
      <StudentHeader />
      <section className="auth-wrap">
        <article className="card app-panel">
          <p className="eyebrow">{t("currentPlan")}</p>
          <h1>{t("title")}</h1>
          {!current && pendingCheckout ? (
            <>
              <p role="status">{t("pendingCheckout")}</p>
              <dl className="profile-summary">
                <div>
                  <dt>{t("provider")}</dt>
                  <dd>{t(`providers.${pendingCheckout.provider}`)}</dd>
                </div>
                <div>
                  <dt>{t("billingCycle")}</dt>
                  <dd>{t(`cycles.${pendingCheckout.billingCycle}`)}</dd>
                </div>
                <div>
                  <dt>{t("attemptExpires")}</dt>
                  <dd>{date(pendingCheckout.expiresAt)}</dd>
                </div>
              </dl>
            </>
          ) : !current ? (
            <>
              <p>{t("freePlan")}</p>
              <a className="button" href={`/${locale}/pricing`}>
                {t("upgradeNow")}
              </a>
            </>
          ) : (
            <>
              {multiple && <p role="alert">{t("multipleSubscriptions")}</p>}
              {(multiple ? nonTerminal : [current]).map(subscriptionDetails)}
              {!grantsPremium(current.status, current.accessEndsAt) && (
                <p role="alert">{t("attentionRequired")}</p>
              )}
              {!completeProviderIdentity(current) && (
                <p role="alert">{t("legacySubscription")}</p>
              )}
              {!multiple &&
                completeProviderIdentity(current) &&
                !current.cancelAtPeriodEnd && (
                  <CancelSubscription endsAt={date(current.accessEndsAt)} />
                )}
            </>
          )}
        </article>
      </section>
    </main>
  );
}
