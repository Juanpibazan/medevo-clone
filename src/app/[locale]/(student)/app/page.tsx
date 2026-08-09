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
      <section className="auth-wrap">
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
          </dl>
        </div>
      </section>
    </main>
  );
}
