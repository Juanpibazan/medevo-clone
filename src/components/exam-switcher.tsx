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
      className="inline-flex items-center rounded-xl border-2 border-slate-200/90 bg-slate-100 p-1 text-xs shadow-xs sm:text-sm"
    >
      <button
        type="button"
        disabled={pending}
        onClick={() => handleSwitch("revalida")}
        aria-pressed={currentExam === "revalida"}
        className={`cursor-pointer rounded-lg px-3.5 py-1.5 font-bold tracking-wide transition-all sm:px-4 sm:py-2 ${
          currentExam === "revalida"
            ? "scale-[1.02] bg-[#102A43] text-white shadow-md ring-1 ring-[#102A43]/20"
            : "font-semibold text-slate-600 hover:bg-white/70 hover:text-[#102A43]"
        } ${pending ? "cursor-wait opacity-60" : ""} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#102A43] focus-visible:ring-offset-1`}
      >
        Revalida
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => handleSwitch("enamed")}
        aria-pressed={currentExam === "enamed"}
        className={`cursor-pointer rounded-lg px-3.5 py-1.5 font-bold tracking-wide transition-all sm:px-4 sm:py-2 ${
          currentExam === "enamed"
            ? "scale-[1.02] bg-[#13A89E] text-white shadow-md ring-1 ring-[#13A89E]/20"
            : "font-semibold text-slate-600 hover:bg-white/70 hover:text-[#13A89E]"
        } ${pending ? "cursor-wait opacity-60" : ""} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#13A89E] focus-visible:ring-offset-1`}
      >
        ENAMED
      </button>
    </div>
  );
}
