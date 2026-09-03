import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth, profileService, type SupportedLocale } from "@/modules/identity";
import { contentService } from "@/modules/content";
import { StudentHeader } from "@/components/student-header";
import { Link } from "@/i18n/navigation";
import { getEffectiveRoles } from "./backoffice-actions";
import { BackofficeQuestionList } from "./backoffice-question-list";

export default async function BackofficePage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      `/${locale}/entrar?callbackUrl=${encodeURIComponent(`/${locale}/app/backoffice`)}`,
    );
  }

  // Ensure student profile is setup
  await profileService.getProfile(session.user.id);
  const roles = await getEffectiveRoles(session.user.id);
  const isEditor = roles.includes("medical_editor") || roles.includes("admin");
  const isReviewer =
    roles.includes("medical_reviewer") || roles.includes("admin");

  if (!isEditor && !isReviewer) {
    redirect(`/${locale}/app`);
  }

  const t = await getTranslations("backoffice");

  const taxonomyNodes = await contentService.listTaxonomyNodes();
  const questionsList = await contentService.listAllQuestionsWithVersions();

  return (
    <main className="shell min-h-screen bg-slate-50 pb-12">
      <StudentHeader />
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#102A43]">
              {t("title")}
            </h1>
            <p className="text-sm text-slate-500">{t("subtitle")}</p>
          </div>
          {isEditor && (
            <Link
              href="/app/backoffice/editar"
              className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-500"
            >
              + {t("createTitle")}
            </Link>
          )}
        </div>

        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
            </div>
          }
        >
          <BackofficeQuestionList
            initialQuestions={questionsList}
            taxonomyNodes={taxonomyNodes}
            locale={locale}
            isEditor={isEditor}
            isReviewer={isReviewer}
          />
        </Suspense>
      </section>
    </main>
  );
}
