import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth, profileService, type SupportedLocale } from "@/modules/identity";
import type { Question, QuestionVersion, Alternative } from "@/modules/content";
import { learningService } from "@/modules/learning";
import { StudentHeader } from "@/components/student-header";
import { startSingleQuestionSessionAction } from "../practice-actions";

export default async function ErrorsNotebookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: SupportedLocale }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  const { tab } = await searchParams;
  const activeTab = tab === "favorites" ? "favorites" : "errors";

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      `/${locale}/entrar?callbackUrl=${encodeURIComponent(`/${locale}/app/errors`)}`,
    );
  }

  // Ensure student profile is setup
  await profileService.getProfile(session.user.id);

  const t = await getTranslations("errors");

  // Fetch list depending on active tab
  let questions: Array<{
    question: Question;
    activeVersion: QuestionVersion;
    alternatives: Alternative[];
  }> = [];
  if (activeTab === "errors") {
    questions = await learningService.getErrorNotebook(session.user.id);
  } else {
    questions = await learningService.getFavorites(session.user.id);
  }

  return (
    <main className="shell min-h-screen bg-slate-50/50">
      <StudentHeader />
      <section className="auth-wrap mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
        {/* Page Title */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold text-[#102A43]">
            {t("title")}
          </h1>
          <p className="text-sm text-slate-500">{t("subtitle")}</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200">
          <a
            href={`/${locale}/app/errors`}
            className={`border-b-2 px-6 py-3 text-sm font-semibold transition-all ${
              activeTab === "errors"
                ? "border-[#13A89E] text-[#102A43]"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t("title")}
          </a>
          <a
            href={`/${locale}/app/errors?tab=favorites`}
            className={`border-b-2 px-6 py-3 text-sm font-semibold transition-all ${
              activeTab === "favorites"
                ? "border-[#13A89E] text-[#102A43]"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t("favoritesTitle")}
          </a>
        </div>

        {/* Question List */}
        {questions.length === 0 ? (
          <div className="space-y-4 rounded-xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <span className="text-5xl">✨</span>
            <p className="font-medium text-slate-500">
              {activeTab === "errors" ? t("emptyErrors") : t("emptyFavorites")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map(({ question, activeVersion }) => (
              <div
                key={question.id}
                className="flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md md:flex-row md:items-center"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                      ID: {question.id}
                    </span>
                    <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-500">
                      Taxon ID: {activeVersion.taxonomyNodeId}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {activeVersion.title}
                  </h3>
                  <p className="line-clamp-2 text-sm text-slate-600">
                    {activeVersion.statement}
                  </p>
                </div>

                <form
                  action={async () => {
                    "use server";
                    await startSingleQuestionSessionAction(
                      locale,
                      activeVersion.id,
                    );
                  }}
                  className="w-full md:w-auto"
                >
                  <button
                    type="submit"
                    className="block w-full cursor-pointer rounded-lg bg-[#13A89E] px-6 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-[#0f8e85] md:w-auto"
                  >
                    {t("resolveButton")}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
