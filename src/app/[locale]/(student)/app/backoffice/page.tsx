import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth, profileService, type SupportedLocale } from "@/modules/identity";
import { contentService } from "@/modules/content";
import { StudentHeader } from "@/components/student-header";
import { BackofficeForm } from "./backoffice-form";

export default async function BackofficePage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      `/${locale}/entrar?callbackUrl=${encodeURIComponent(`/${locale}/app/backoffice`)}`,
    );
  }

  // Ensure student profile is setup
  await profileService.getProfile(session.user.id);
  const roles = await profileService.getUserRoles(session.user.id);
  const isEditorOrAdmin =
    roles.includes("medical_editor") || roles.includes("admin");

  if (!isEditorOrAdmin) {
    redirect(`/${locale}/app`);
  }

  const t = await getTranslations("backoffice");

  // Simple record mapping for client translation usage
  const tForm = {
    createTitle: t("createTitle"),
    qTitle: t("qTitle"),
    statement: t("statement"),
    explanation: t("explanation"),
    taxonomy: t("taxonomy"),
    alternatives: t("alternatives"),
    altText: t("altText"),
    isCorrect: t("isCorrect"),
    save: t("save"),
  };

  const taxonomyNodes = await contentService.listTaxonomyNodes();
  const registeredQuestions = await contentService.listQuestions();

  return (
    <main className="shell">
      <StudentHeader />
      <section className="auth-wrap mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold text-[#102A43]">
            {t("title")}
          </h1>
          <p className="text-sm text-slate-500">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* List of Registered Questions */}
          <div className="space-y-4 lg:col-span-2">
            <h3 className="text-lg font-bold text-[#102A43]">
              {t("listTitle")}
            </h3>
            {registeredQuestions.length === 0 ? (
              <p className="rounded-xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-400 italic">
                {t("noQuestions")}
              </p>
            ) : (
              <div className="space-y-3">
                {registeredQuestions.map(({ question, activeVersion }) => (
                  <div
                    key={question.id}
                    className="space-y-2 rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                        ID: {question.id}
                      </span>
                      {activeVersion && (
                        <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          {t("status")}: {t(activeVersion.status)}
                        </span>
                      )}
                    </div>
                    {activeVersion ? (
                      <>
                        <h4 className="text-base font-bold text-slate-800">
                          {activeVersion.title}
                        </h4>
                        <p className="line-clamp-2 text-sm text-slate-600">
                          {activeVersion.statement}
                        </p>
                        <div className="flex gap-4 pt-2 text-xs text-slate-400">
                          <span>
                            {t("version")}: {activeVersion.versionNumber}
                          </span>
                          <span>Taxon ID: {activeVersion.taxonomyNodeId}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-slate-400 italic">
                        Sem versão ativa publicada.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form to Create Questions */}
          <div className="lg:col-span-1">
            <BackofficeForm
              locale={locale}
              taxonomyNodes={taxonomyNodes}
              t={tForm}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
