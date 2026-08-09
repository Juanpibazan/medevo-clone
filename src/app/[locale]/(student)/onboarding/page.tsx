import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  auth,
  ensureStudentProvisioning,
  maxExamDateInSaoPaulo,
  pendingOnboardingStep,
  profileService,
  resolveOnboardingStepQuery,
  todayInSaoPaulo,
  type SupportedLocale,
} from "@/modules/identity";
import { StudentHeader } from "@/components/student-header";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: SupportedLocale }>;
  searchParams: Promise<{ step?: string | string[] }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    redirect(
      `/${locale}/entrar?callbackUrl=${encodeURIComponent(`/${locale}/onboarding${typeof query.step === "string" ? `?step=${query.step}` : ""}`)}`,
    );
  await ensureStudentProvisioning(session.user.id, locale);
  const profile = await profileService.getProfile(session.user.id);
  if (!profile) throw new Error("Student profile provisioning failed");
  if (profile.onboardingStatus === "completed")
    redirect(`/${profile.locale}/app`);
  const canonicalLocale =
    profile.onboardingCompletedStep > 0 ? profile.locale : locale;
  const pendingStep = pendingOnboardingStep(profile);
  const resolved = resolveOnboardingStepQuery(query.step, pendingStep);
  if (canonicalLocale !== locale || !resolved.canonical)
    redirect(`/${canonicalLocale}/onboarding?step=${pendingStep}`);
  return (
    <main className="shell">
      <StudentHeader showLocale={false} />
      <section className="onboarding-wrap">
        <OnboardingForm
          locale={canonicalLocale}
          profile={profile}
          step={resolved.step}
          minExamDate={todayInSaoPaulo()}
          maxExamDate={maxExamDateInSaoPaulo()}
        />
      </section>
    </main>
  );
}
