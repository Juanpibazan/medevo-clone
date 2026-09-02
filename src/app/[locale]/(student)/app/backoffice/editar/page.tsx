import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, profileService, type SupportedLocale } from "@/modules/identity";
import { contentService } from "@/modules/content";
import { StudentHeader } from "@/components/student-header";
import { EditFormClient } from "./edit-form-client";
import { getEffectiveRoles } from "../backoffice-actions";

export default async function EditarQuestaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: SupportedLocale }>;
  searchParams: Promise<{ versionId?: string }>;
}) {
  const { locale } = await params;
  const { versionId } = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      `/${locale}/entrar?callbackUrl=${encodeURIComponent(`/${locale}/app/backoffice/editar`)}`,
    );
  }

  // Authorize user (must be editor or admin)
  await profileService.getProfile(session.user.id);
  const roles = await getEffectiveRoles(session.user.id);
  const isEditor = roles.includes("medical_editor") || roles.includes("admin");

  if (!isEditor) {
    redirect(`/${locale}/app`);
  }

  const taxonomyNodes = await contentService.listTaxonomyNodes();

  let initialData = null;
  if (versionId) {
    const versionData = await contentService.getQuestionVersion(versionId);
    if (!versionData) {
      redirect(`/${locale}/app/backoffice`);
    }

    if (versionData.version.status !== "draft") {
      // Direct edits are only allowed on drafts
      redirect(`/${locale}/app/backoffice`);
    }

    initialData = {
      title: versionData.version.title,
      statement: versionData.version.statement,
      explanation: versionData.version.explanation,
      taxonomyNodeId: versionData.version.taxonomyNodeId,
      type: versionData.version.type,
      alternatives: versionData.alternatives.map((alt) => ({
        optionLetter: alt.optionLetter,
        text: alt.text,
        isCorrect: alt.isCorrect,
      })),
      images: versionData.images.map((img) => ({
        url: img.url,
        position: img.position,
      })),
      subquestions: versionData.version.subquestions || undefined,
    };
  }

  return (
    <main className="shell min-h-screen bg-slate-50 pb-12">
      <StudentHeader />
      <section className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#102A43]">
            {versionId ? "Editar Rascunho" : "Criar Nova Questão"}
          </h1>
          <p className="text-sm text-slate-500">
            {versionId
              ? "Modifique os campos e as alternativas do seu rascunho de questão."
              : "Preencha as informações para registrar uma nova questão no banco do MedCiclo."}
          </p>
        </div>

        <EditFormClient
          locale={locale}
          taxonomyNodes={taxonomyNodes}
          versionId={versionId || null}
          initialData={initialData}
        />
      </section>
    </main>
  );
}
