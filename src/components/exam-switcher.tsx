"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchExamAction } from "@/app/[locale]/(student)/app/exam-actions";

interface ExamSwitcherProps {
  currentExam: "revalida" | "enamed";
}

export function ExamSwitcher({ currentExam }: ExamSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSwitch = (nextExam: "revalida" | "enamed") => {
    if (nextExam === currentExam || pending) return;

    startTransition(async () => {
      await switchExamAction(nextExam);
      router.refresh();
    });
  };

  return (
    <div
      role="group"
      aria-label="Seleção de Exame"
      className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs shadow-inner"
    >
      <button
        type="button"
        disabled={pending}
        onClick={() => handleSwitch("revalida")}
        aria-pressed={currentExam === "revalida"}
        className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
          currentExam === "revalida"
            ? "bg-white text-[#102A43] shadow-sm"
            : "text-slate-500 hover:text-slate-900"
        } ${pending ? "opacity-70" : ""}`}
      >
        Revalida
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => handleSwitch("enamed")}
        aria-pressed={currentExam === "enamed"}
        className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
          currentExam === "enamed"
            ? "bg-[#13A89E] text-white shadow-sm"
            : "text-slate-500 hover:text-slate-900"
        } ${pending ? "opacity-70" : ""}`}
      >
        ENAMED
      </button>
    </div>
  );
}
