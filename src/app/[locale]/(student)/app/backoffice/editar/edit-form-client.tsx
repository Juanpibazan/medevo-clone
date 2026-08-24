"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveDraftAction,
  getUploadPresignedUrlAction,
} from "../backoffice-actions";
import type {
  TaxonomyNode,
  AlternativeLetter,
  QuestionType,
} from "@/modules/content";

interface AlternativeInput {
  optionLetter: AlternativeLetter;
  text: string;
  isCorrect: boolean;
}

interface ImageInput {
  url: string;
  position: number;
}

interface EditFormClientProps {
  locale: string;
  taxonomyNodes: TaxonomyNode[];
  versionId: string | null;
  initialData: {
    title: string;
    statement: string;
    explanation: string;
    taxonomyNodeId: string;
    type?: QuestionType;
    alternatives: AlternativeInput[];
    images?: ImageInput[];
  } | null;
}

export function EditFormClient({
  locale,
  taxonomyNodes,
  versionId,
  initialData,
}: EditFormClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  // Form states
  const [title, setTitle] = useState(initialData?.title || "");
  const [statement, setStatement] = useState(initialData?.statement || "");
  const [explanation, setExplanation] = useState(
    initialData?.explanation || "",
  );
  const [type, setType] = useState<QuestionType>(
    initialData?.type || "multiple_choice",
  );
  const [images, setImages] = useState<ImageInput[]>(initialData?.images || []);

  // Taxonomy states (hierarchy: specialty -> theme -> focus -> subfocus)
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("");
  const [selectedFocus, setSelectedFocus] = useState("");
  const [selectedSubfocus, setSelectedSubfocus] = useState("");

  // Alternatives state (fixed A-E)
  const [alternatives, setAlternatives] = useState<AlternativeInput[]>(
    initialData?.alternatives || [
      { optionLetter: "A", text: "", isCorrect: false },
      { optionLetter: "B", text: "", isCorrect: false },
      { optionLetter: "C", text: "", isCorrect: false },
      { optionLetter: "D", text: "", isCorrect: false },
      { optionLetter: "E", text: "", isCorrect: false },
    ],
  );

  // Initialize taxonomy dropdowns if editing existing question
  useEffect(() => {
    if (initialData?.taxonomyNodeId) {
      const targetNodeId = initialData.taxonomyNodeId;
      const path: TaxonomyNode[] = [];
      let currentId: string | null = targetNodeId;

      while (currentId) {
        const node = taxonomyNodes.find((n) => n.id === currentId);
        if (!node) break;
        path.unshift(node);
        currentId = node.parentId;
      }

      // Map path nodes back to dropdown selections
      path.forEach((node) => {
        if (node.level === "specialty") setSelectedSpecialty(node.id);
        else if (node.level === "theme") setSelectedTheme(node.id);
        else if (node.level === "focus") setSelectedFocus(node.id);
        else if (node.level === "subfocus") setSelectedSubfocus(node.id);
      });
    }
  }, [initialData, taxonomyNodes]);

  // Filter lists based on selected parent
  const specialties = taxonomyNodes.filter((n) => n.level === "specialty");
  const themes = selectedSpecialty
    ? taxonomyNodes.filter(
        (n) => n.level === "theme" && n.parentId === selectedSpecialty,
      )
    : [];
  const focuses = selectedTheme
    ? taxonomyNodes.filter(
        (n) => n.level === "focus" && n.parentId === selectedTheme,
      )
    : [];
  const subfocuses = selectedFocus
    ? taxonomyNodes.filter(
        (n) => n.level === "subfocus" && n.parentId === selectedFocus,
      )
    : [];

  const handleAltTextChange = (index: number, text: string) => {
    const updated = [...alternatives];
    updated[index].text = text;
    setAlternatives(updated);
  };

  const handleCorrectToggle = (index: number) => {
    const updated = alternatives.map((alt, i) => ({
      ...alt,
      isCorrect: i === index,
    }));
    setAlternatives(updated);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const { uploadUrl, fileUrl, isLocalSimulation } =
        await getUploadPresignedUrlAction(file.name, file.type);

      if (isLocalSimulation) {
        const res = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
        });
        if (!res.ok) throw new Error("Erro na simulação do upload local.");
      } else {
        const res = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });
        if (!res.ok) throw new Error("Erro ao enviar imagem para o S3.");
      }

      setImages((prev) => [...prev, { url: fileUrl, position: prev.length }]);
    } catch (err) {
      console.error(err);
      setError("Falha ao carregar imagem. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((img, idx) => ({ ...img, position: idx })),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate taxonomy selection: must select at least a specialty
    if (!selectedSpecialty) {
      setError("Por favor, selecione pelo menos uma especialidade.");
      return;
    }

    // Determine the most specific node selected
    const finalTaxonomyNodeId =
      selectedSubfocus || selectedFocus || selectedTheme || selectedSpecialty;

    // Validate alternatives only if multiple choice
    const finalAlternatives =
      type === "open_ended"
        ? []
        : alternatives.filter((a) => a.text.trim() !== "");
    if (type === "multiple_choice") {
      if (finalAlternatives.length < 2) {
        setError("Por favor, insira pelo menos 2 alternativas preenchidas.");
        return;
      }

      const correctAlt = finalAlternatives.find((a) => a.isCorrect);
      if (!correctAlt) {
        setError("Por favor, selecione uma alternativa correta.");
        return;
      }
    }

    startTransition(async () => {
      try {
        const res = await saveDraftAction(locale, versionId, {
          title,
          statement,
          explanation,
          taxonomyNodeId: finalTaxonomyNodeId,
          type,
          alternatives: finalAlternatives,
          images,
        });

        if (res.success) {
          router.push(`/${locale}/app/backoffice`);
          router.refresh();
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao salvar rascunho.";
        setError(message);
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-4xl flex-col gap-6 pb-12"
    >
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#102A43]">
          Detalhes do Enunciado
        </h2>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="type"
            className="text-xs font-bold tracking-wider text-slate-500 uppercase"
          >
            Tipo de Questão
          </label>
          <div className="mt-1 flex gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#102A43]">
              <input
                type="radio"
                name="question-type"
                value="multiple_choice"
                checked={type === "multiple_choice"}
                onChange={() => setType("multiple_choice")}
                disabled={pending}
                className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Múltipla Escolha
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#102A43]">
              <input
                type="radio"
                name="question-type"
                value="open_ended"
                checked={type === "open_ended"}
                onChange={() => setType("open_ended")}
                disabled={pending}
                className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Discursiva (Aberta)
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="title"
            className="text-xs font-bold tracking-wider text-slate-500 uppercase"
          >
            Título
          </label>
          <input
            id="title"
            type="text"
            required
            disabled={pending}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Reanimação Neonatal em Sala de Parto"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="statement"
            className="text-xs font-bold tracking-wider text-slate-500 uppercase"
          >
            Enunciado da Questão
          </label>
          <textarea
            id="statement"
            required
            rows={5}
            disabled={pending}
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="Escreva o enunciado completo do caso clínico aqui..."
            className="resize-y rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="explanation"
            className="text-xs font-bold tracking-wider text-slate-500 uppercase"
          >
            {type === "open_ended"
              ? "Espelho de Correção (Feedback)"
              : "Explicação e Resolução Comentada (Feedback)"}
          </label>
          <textarea
            id="explanation"
            required={type === "open_ended"}
            rows={4}
            disabled={pending}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder={
              type === "open_ended"
                ? "Forneça o critério oficial de correção que o aluno usará para se auto-avaliar..."
                : "Forneça a fundamentação teórica que explica por que a alternativa correta é a certa..."
            }
            className="resize-y rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#102A43]">
          Taxonomia e Categorização
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="specialty"
              className="text-xs font-bold tracking-wider text-slate-500 uppercase"
            >
              Especialidade
            </label>
            <select
              id="specialty"
              disabled={pending}
              value={selectedSpecialty}
              onChange={(e) => {
                setSelectedSpecialty(e.target.value);
                setSelectedTheme("");
                setSelectedFocus("");
                setSelectedSubfocus("");
              }}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
            >
              <option value="">Selecione...</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="theme"
              className="text-xs font-bold tracking-wider text-slate-500 uppercase"
            >
              Tema
            </label>
            <select
              id="theme"
              disabled={pending || !selectedSpecialty}
              value={selectedTheme}
              onChange={(e) => {
                setSelectedTheme(e.target.value);
                setSelectedFocus("");
                setSelectedSubfocus("");
              }}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
            >
              <option value="">Selecione...</option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="focus"
              className="text-xs font-bold tracking-wider text-slate-500 uppercase"
            >
              Foco
            </label>
            <select
              id="focus"
              disabled={pending || !selectedTheme}
              value={selectedFocus}
              onChange={(e) => {
                setSelectedFocus(e.target.value);
                setSelectedSubfocus("");
              }}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
            >
              <option value="">Selecione...</option>
              {focuses.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="subfocus"
              className="text-xs font-bold tracking-wider text-slate-500 uppercase"
            >
              Subfoco
            </label>
            <select
              id="subfocus"
              disabled={pending || !selectedFocus}
              value={selectedSubfocus}
              onChange={(e) => setSelectedSubfocus(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
            >
              <option value="">Selecione...</option>
              {subfocuses.map((sf) => (
                <option key={sf.id} value={sf.id}>
                  {sf.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {type === "multiple_choice" && (
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#102A43]">Alternativas</h2>
          <p className="text-xs text-slate-400">
            Marque a bolinha correspondente à alternativa correta.
          </p>

          <div className="space-y-4">
            {alternatives.map((alt, index) => (
              <div key={alt.optionLetter} className="flex items-start gap-4">
                <div className="pt-2">
                  <input
                    type="radio"
                    name="correct-alt"
                    disabled={pending}
                    checked={alt.isCorrect}
                    onChange={() => handleCorrectToggle(index)}
                    className="h-4 w-4 cursor-pointer border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">
                    Alternativa {alt.optionLetter}
                  </label>
                  <input
                    type="text"
                    disabled={pending}
                    value={alt.text}
                    onChange={(e) => handleAltTextChange(index, e.target.value)}
                    placeholder={`Insira o texto da opção ${alt.optionLetter}...`}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#102A43]">
          Imagens Relacionadas
        </h2>
        <p className="text-xs text-slate-400">
          Adicione imagens ilustrativas ou radiografias que acompanham a
          questão.
        </p>

        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {images.map((img, index) => (
              <div
                key={img.url}
                className="group relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={`Imagem ${index + 1}`}
                  className="max-h-full max-w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  disabled={pending}
                  className="absolute top-1.5 right-1.5 cursor-pointer rounded-full bg-rose-600 p-1 text-xs text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 hover:bg-rose-700"
                  title="Remover imagem"
                >
                  ✕
                </button>
                <span className="absolute bottom-1 left-2 rounded bg-slate-900/60 px-1.5 py-0.5 font-mono text-[10px] text-white">
                  #{index + 1}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex w-full items-center justify-center">
          <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:bg-slate-100/50">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                className="mb-2.5 h-8 w-8 text-slate-400"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 20 16"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                />
              </svg>
              <p className="mb-1 text-sm font-semibold text-slate-500">
                {uploading ? "Enviando..." : "Clique para fazer upload"}
              </p>
              <p className="text-xs text-slate-400">PNG, JPG ou GIF</p>
            </div>
            <input
              type="file"
              accept="image/*"
              disabled={uploading || pending}
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button
          type="button"
          disabled={pending}
          onClick={() => router.push(`/${locale}/app/backoffice`)}
          className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending || uploading}
          className="cursor-pointer rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-500 disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar Rascunho"}
        </button>
      </div>
    </form>
  );
}
