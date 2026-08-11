"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createQuestionAction } from "./actions";

interface BackofficeFormProps {
  locale: string;
  taxonomyNodes: Array<{ id: string; name: string; level: string }>;
  t: Record<string, string>;
}

export function BackofficeForm({
  locale,
  taxonomyNodes,
  t,
}: BackofficeFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [explanation, setExplanation] = useState("");
  const [taxonomyNodeId, setTaxonomyNodeId] = useState(
    taxonomyNodes[0]?.id || "",
  );
  const [correctLetter, setCorrectLetter] = useState<
    "A" | "B" | "C" | "D" | "E"
  >("A");

  const [altA, setAltA] = useState("");
  const [altB, setAltB] = useState("");
  const [altC, setAltC] = useState("");
  const [altD, setAltD] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !title ||
      !statement ||
      !explanation ||
      !altA ||
      !altB ||
      !altC ||
      !altD
    ) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    setError(null);

    const alternatives = [
      {
        optionLetter: "A" as const,
        text: altA,
        isCorrect: correctLetter === "A",
      },
      {
        optionLetter: "B" as const,
        text: altB,
        isCorrect: correctLetter === "B",
      },
      {
        optionLetter: "C" as const,
        text: altC,
        isCorrect: correctLetter === "C",
      },
      {
        optionLetter: "D" as const,
        text: altD,
        isCorrect: correctLetter === "D",
      },
    ];

    try {
      await createQuestionAction(locale, {
        title,
        statement,
        explanation,
        taxonomyNodeId,
        alternatives,
      });

      // Clear form
      setTitle("");
      setStatement("");
      setExplanation("");
      setAltA("");
      setAltB("");
      setAltC("");
      setAltD("");
      setCorrectLetter("A");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar questão";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm"
    >
      <h3 className="text-lg font-bold text-[#102A43]">{t.createTitle}</h3>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label className="block text-xs font-semibold tracking-wider text-slate-500 uppercase">
          {t.qTitle}
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-slate-200 p-2.5 text-sm transition-all focus:ring-2 focus:ring-[#13A89E] focus:outline-none"
          placeholder="Ej: Reanimação Neonatal Básica"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-semibold tracking-wider text-slate-500 uppercase">
          {t.statement}
        </label>
        <textarea
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-slate-200 p-2.5 text-sm transition-all focus:ring-2 focus:ring-[#13A89E] focus:outline-none"
          placeholder="Escreva o enunciado completo da questão..."
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-semibold tracking-wider text-slate-500 uppercase">
          {t.explanation}
        </label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-200 p-2.5 text-sm transition-all focus:ring-2 focus:ring-[#13A89E] focus:outline-none"
          placeholder="Explique detalhadamente por que a alternativa correta é a verdadeira..."
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-semibold tracking-wider text-slate-500 uppercase">
          {t.taxonomy}
        </label>
        <select
          value={taxonomyNodeId}
          onChange={(e) => setTaxonomyNodeId(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm transition-all focus:ring-2 focus:ring-[#13A89E] focus:outline-none"
        >
          {taxonomyNodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.name} ({node.level})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        <label className="block text-xs font-semibold tracking-wider text-slate-500 uppercase">
          {t.alternatives}
        </label>

        {/* Alt A */}
        <div className="flex items-center gap-3">
          <input
            type="radio"
            name="correctAlternative"
            checked={correctLetter === "A"}
            onChange={() => setCorrectLetter("A")}
            className="h-4 w-4 text-[#13A89E] focus:ring-[#13A89E]"
          />
          <input
            type="text"
            value={altA}
            onChange={(e) => setAltA(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 p-2.5 text-sm transition-all focus:ring-2 focus:ring-[#13A89E] focus:outline-none"
            placeholder={t.altText.replace("{letter}", "A")}
          />
        </div>

        {/* Alt B */}
        <div className="flex items-center gap-3">
          <input
            type="radio"
            name="correctAlternative"
            checked={correctLetter === "B"}
            onChange={() => setCorrectLetter("B")}
            className="h-4 w-4 text-[#13A89E] focus:ring-[#13A89E]"
          />
          <input
            type="text"
            value={altB}
            onChange={(e) => setAltB(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 p-2.5 text-sm transition-all focus:ring-2 focus:ring-[#13A89E] focus:outline-none"
            placeholder={t.altText.replace("{letter}", "B")}
          />
        </div>

        {/* Alt C */}
        <div className="flex items-center gap-3">
          <input
            type="radio"
            name="correctAlternative"
            checked={correctLetter === "C"}
            onChange={() => setCorrectLetter("C")}
            className="h-4 w-4 text-[#13A89E] focus:ring-[#13A89E]"
          />
          <input
            type="text"
            value={altC}
            onChange={(e) => setAltC(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 p-2.5 text-sm transition-all focus:ring-2 focus:ring-[#13A89E] focus:outline-none"
            placeholder={t.altText.replace("{letter}", "C")}
          />
        </div>

        {/* Alt D */}
        <div className="flex items-center gap-3">
          <input
            type="radio"
            name="correctAlternative"
            checked={correctLetter === "D"}
            onChange={() => setCorrectLetter("D")}
            className="h-4 w-4 text-[#13A89E] focus:ring-[#13A89E]"
          />
          <input
            type="text"
            value={altD}
            onChange={(e) => setAltD(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 p-2.5 text-sm transition-all focus:ring-2 focus:ring-[#13A89E] focus:outline-none"
            placeholder={t.altText.replace("{letter}", "D")}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="block w-full cursor-pointer rounded-lg bg-[#13A89E] py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-[#0f8e85] disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? "Salvando..." : t.save}
      </button>
    </form>
  );
}
