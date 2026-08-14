import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth, type SupportedLocale } from "@/modules/identity";
import { billingService } from "@/modules/billing";
import { StudentHeader } from "@/components/student-header";
import { upgradeToPremiumAction } from "./billing-actions";

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: SupportedLocale }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const { locale } = await params;
  const { success } = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      `/${locale}/entrar?callbackUrl=${encodeURIComponent(`/${locale}/app/billing`)}`,
    );
  }

  const quota = await billingService.checkDailyQuota(session.user.id);
  const activeSub = await billingService.getActiveSubscription(session.user.id);

  const t = await getTranslations("billing");

  const progressPercentage = Math.min(
    100,
    Math.round(((quota.answeredToday ?? 0) / (quota.limit || 10)) * 100),
  );

  const isSuccess = success === "true";

  return (
    <main className="shell">
      <StudentHeader />
      <section className="auth-wrap mx-auto mt-6 flex max-w-xl flex-col gap-6">
        <div className="card app-panel">
          <p className="eyebrow">{t("title")}</p>
          <h1 className="mt-1 text-2xl font-bold text-[#102A43]">
            {t("upgradeTitle")}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{t("upgradeDesc")}</p>
        </div>

        {isSuccess && (
          <div className="animate-fade-in rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 shadow-sm">
            <p className="text-sm font-semibold">{t("formSuccess")}</p>
          </div>
        )}

        <div className="card app-panel flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-semibold tracking-wider text-slate-500 uppercase">
                {t("currentPlan")}
              </h2>
              <p className="mt-0.5 text-lg font-bold text-[#102A43]">
                {quota.tier === "premium" ? t("premiumPlan") : t("freePlan")}
              </p>
            </div>
            {quota.tier === "premium" && activeSub && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                {t("statusActive")}
              </span>
            )}
            {quota.tier === "free" && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {t("freePlan")}
              </span>
            )}
          </div>

          {quota.tier === "free" ? (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-medium text-slate-700">
                  {t("dailyUsage")}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t("usageLimitText", {
                    answered: quota.answeredToday,
                    limit: quota.limit,
                  })}
                </p>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      quota.isBlocked ? "bg-amber-500" : "bg-[#13A89E]"
                    }`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Checkout Form Simulator */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="mb-4 text-base font-bold text-[#102A43]">
                  {t("formTitle")}
                </h3>
                <form
                  action={async () => {
                    "use server";
                    await upgradeToPremiumAction(locale);
                  }}
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="cardholder"
                      className="text-xs font-semibold text-slate-600"
                    >
                      {t("formCardholder")}
                    </label>
                    <input
                      type="text"
                      id="cardholder"
                      name="cardholder"
                      required
                      placeholder="Jane Doe"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-[#13A89E] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="cardNumber"
                      className="text-xs font-semibold text-slate-600"
                    >
                      {t("formCardNumber")}
                    </label>
                    <input
                      type="text"
                      id="cardNumber"
                      name="cardNumber"
                      required
                      pattern="\d{16}"
                      maxLength={16}
                      placeholder="1234567812345678"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-[#13A89E] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="expiry"
                        className="text-xs font-semibold text-slate-600"
                      >
                        {t("formExpiry")}
                      </label>
                      <input
                        type="text"
                        id="expiry"
                        name="expiry"
                        required
                        pattern="(0[1-9]|1[0-2])\/[0-9]{2}"
                        maxLength={5}
                        placeholder="12/28"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-[#13A89E] focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="cvv"
                        className="text-xs font-semibold text-slate-600"
                      >
                        {t("formCvv")}
                      </label>
                      <input
                        type="text"
                        id="cvv"
                        name="cvv"
                        required
                        pattern="\d{3,4}"
                        maxLength={4}
                        placeholder="123"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-[#13A89E] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="mt-2 block w-full cursor-pointer rounded-xl bg-[#13A89E] py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0f8e85]"
                  >
                    {t("formSubmit")}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {activeSub && (
                <p className="text-sm text-slate-600">
                  {t("expiresAt", {
                    date: new Intl.DateTimeFormat(locale, {
                      dateStyle: "long",
                      timeZone: "America/Sao_Paulo",
                    }).format(activeSub.currentPeriodEnd),
                  })}
                </p>
              )}
              <a
                href={`/${locale}/app`}
                className="block w-full cursor-pointer rounded-xl bg-[#102A43] py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#1a3f60]"
              >
                {t("goBack")}
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
