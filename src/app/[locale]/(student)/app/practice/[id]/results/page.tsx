import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth, profileService, type SupportedLocale } from "@/modules/identity";
import { practiceService, type Response } from "@/modules/practice";
import { StudentHeader } from "@/components/student-header";

export default async function SessionResultsPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      `/${locale}/entrar?callbackUrl=${encodeURIComponent(`/${locale}/app/practice/${id}/results`)}`,
    );
  }

  // Ensure profile exists
  await profileService.getProfile(session.user.id);

  const data = await practiceService.getSession(id, session.user.id);
  if (!data) {
    redirect(`/${locale}/app`);
  }

  // Force finish session if not completed (safeguard)
  let metrics;
  if (data.session.status !== "completed") {
    const res = await practiceService.finishSession(id, session.user.id);
    metrics = res.metrics;
  } else {
    const verifiedResponses = data.items
      .map((i) => i.response)
      .filter((r): r is Response => r !== null && r.verifiedAt !== null);
    const correctCount = verifiedResponses.filter(
      (r) => r.isCorrect === true,
    ).length;
    const totalCount = verifiedResponses.length;
    const precision = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
    const totalTimeSeconds = verifiedResponses.reduce(
      (acc, curr) => acc + curr.timeTakenSeconds,
      0,
    );

    metrics = {
      correctCount,
      totalCount,
      precision,
      totalTimeSeconds,
    };
  }

  const t = await getTranslations("practice");

  const formatMinutes = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <main className="shell min-h-screen bg-slate-50/50">
      <StudentHeader />
      <section className="auth-wrap flex items-center justify-center p-4 py-12">
        <div className="card app-panel animate-fadeIn w-full max-w-md space-y-8 text-center">
          <div className="space-y-2">
            <span className="text-4xl">🎉</span>
            <h1 className="text-3xl font-extrabold text-[#102A43]">
              {t("resultsTitle")}
            </h1>
          </div>

          {/* Circle score chart */}
          <div className="relative mx-auto flex h-36 w-36 items-center justify-center rounded-full border border-teal-100 bg-teal-50 shadow-inner">
            <div className="space-y-0.5 text-center">
              <span className="text-3xl font-black text-[#13A89E]">
                {Math.round(metrics.precision)}%
              </span>
              <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
                {t("precision")}
              </p>
            </div>
          </div>

          {/* Details list */}
          <div className="grid grid-cols-2 gap-4 divide-x divide-slate-100 rounded-xl border border-slate-100/50 bg-slate-50/50 p-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Acertos
              </span>
              <p className="text-lg font-bold text-slate-800">
                {metrics.correctCount} / {metrics.totalCount}
              </p>
            </div>
            <div className="space-y-1 pl-4">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                {t("timeTaken")}
              </span>
              <p className="text-lg font-bold text-slate-800">
                {formatMinutes(metrics.totalTimeSeconds)}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <a
              href={`/${locale}/app`}
              className="block w-full cursor-pointer rounded-xl bg-[#13A89E] py-3 text-center text-sm font-medium text-white transition-colors hover:bg-[#0f8e85]"
            >
              {t("backToDashboard")}
            </a>
            <a
              href={`/${locale}/app/errors`}
              className="block w-full cursor-pointer rounded-xl bg-[#102A43] py-3 text-center text-sm font-medium text-white transition-colors hover:bg-[#1a3f60]"
            >
              {t("viewErrorNotebook")}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
