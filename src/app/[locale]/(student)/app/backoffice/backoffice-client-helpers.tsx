"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  submitForReviewAction,
  createDraftFromPublishedAction,
  annulQuestionAction,
} from "./backoffice-actions";

export function SubmitForReviewButton({
  locale,
  versionId,
}: {
  locale: string;
  versionId: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    if (!confirm("Confirmar envio para revisão?")) return;
    startTransition(async () => {
      try {
        const res = await submitForReviewAction(locale, versionId);
        if (res.success) {
          router.refresh();
        }
      } catch {
        alert("Erro ao enviar para revisão.");
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="cursor-pointer rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
    >
      {pending ? "Enviando..." : "Enviar para Revisão"}
    </button>
  );
}

export function CreateDraftButton({
  locale,
  questionId,
}: {
  locale: string;
  questionId: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    startTransition(async () => {
      try {
        const res = await createDraftFromPublishedAction(locale, questionId);
        if (res.success && res.versionId) {
          router.push(
            `/${locale}/app/backoffice/editar?versionId=${res.versionId}`,
          );
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao criar rascunho.";
        alert(message);
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="cursor-pointer rounded bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 disabled:opacity-50"
    >
      {pending ? "Criando Rascunho..." : "Editar (Novo Rascunho)"}
    </button>
  );
}

export function AnnulButton({
  locale,
  questionId,
}: {
  locale: string;
  questionId: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    if (
      !confirm("ATENÇÃO: Deseja anular esta questão? Esta ação é irreversível.")
    )
      return;
    startTransition(async () => {
      try {
        const res = await annulQuestionAction(locale, questionId);
        if (res.success) {
          router.refresh();
        }
      } catch {
        alert("Erro ao anular questão.");
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="cursor-pointer rounded bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 disabled:opacity-50"
    >
      {pending ? "Anulando..." : "Anular Questão"}
    </button>
  );
}
