import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  auth,
  ensureStudentProvisioning,
  pendingOnboardingStep,
  profileService,
  type SupportedLocale,
} from "@/modules/identity";
import { StudentHeader } from "@/components/student-header";
import { learningService } from "@/modules/learning";
import { practiceService } from "@/modules/practice";
import { startReviewSessionAction } from "./practice-actions";
import { billingService } from "@/modules/billing";
import { contentService } from "@/modules/content";
import { PracticeFilters } from "@/components/practice-filters";
import { analyticsService } from "@/modules/analytics";
import { getEffectiveRoles } from "./backoffice/backoffice-actions";

export default async function AppPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    redirect(
      `/${locale}/entrar?callbackUrl=${encodeURIComponent(`/${locale}/app`)}`,
    );

  await ensureStudentProvisioning(session.user.id, locale);
  const profile = await profileService.getProfile(session.user.id);
  if (!profile) throw new Error("Student profile provisioning failed");

  if (profile.onboardingStatus !== "completed") {
    const onboardingLocale =
      profile.onboardingCompletedStep === 0 ? locale : profile.locale;
    redirect(
      `/${onboardingLocale}/onboarding?step=${pendingOnboardingStep(profile)}`,
    );
  }

  if (profile.locale !== locale) redirect(`/${profile.locale}/app`);

  const t = await getTranslations("app");
  const tDashboard = await getTranslations("dashboard");
  const tBilling = await getTranslations("billing");

  const quota = await billingService.checkDailyQuota(session.user.id);

  const dueQuestions = await learningService.getDueQuestions(
    session.user.id,
    100,
  );
  const dueCount = dueQuestions.length;

  // Recuperar métricas de analítica agregadas en tiempo real para el estudiante
  const metrics = await analyticsService.getUserMetrics(session.user.id);
  const dailyQuestionsGoal = Math.max(
    5,
    Math.round((profile.weeklyStudyMinutes || 300) / 10),
  );

  const roles = await getEffectiveRoles(session.user.id);
  const isEditorOrAdmin =
    roles.includes("medical_editor") || roles.includes("admin");

  const activeSession = await practiceService.getActiveSession(session.user.id);
  const taxonomyNodes = await contentService.listTaxonomyNodes();

  const date = profile.tentativeExamDate
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(new Date(`${profile.tentativeExamDate}T12:00:00Z`))
    : t("dateUnknown");

  const hours = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format((profile.weeklyStudyMinutes ?? 0) / 60);

  return (
    <main className="shell">
      <StudentHeader />
      <section className="auth-wrap flex flex-col gap-6">
        {/* Profile Card */}
        <div className="card app-panel">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("title", { name: session.user.name })}</h1>
          <p className="card-intro">{t("intro")}</p>
          <dl className="profile-summary">
            <div>
              <dt>{t("exam")}</dt>
              <dd>{t("revalida")}</dd>
            </div>
            <div>
              <dt>{t("date")}</dt>
              <dd>{date}</dd>
            </div>
            <div>
              <dt>{t("weeklyTime")}</dt>
              <dd>{t("hours", { hours })}</dd>
            </div>
            <div>
              <dt>{t("language")}</dt>
              <dd>{t(`locales.${profile.locale}`)}</dd>
            </div>
            <div>
              <dt>{tBilling("currentPlan")}</dt>
              <dd>
                <a
                  href={`/${locale}/app/billing`}
                  className="font-semibold text-[#13A89E] hover:underline"
                >
                  {quota.tier === "premium"
                    ? tBilling("premiumPlan")
                    : tBilling("freePlan")}
                </a>
              </dd>
            </div>
            {quota.tier === "free" && (
              <div>
                <dt>{tBilling("dailyUsage")}</dt>
                <dd className="font-semibold text-slate-700">
                  {quota.answeredToday} / {quota.limit}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Practice and Spaced Repetition Panel */}
        <div className="card app-panel">
          {quota.isBlocked && (
            <div className="mb-6 flex flex-col justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 shadow-sm md:flex-row md:items-center">
              <div>
                <h3 className="text-base font-bold text-[#102A43]">
                  {tBilling("quotaBannerTitle")}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {tBilling("quotaBannerDesc")}
                </p>
              </div>
              <a
                href={`/${locale}/app/billing`}
                className="inline-block rounded-lg bg-[#13A89E] px-4 py-2 text-center text-sm font-semibold whitespace-nowrap text-white shadow-sm transition-colors hover:bg-[#0f8e85]"
              >
                {tBilling("quotaBannerBtn")}
              </a>
            </div>
          )}

          {/* Sección de Mi Progreso */}
          <div className="mb-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-bold text-[#102A43]">
              {tDashboard("myProgress")}
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {/* Tarjeta Meta Diaria */}
              <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div>
                  <span className="mb-1 block text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    {tDashboard("dailyGoal")}
                  </span>
                  <span className="text-lg font-extrabold text-[#102A43]">
                    {tDashboard("answeredToday", {
                      count: metrics.answeredToday,
                      goal: dailyQuestionsGoal,
                    })}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#13A89E] to-teal-400 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.round((metrics.answeredToday / dailyQuestionsGoal) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Tarjeta Precisión */}
              <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div>
                  <span className="mb-1 block text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    {tDashboard("precisionGlobal")}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-[#13A89E]">
                      {metrics.precisionGlobal}%
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-xs font-medium text-slate-400">
                  {tDashboard("answeredToday", {
                    count: metrics.answeredToday,
                    goal: dailyQuestionsGoal,
                  })
                    .split(" ")
                    .slice(1)
                    .join(" ")}
                </div>
              </div>

              {/* Tarjeta Tiempo Promedio */}
              <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div>
                  <span className="mb-1 block text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    {tDashboard("averageTime")}
                  </span>
                  <span className="text-3xl font-black text-[#102A43]">
                    {metrics.averageTimeSeconds > 0
                      ? tDashboard("timeSeconds", {
                          seconds: metrics.averageTimeSeconds,
                        })
                      : tDashboard("noTimeData")}
                  </span>
                </div>
                <div className="mt-3 text-xs font-medium text-slate-400">
                  {tDashboard("averageTime")}
                </div>
              </div>
            </div>

            {/* Rendimiento por Especialidad */}
            {metrics.precisionBySpecialty.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                <h3 className="mb-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
                  {tDashboard("performanceBySpecialty")}
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {metrics.precisionBySpecialty.map((spec) => (
                    <div
                      key={spec.specialtyId}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3"
                    >
                      <div className="min-w-0 pr-2">
                        <p
                          className="truncate text-xs font-bold text-[#102A43]"
                          title={spec.specialtyName}
                        >
                          {spec.specialtyName}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {tDashboard("answeredToday", {
                            count: spec.correctCount,
                            goal: spec.totalCount,
                          })}
                        </p>
                      </div>
                      <span
                        className={`rounded-md px-2.5 py-1 text-sm font-extrabold ${
                          spec.precision >= 70
                            ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                            : spec.precision >= 50
                              ? "border border-amber-100 bg-amber-50 text-amber-700"
                              : "border border-red-100 bg-red-50 text-red-700"
                        }`}
                      >
                        {spec.precision}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <h2 className="mb-4 text-xl font-bold text-[#102A43]">
            Ciclo de Práctica y Revisión
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Practice Card */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm transition-all hover:scale-[1.01] hover:shadow-md">
              <div>
                <h3 className="mb-2 text-lg font-semibold text-[#102A43]">
                  {tDashboard("startPractice")}
                </h3>
                <p className="mb-4 text-sm text-slate-500">
                  Resuelve 10 preguntas aleatorias de Revalida para mantener tu
                  ritmo diario.
                </p>
              </div>
              <PracticeFilters
                taxonomyNodes={taxonomyNodes}
                quota={quota}
                activeSession={activeSession}
              />
            </div>

            {/* Review Card */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm transition-all hover:scale-[1.01] hover:shadow-md">
              <div>
                <h3 className="mb-2 text-lg font-semibold text-[#102A43]">
                  {tDashboard("startReview")}
                </h3>
                <p className="mb-4 text-sm text-slate-500">
                  {dueCount > 0
                    ? tDashboard("reviewsDue", { count: dueCount })
                    : tDashboard("noReviewsDue")}
                </p>
              </div>
              <form
                action={async () => {
                  "use server";
                  await startReviewSessionAction(locale);
                }}
              >
                <button
                  type="submit"
                  disabled={dueCount === 0 || quota.isBlocked}
                  className={`block w-full cursor-pointer rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-colors ${
                    dueCount > 0 && !quota.isBlocked
                      ? "bg-[#102A43] text-white hover:bg-[#1a3f60]"
                      : "cursor-not-allowed bg-slate-200 text-slate-400"
                  }`}
                >
                  {tDashboard("startReview")}
                </button>
              </form>
            </div>
          </div>

          {/* Quick Access links */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6 text-sm">
            <div className="flex gap-4">
              <a
                href={`/${locale}/app/errors`}
                className="rounded-lg border border-[#13A89E] bg-slate-50 px-3 py-1.5 font-medium text-[#13A89E] transition-colors hover:bg-[#13A89E] hover:text-white"
              >
                {tDashboard("viewErrors")}
              </a>
              <a
                href={`/${locale}/app/errors?tab=favorites`}
                className="rounded-lg border border-[#13A89E] bg-slate-50 px-3 py-1.5 font-medium text-[#13A89E] transition-colors hover:bg-[#13A89E] hover:text-white"
              >
                {tDashboard("viewFavorites")}
              </a>
              <a
                href={`/${locale}/app/billing`}
                className="rounded-lg border border-[#13A89E] bg-slate-50 px-3 py-1.5 font-medium text-[#13A89E] transition-colors hover:bg-[#13A89E] hover:text-white"
              >
                {tBilling("title")}
              </a>
            </div>
            {isEditorOrAdmin && (
              <a
                href={`/${locale}/app/backoffice`}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-all hover:bg-amber-100"
              >
                {tDashboard("adminBackoffice")}
              </a>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
