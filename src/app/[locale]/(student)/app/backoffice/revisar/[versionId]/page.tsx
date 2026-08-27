import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, profileService, type SupportedLocale } from "@/modules/identity";
import { contentService } from "@/modules/content";
import { StudentHeader } from "@/components/student-header";
import { Link } from "@/i18n/navigation";
import { ReviewForm } from "./review-form";

export default async function RevisarQuestaoPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale; versionId: string }>;
}) {
  const { locale, versionId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      `/${locale}/entrar?callbackUrl=${encodeURIComponent(`/${locale}/app/backoffice/revisar/${versionId}`)}`,
    );
  }

  // Authorize user (must be reviewer or admin)
  await profileService.getProfile(session.user.id);
  const roles = await profileService.getUserRoles(session.user.id);
  const isReviewer =
    roles.includes("medical_reviewer") || roles.includes("admin");

  if (!isReviewer) {
    redirect(`/${locale}/app`);
  }

  const versionData = await contentService.getQuestionVersion(versionId);
  if (!versionData) {
    redirect(`/${locale}/app/backoffice`);
  }

  // Only allow reviewing version in review
  if (versionData.version.status !== "in_review") {
    redirect(`/${locale}/app/backoffice`);
  }

  const taxonomyNodes = await contentService.listTaxonomyNodes();

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
      <section className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#102A43]">
              Revisar Questão
            </h1>
            <p className="text-sm text-slate-500">
              Analise os detalhes clínicos da questão antes de aprovar ou
              solicitar alterações.
            </p>
          </div>
          <Link
            href="/app/backoffice"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Voltar ao Painel
          </Link>
        </div>

        {/* Question Details Preview */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              Versão em revisão: v{versionData.version.versionNumber}
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#102A43]">
              {versionData.version.title}
            </h2>
            <p className="text-xs text-slate-400">
              Taxonomia: {getTaxonomyPath(versionData.version.taxonomyNodeId)}
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
              Caso Clínico / Enunciado
            </h3>
            <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">
              {versionData.version.statement}
            </p>
          </div>

          {/* Question Images */}
          {versionData.images && versionData.images.length > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <h3 className="mb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
                Imagens Relacionadas
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {versionData.images.map((img) => (
                  <div
                    key={img.id}
                    className="flex items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt="Imagem da questão"
                      className="max-h-64 rounded-lg object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {versionData.version.type === "multiple_choice" ? (
            <div className="border-t border-slate-100 pt-4">
              <h3 className="mb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
                Alternativas Cadastradas
              </h3>
              <div className="space-y-3">
                {versionData.alternatives.map((alt) => (
                  <div
                    key={alt.id}
                    className={`flex gap-4 rounded-xl border p-4 ${
                      alt.isCorrect
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="font-bold">{alt.optionLetter}.</span>
                    <span className="text-sm">{alt.text}</span>
                    {alt.isCorrect && (
                      <span className="ml-auto rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                        Correta
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border-t border-slate-100 pt-4">
              <h3 className="mb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
                Subperguntas Cadastradas
              </h3>
              {versionData.version.subquestions && versionData.version.subquestions.length > 0 ? (
                <div className="space-y-4">
                  {versionData.version.subquestions.map((sub, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-sm font-bold text-teal-700">
                          {sub.letter}
                        </span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Subpergunta
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-400 uppercase">Enunciado:</span>
                        <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">
                          {sub.statement}
                        </p>
                      </div>
                      
                      <div className="space-y-1 border-t border-slate-200/60 pt-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Gabarito Oficial:</span>
                        <p className="text-sm leading-relaxed whitespace-pre-line text-slate-600">
                          {sub.explanation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic text-slate-400">
                  Esta questão discursiva não possui subperguntas adicionadas.
                </p>
              )}
            </div>
          )}

          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
              Explicação Canônica
            </h3>
            <p className="text-sm leading-relaxed whitespace-pre-line text-slate-600">
              {versionData.version.explanation}
            </p>
          </div>
        </div>

        {/* Review Form */}
        <ReviewForm locale={locale} versionId={versionId} />
      </section>
    </main>
  );
}
