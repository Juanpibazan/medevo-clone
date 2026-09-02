import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth, profileService, type SupportedLocale } from "@/modules/identity";
import { contentService } from "@/modules/content";
import { StudentHeader } from "@/components/student-header";
import { Link } from "@/i18n/navigation";
import {
  SubmitForReviewButton,
  CreateDraftButton,
  AnnulButton,
} from "./backoffice-client-helpers";
import { getEffectiveRoles } from "./backoffice-actions";

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

  // Helper to build taxonomy breadcrumb path
  const getTaxonomyPath = (nodeId: string): string => {
    const path: string[] = [];
    let currentId: string | null = nodeId;
    const maxDepth = 10;
    let depth = 0;

    while (currentId && depth < maxDepth) {
      const node = taxonomyNodes.find((n) => n.id === currentId);
      if (!node) break;
      path.unshift(node.name);
      currentId = node.parentId;
      depth++;
    }

    return path.join(" > ");
  };

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

        {questionsList.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-slate-400 shadow-sm">
            <p className="text-base italic">{t("noQuestions")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {questionsList.map(({ question, versions }) => {
              const activeVersion = versions.find(
                (v) => v.id === question.publishedVersionId,
              );
              // Latest version (highest versionNumber)
              const latestVersion = versions[0];

              return (
                <div
                  key={question.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-4">
                      {latestVersion?.images &&
                        latestVersion.images.length > 0 && (
                          <div className="relative flex h-16 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={latestVersion.images[0].url}
                              alt="Miniatura da questão"
                              className="max-h-full max-w-full object-contain"
                            />
                            {latestVersion.images.length > 1 && (
                              <span className="py-0.2 absolute right-0.5 bottom-0.5 rounded bg-slate-900/60 px-1 text-[8px] font-bold text-white">
                                +{latestVersion.images.length - 1}
                              </span>
                            )}
                          </div>
                        )}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-600">
                            ID: {question.id}
                          </span>
                          {latestVersion && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-slate-600 uppercase">
                              {latestVersion.type === "open_ended"
                                ? "Discursiva"
                                : "Múltipla Escolha"}
                            </span>
                          )}
                          {latestVersion?.type === "open_ended" &&
                            latestVersion.subquestions &&
                            latestVersion.subquestions.length > 0 && (
                              <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-teal-700 uppercase">
                                {latestVersion.subquestions.length}{" "}
                                {latestVersion.subquestions.length === 1
                                  ? "subpergunta"
                                  : "subperguntas"}
                              </span>
                            )}
                          {activeVersion && (
                            <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              Publicada: v{activeVersion.versionNumber}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-[#102A43]">
                          {latestVersion?.title || "Sem título"}
                        </h3>
                        {latestVersion && (
                          <p className="text-xs text-slate-400">
                            Taxonomia:{" "}
                            {getTaxonomyPath(latestVersion.taxonomyNodeId)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isEditor &&
                        activeVersion &&
                        !versions.some(
                          (v) =>
                            v.status === "draft" || v.status === "in_review",
                        ) && (
                          <CreateDraftButton
                            locale={locale}
                            questionId={question.id}
                          />
                        )}
                      {isReviewer &&
                        activeVersion &&
                        activeVersion.status !== "annulled" && (
                          <AnnulButton
                            locale={locale}
                            questionId={question.id}
                          />
                        )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="mb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
                      Histórico de Versões
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead>
                          <tr className="text-left text-xs font-bold text-slate-400 uppercase">
                            <th className="py-2 pr-4">Versão</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2">Data Criada</th>
                            <th className="py-2 pl-4 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {versions.map((v) => {
                            let badgeClass =
                              "bg-slate-100 text-slate-600 border-slate-200";
                            if (v.status === "published") {
                              badgeClass =
                                "bg-emerald-50 text-emerald-700 border-emerald-200";
                            } else if (v.status === "in_review") {
                              badgeClass =
                                "bg-amber-50 text-amber-700 border-amber-200";
                            } else if (v.status === "annulled") {
                              badgeClass =
                                "bg-rose-50 text-rose-700 border-rose-200";
                            }

                            return (
                              <tr key={v.id} className="hover:bg-slate-50/50">
                                <td className="py-3 pr-4 font-semibold text-slate-700">
                                  v{v.versionNumber}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}
                                  >
                                    {v.status === "draft" && "Rascunho"}
                                    {v.status === "in_review" && "Em Revisão"}
                                    {v.status === "published" && "Publicada"}
                                    {v.status === "annulled" && "Anulada"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {new Date(v.createdAt).toLocaleDateString(
                                    locale === "pt-BR" ? "pt-BR" : "es-ES",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </td>
                                <td className="space-x-2 py-3 pl-4 text-right">
                                  {v.status === "draft" && isEditor && (
                                    <>
                                      <Link
                                        href={`/app/backoffice/editar?versionId=${v.id}`}
                                        className="inline-flex rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                      >
                                        Editar Rascunho
                                      </Link>
                                      <SubmitForReviewButton
                                        locale={locale}
                                        versionId={v.id}
                                      />
                                    </>
                                  )}
                                  {v.status === "in_review" && isReviewer && (
                                    <Link
                                      href={`/app/backoffice/revisar/${v.id}`}
                                      className="inline-flex rounded bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-500"
                                    >
                                      Revisar
                                    </Link>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
