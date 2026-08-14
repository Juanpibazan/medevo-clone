"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewQuestionAction } from "../../backoffice-actions";

export function ReviewForm({
  locale,
  versionId,
}: {
  locale: string;
  versionId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");

  const handleDecision = (decision: "approved" | "changes_requested") => {
    setError("");

    if (decision === "changes_requested" && !comments.trim()) {
      setError(
        "Por favor, descreva as alterações necessárias nos comentários.",
      );
      return;
    }

    startTransition(async () => {
      try {
        const res = await reviewQuestionAction(
          locale,
          versionId,
          decision,
          comments,
        );
        if (res.success) {
          router.push(`/${locale}/app/backoffice`);
          router.refresh();
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao registrar a revisão.";
        setError(message);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-[#102A43]">Parecer do Revisor</h3>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="comments"
          className="text-xs font-bold tracking-wider text-slate-500 uppercase"
        >
          Comentários / Observações
        </label>
        <textarea
          id="comments"
          rows={3}
          disabled={pending}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Forneça feedback detalhado sobre a questão (obrigatório se solicitar alterações)..."
          className="resize-y rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
        />
      </div>

      <div className="mt-2 flex justify-end gap-4">
        <button
          type="button"
          disabled={pending}
          onClick={() => handleDecision("changes_requested")}
          className="cursor-pointer rounded-xl border border-rose-300 bg-white px-5 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
        >
          {pending ? "Processando..." : "Solicitar Alterações"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => handleDecision("approved")}
          className="cursor-pointer rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
        >
          {pending ? "Processando..." : "Aprovar e Publicar"}
        </button>
      </div>
    </div>
  );
}
