import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth, profileService, type SupportedLocale } from "@/modules/identity";
import { practiceService } from "@/modules/practice";
import { StudentHeader } from "@/components/student-header";
import { PracticeSessionClient } from "./practice-session-client";

export default async function PracticeSessionPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      `/${locale}/entrar?callbackUrl=${encodeURIComponent(`/${locale}/app/practice/${id}`)}`,
    );
  }

  // Ensure profile exists
  await profileService.getProfile(session.user.id);

  const data = await practiceService.getSession(id, session.user.id);
  if (!data) {
    redirect(`/${locale}/app`);
  }

  if (data.session.status === "completed") {
    redirect(`/${locale}/app/practice/${id}/results`);
  }

  const t = await getTranslations("practice");

  const tClient = {
    question: t("question"),
    of: t("of"),
    time: t("time"),
    verify: t("verify"),
    next: t("next"),
    finish: t("finish"),
    correct: t("correct"),
    incorrect: t("incorrect"),
    explanation: t("explanation"),
    metacognitiveTitle: t("metacognitiveTitle"),
    domine: t("domine"),
    duda: t("duda"),
    vacile: t("vacile"),
    no_sabia: t("no_sabia"),
    favorite: t("favorite"),
  };

  const serializableItems = data.items.map((item) => ({
    id: item.id,
    sessionId: item.sessionId,
    questionVersionId: item.questionVersionId,
    position: item.position,
    createdAt: item.createdAt,
    title: item.title,
    statement: item.statement,
    type: item.type,
    explanation: item.explanation,
    alternatives: item.alternatives,
    images: item.images,
    response: item.response
      ? {
          id: item.response.id,
          selectedAlternativeId: item.response.selectedAlternativeId,
          responseText: item.response.responseText,
          isCorrect: item.response.isCorrect,
          timeTakenSeconds: item.response.timeTakenSeconds,
          metacognitiveMark: item.response.metacognitiveMark,
          isFavorite: item.response.isFavorite,
          verifiedAt: item.response.verifiedAt,
        }
      : null,
  }));

  return (
    <main className="shell min-h-screen bg-slate-50/50">
      <StudentHeader />
      <PracticeSessionClient
        locale={locale}
        sessionId={id}
        initialItems={serializableItems}
        t={tClient}
      />
    </main>
  );
}
