"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import {
  verifyResponseAction,
  saveMetacognitiveMarkAction,
  toggleFavoriteAction,
  finishSessionAction,
  revealCorrectionCriteriaAction,
} from "../../practice-actions";
import type { MetacognitiveMark } from "@/modules/practice";

interface Alternative {
  id: string;
  optionLetter: "A" | "B" | "C" | "D" | "E";
  text: string;
  isCorrect?: boolean;
}

interface QuestionImage {
  id: string;
  url: string;
  position: number;
}

interface Subquestion {
  letter: string;
  statement: string;
  explanation: string | null;
}

interface Item {
  id: string;
  sessionId: string;
  questionVersionId: string;
  position: number;
  createdAt: Date;
  title: string;
  statement: string;
  type: "multiple_choice" | "open_ended";
  explanation: string | null;
  subquestions?: Subquestion[] | null;
  alternatives: Alternative[];
  images: QuestionImage[];
  response: {
    id: string;
    selectedAlternativeId: string | null;
    responseText: string | null;
    isCorrect: boolean | null;
    timeTakenSeconds: number;
    metacognitiveMark: MetacognitiveMark | null;
    isFavorite: boolean;
    verifiedAt: Date | null;
  } | null;
}

interface PracticeSessionClientProps {
  locale: string;
  sessionId: string;
  initialItems: Item[];
  t: Record<string, string>;
}

function parseSubquestionAnswers(
  rawText: string | null | undefined,
  subquestions?: Subquestion[] | null,
): Record<string, string> {
  if (!rawText) return {};
  try {
    const parsed = JSON.parse(rawText);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      if (parsed.answers && typeof parsed.answers === "object") {
        return parsed.answers as Record<string, string>;
      }
      return parsed as Record<string, string>;
    }
  } catch {
    // fallback if raw text
  }
  if (subquestions && subquestions.length > 0) {
    return { [subquestions[0].letter]: rawText };
  }
  return { "": rawText };
}

function parseSubquestionEvaluations(
  rawText: string | null | undefined,
): Record<string, boolean> {
  if (!rawText) return {};
  try {
    const parsed = JSON.parse(rawText);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      parsed.evaluations &&
      typeof parsed.evaluations === "object"
    ) {
      return parsed.evaluations as Record<string, boolean>;
    }
  } catch { }
  return {};
}

function serializeSubquestionAnswers(
  answersMap: Record<string, string>,
  subquestions?: Subquestion[] | null,
): string {
  if (subquestions && subquestions.length > 0) {
    return JSON.stringify(answersMap);
  }
  return answersMap[""] ?? Object.values(answersMap)[0] ?? "";
}

export function PracticeSessionClient({
  locale,
  sessionId,
  initialItems,
  t,
}: PracticeSessionClientProps) {
  const [, startTransition] = useTransition();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [currentIndex, setCurrentIndex] = useState(0);
  const tBilling = useTranslations("billing");
  const [showQuotaModal, setShowQuotaModal] = useState(false);

  // Store selections and elapsed seconds as maps keyed by item ID
  const [selections, setSelections] = useState<Record<string, string | null>>(
    () => {
      const initial: Record<string, string | null> = {};
      for (const item of initialItems) {
        initial[item.id] = item.response?.selectedAlternativeId ?? null;
      }
      return initial;
    },
  );

  const [subResponses, setSubResponses] = useState<
    Record<string, Record<string, string>>
  >(() => {
    const initial: Record<string, Record<string, string>> = {};
    for (const item of initialItems) {
      initial[item.id] = parseSubquestionAnswers(
        item.response?.responseText,
        item.subquestions,
      );
    }
    return initial;
  });

  const [granularEvals, setGranularEvals] = useState<
    Record<string, Record<string, boolean>>
  >(() => {
    const initial: Record<string, Record<string, boolean>> = {};
    for (const item of initialItems) {
      initial[item.id] = parseSubquestionEvaluations(
        item.response?.responseText,
      );
    }
    return initial;
  });

  const [times, setTimes] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const item of initialItems) {
      initial[item.id] = item.response?.timeTakenSeconds ?? 0;
    }
    return initial;
  });

  const [showOpenEndedEvaluation, setShowOpenEndedEvaluation] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    for (const item of initialItems) {
      // If response text is set but not yet verified, we can restore evaluation view
      if (
        item.type === "open_ended" &&
        item.response?.responseText &&
        !item.response?.verifiedAt
      ) {
        initial[item.id] = true;
      }
    }
    return initial;
  });

  const [discardedAlts, setDiscardedAlts] = useState<Record<string, boolean>>(
    {},
  );

  const activeItem = items[currentIndex];
  const activeItemId = activeItem?.id;

  const selectedAlt = selections[activeItemId];
  const seconds = times[activeItemId] ?? 0;

  const isVerified = !!activeItem?.response?.verifiedAt;
  const isCorrect = activeItem?.response?.isCorrect;
  const verifiedMark = activeItem?.response?.metacognitiveMark;
  const isFavorited = activeItem?.response?.isFavorite ?? false;

  const saveDraftSilent = async (
    sessId: string,
    itemId: string,
    altId: string | null,
    elapsed: number,
    respText?: string,
  ) => {
    try {
      await fetch("/api/practice/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessId,
          itemId,
          alternativeId: altId,
          elapsedSeconds: elapsed,
          responseText: respText,
        }),
      });
    } catch (err) {
      console.error("Failed silent draft save:", err);
    }
  };

  // Timer effect
  useEffect(() => {
    if (!activeItemId || isVerified) return;

    const timer = setInterval(() => {
      setTimes((prev) => {
        const currentSeconds = prev[activeItemId] ?? 0;
        const nextSeconds = currentSeconds + 1;

        // Auto-save draft every 10 seconds if any selection or text exists
        const currentSelection = selections[activeItemId];
        const currentSubMap = subResponses[activeItemId] || {};
        const hasSelection =
          activeItem.type === "multiple_choice"
            ? !!currentSelection
            : activeItem.subquestions && activeItem.subquestions.length > 0
              ? activeItem.subquestions.some(
                (s) => (currentSubMap[s.letter] || "").trim().length > 0,
              )
              : (currentSubMap[""] || "").trim().length > 0;

        if (nextSeconds % 10 === 0 && hasSelection) {
          const serialized =
            activeItem.type === "open_ended"
              ? serializeSubquestionAnswers(
                currentSubMap,
                activeItem.subquestions,
              )
              : undefined;

          saveDraftSilent(
            sessionId,
            activeItemId,
            activeItem.type === "multiple_choice" ? currentSelection : null,
            nextSeconds,
            serialized,
          );
        }

        return {
          ...prev,
          [activeItemId]: nextSeconds,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    activeItemId,
    isVerified,
    selections,
    subResponses,
    sessionId,
    activeItem,
  ]);

  const handleSelectAlternative = (alternativeId: string) => {
    if (isVerified) return;

    startTransition(async () => {
      setSelections((prev) => ({
        ...prev,
        [activeItemId]: alternativeId,
      }));

      setItems((prev) =>
        prev.map((it) =>
          it.id === activeItemId
            ? {
              ...it,
              response: {
                ...(it.response ?? {
                  id: crypto.randomUUID(),
                  isCorrect: null,
                  metacognitiveMark: null,
                  isFavorite: false,
                  verifiedAt: null,
                  responseText: null,
                }),
                selectedAlternativeId: alternativeId,
                timeTakenSeconds: seconds,
              },
            }
            : it,
        ),
      );

      try {
        await saveDraftSilent(
          sessionId,
          activeItemId,
          alternativeId,
          seconds,
          undefined,
        );
      } catch (err) {
        console.error("Failed to save draft:", err);
      }
    });
  };

  const handleSubquestionResponseChange = (letter: string, text: string) => {
    if (isVerified) return;

    setSubResponses((prev) => {
      const updatedMap = {
        ...(prev[activeItemId] || {}),
        [letter]: text,
      };

      const serialized = serializeSubquestionAnswers(
        updatedMap,
        activeItem.subquestions,
      );

      setItems((prevItems) =>
        prevItems.map((it) =>
          it.id === activeItemId
            ? {
              ...it,
              response: {
                ...(it.response ?? {
                  id: crypto.randomUUID(),
                  selectedAlternativeId: null,
                  isCorrect: null,
                  metacognitiveMark: null,
                  isFavorite: false,
                  verifiedAt: null,
                }),
                responseText: serialized,
                timeTakenSeconds: seconds,
              },
            }
            : it,
        ),
      );

      return {
        ...prev,
        [activeItemId]: updatedMap,
      };
    });
  };

  const handleToggleDiscard = (alternativeId: string) => {
    if (isVerified) return;
    setDiscardedAlts((prev) => ({
      ...prev,
      [alternativeId]: !prev[alternativeId],
    }));
  };

  const isVerifyDisabled = () => {
    if (activeItem.type === "multiple_choice") {
      return !selectedAlt;
    }
    const currentSubMap = subResponses[activeItemId] || {};
    if (activeItem.subquestions && activeItem.subquestions.length > 0) {
      return !activeItem.subquestions.every(
        (sub) => (currentSubMap[sub.letter] || "").trim().length > 0,
      );
    }
    return !(currentSubMap[""] || "").trim().length;
  };

  const handleVerify = () => {
    if (isVerified) return;

    if (activeItem.type === "open_ended") {
      const currentSubMap = subResponses[activeItemId] || {};
      const serialized = serializeSubquestionAnswers(
        currentSubMap,
        activeItem.subquestions,
      );
      if (!serialized.trim()) return;

      startTransition(async () => {
        try {
          // Save draft first
          await saveDraftSilent(
            sessionId,
            activeItemId,
            null,
            seconds,
            serialized,
          );

          // Fetch explanation and subquestions criteria securely from server
          const result = await revealCorrectionCriteriaAction(
            sessionId,
            activeItemId,
          );

          setItems((prev) =>
            prev.map((it) =>
              it.id === activeItemId
                ? {
                  ...it,
                  explanation: result.explanation,
                  subquestions:
                    (result.subquestions as Subquestion[] | null) ??
                    it.subquestions,
                }
                : it,
            ),
          );

          setShowOpenEndedEvaluation((prev) => ({
            ...prev,
            [activeItemId]: true,
          }));
        } catch (err) {
          console.error("Failed to reveal correction criteria:", err);
        }
      });
      return;
    }

    // Multiple choice verification
    if (!selectedAlt) return;

    startTransition(async () => {
      try {
        const result = await verifyResponseAction(
          sessionId,
          activeItemId,
          selectedAlt,
          seconds,
        );

        if (result && "response" in result) {
          const { explanation, correctAlternativeId, response } = result;

          setItems((prev) =>
            prev.map((it) =>
              it.id === activeItemId
                ? {
                  ...it,
                  explanation,
                  alternatives: it.alternatives.map((alt) =>
                    alt.id === correctAlternativeId
                      ? { ...alt, isCorrect: true }
                      : { ...alt, isCorrect: false },
                  ),
                  response: {
                    ...it.response!,
                    isCorrect: response.isCorrect,
                    verifiedAt: response.verifiedAt,
                    timeTakenSeconds: seconds,
                  },
                }
                : it,
            ),
          );
        } else if (
          result &&
          "error" in result &&
          result.error === "quota_exceeded"
        ) {
          setShowQuotaModal(true);
        }
      } catch (err) {
        console.error("Verification failed:", err);
      }
    });
  };

  const handleSubquestionEvalChange = (letter: string, evalValue: boolean) => {
    if (isVerified) return;
    setGranularEvals((prev) => ({
      ...prev,
      [activeItemId]: {
        ...(prev[activeItemId] || {}),
        [letter]: evalValue,
      },
    }));
  };

  const handleConfirmDiscursiveEvaluation = () => {
    if (isVerified) return;
    const currentEvals = granularEvals[activeItemId] || {};

    startTransition(async () => {
      try {
        const result = await verifyResponseAction(
          sessionId,
          activeItemId,
          null,
          seconds,
          currentEvals,
          currentEvals,
        );

        if (result && "response" in result) {
          const { response, subquestions, explanation } = result;

          setItems((prev) =>
            prev.map((it) =>
              it.id === activeItemId
                ? {
                  ...it,
                  explanation: explanation ?? it.explanation,
                  subquestions:
                    (subquestions as Subquestion[] | null) ??
                    it.subquestions,
                  response: {
                    ...it.response!,
                    isCorrect: response.isCorrect,
                    verifiedAt: response.verifiedAt,
                    timeTakenSeconds: seconds,
                    responseText:
                      response.responseText ??
                      it.response?.responseText ??
                      null,
                  },
                }
                : it,
            ),
          );

          // Clear temporary evaluation trigger state
          setShowOpenEndedEvaluation((prev) => ({
            ...prev,
            [activeItemId]: false,
          }));
        } else if (
          result &&
          "error" in result &&
          result.error === "quota_exceeded"
        ) {
          setShowQuotaModal(true);
        }
      } catch (err) {
        console.error("Self-evaluation failed:", err);
      }
    });
  };

  const handleDiscursiveSelfEvaluate = (selfCorrect: boolean) => {
    if (isVerified) return;

    startTransition(async () => {
      try {
        const result = await verifyResponseAction(
          sessionId,
          activeItemId,
          null,
          seconds,
          selfCorrect,
        );

        if (result && "response" in result) {
          const { response, subquestions, explanation } = result;

          setItems((prev) =>
            prev.map((it) =>
              it.id === activeItemId
                ? {
                  ...it,
                  explanation: explanation ?? it.explanation,
                  subquestions:
                    (subquestions as Subquestion[] | null) ??
                    it.subquestions,
                  response: {
                    ...it.response!,
                    isCorrect: response.isCorrect,
                    verifiedAt: response.verifiedAt,
                    timeTakenSeconds: seconds,
                    responseText:
                      response.responseText ??
                      it.response?.responseText ??
                      null,
                  },
                }
                : it,
            ),
          );

          // Clear temporary evaluation trigger state
          setShowOpenEndedEvaluation((prev) => ({
            ...prev,
            [activeItemId]: false,
          }));
        } else if (
          result &&
          "error" in result &&
          result.error === "quota_exceeded"
        ) {
          setShowQuotaModal(true);
        }
      } catch (err) {
        console.error("Self-evaluation failed:", err);
      }
    });
  };

  const handleMetacognitiveMark = (mark: MetacognitiveMark) => {
    startTransition(async () => {
      try {
        const updatedResp = await saveMetacognitiveMarkAction(
          sessionId,
          activeItemId,
          mark,
        );
        setItems((prev) =>
          prev.map((it) =>
            it.id === activeItemId
              ? {
                ...it,
                response: {
                  ...it.response!,
                  metacognitiveMark:
                    updatedResp.metacognitiveMark as MetacognitiveMark,
                },
              }
              : it,
          ),
        );
      } catch (err) {
        console.error("Failed to save mark:", err);
      }
    });
  };

  const handleToggleFavorite = () => {
    startTransition(async () => {
      try {
        const updatedResp = await toggleFavoriteAction(sessionId, activeItemId);
        setItems((prev) =>
          prev.map((it) =>
            it.id === activeItemId
              ? {
                ...it,
                response: {
                  ...(it.response ?? {
                    id: crypto.randomUUID(),
                    selectedAlternativeId: null,
                    responseText: null,
                    isCorrect: null,
                    timeTakenSeconds: 0,
                    metacognitiveMark: null,
                    verifiedAt: null,
                  }),
                  isFavorite: updatedResp.isFavorite,
                },
              }
              : it,
          ),
        );
      } catch (err) {
        console.error("Failed to toggle favorite:", err);
      }
    });
  };

  const handleFinishSession = () => {
    startTransition(async () => {
      try {
        if (!isVerified) {
          if (activeItem.type === "multiple_choice" && selectedAlt) {
            await saveDraftSilent(
              sessionId,
              activeItemId,
              selectedAlt,
              seconds,
              undefined,
            );
          } else if (activeItem.type === "open_ended") {
            const currentSubMap = subResponses[activeItemId] || {};
            const serialized = serializeSubquestionAnswers(
              currentSubMap,
              activeItem.subquestions,
            );
            if (serialized.trim()) {
              await saveDraftSilent(
                sessionId,
                activeItemId,
                null,
                seconds,
                serialized,
              );
            }
          }
        }
        await finishSessionAction(sessionId, locale);
      } catch (err) {
        console.error("Failed to finish session:", err);
      }
    });
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Helper strings based on active locale
  const promptEval =
    locale === "es"
      ? "¿Tu respuesta fue correcta según el criterio oficial?"
      : "Sua resposta foi correta segundo o critério oficial?";
  const btnCorrect = locale === "es" ? "Acerté" : "Acertei";
  const btnIncorrect = locale === "es" ? "Me equivoqué" : "Errei";
  const criteriaTitle =
    locale === "es" ? "Espelho de Corrección" : "Espelho de Correção";
  const textPlaceholder =
    locale === "es"
      ? "Escribe tu respuesta discursiva aquí detalladamente..."
      : "Escreva sua resposta discursiva aqui detalhadamente...";

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-4">
      {/* Sidebar Navigation */}
      <div className="flex flex-col justify-between space-y-6 rounded-xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-1">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-[#102A43]">Progreso</h2>
            <span className="rounded border border-teal-100 bg-teal-50 px-2 py-0.5 text-sm font-semibold text-[#13A89E]">
              {formatTime(seconds)}
            </span>
          </div>

          {/* Question Grid */}
          <div className="grid grid-cols-5 gap-2">
            {items.map((item, idx) => {
              const itemVerified = !!item.response?.verifiedAt;
              const itemCorrect = item.response?.isCorrect;
              const currentSubMap = subResponses[item.id] || {};
              const itemHasDraft =
                item.type === "multiple_choice"
                  ? selections[item.id] !== null
                  : item.subquestions && item.subquestions.length > 0
                    ? item.subquestions.some(
                      (s) =>
                        (currentSubMap[s.letter] || "").trim().length > 0,
                    )
                    : (currentSubMap[""] || "").trim().length > 0;

              let btnBg =
                "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100";
              if (idx === currentIndex) {
                btnBg =
                  "bg-white border-[#102A43] text-[#102A43] ring-2 ring-[#102A43]/10 font-bold";
              } else if (itemVerified) {
                btnBg =
                  itemCorrect === true
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold"
                    : "bg-red-50 border-red-300 text-red-700 font-semibold";
              } else if (itemHasDraft) {
                btnBg =
                  "bg-teal-50 border-teal-300 text-[#13A89E] font-semibold";
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`flex h-10 cursor-pointer items-center justify-center rounded-lg border text-sm transition-all ${btnBg}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleFinishSession}
          className="w-full cursor-pointer rounded-lg bg-[#102A43] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a3f60]"
        >
          {t.finish}
        </button>
      </div>

      {/* Main Question Panel */}
      <div className="space-y-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm md:p-8 lg:col-span-3">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              {t.question} {currentIndex + 1} {t.of} {items.length}
            </span>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#102A43] md:text-xl">
                {activeItem.title}
              </h1>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {activeItem.type === "open_ended"
                  ? locale === "es"
                    ? "Discursiva"
                    : "Discursiva"
                  : locale === "es"
                    ? "Múltiple Opción"
                    : "Múltipla Escolha"}
              </span>
            </div>
          </div>
          <button
            onClick={handleToggleFavorite}
            className={`cursor-pointer rounded-lg border p-2 transition-all ${isFavorited
              ? "border-amber-300 bg-amber-50 text-amber-500"
              : "border-slate-200 bg-white text-slate-400 hover:text-amber-500"
              }`}
            title={t.favorite}
          >
            ★
          </button>
        </div>

        {/* Question Images */}
        {activeItem.images && activeItem.images.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {activeItem.images.map((img) => (
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
        )}

        {/* Statement */}
        <p className="rounded-xl border border-slate-100/50 bg-slate-50/50 p-4 text-sm leading-relaxed whitespace-pre-line text-slate-700 md:text-base">
          {/* {activeItem.statement} */}
          {activeItem.statement.replace(/<!--\s*image\s*-->/gi, "").trim()}
        </p>

        {/* Alternatives (if multiple choice) */}
        {activeItem.type === "multiple_choice" && (
          <div className="space-y-3">
            {activeItem.alternatives.map((alt) => {
              const isSelected = selectedAlt === alt.id;
              const isDiscarded = discardedAlts[alt.id];

              let altStyle =
                "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
              let letterStyle = "bg-slate-100 text-slate-500 border-slate-200";

              if (isSelected) {
                altStyle =
                  "border-[#13A89E] bg-teal-50/20 text-[#102A43] shadow-sm";
                letterStyle = "bg-[#13A89E] text-white border-[#13A89E]";
              }

              if (isVerified) {
                if (alt.isCorrect) {
                  altStyle =
                    "border-emerald-500 bg-emerald-50/20 text-emerald-800 font-medium";
                  letterStyle = "bg-emerald-500 text-white border-emerald-500";
                } else if (isSelected) {
                  altStyle = "border-red-500 bg-red-50/20 text-red-800";
                  letterStyle = "bg-red-500 text-white border-red-500";
                } else {
                  altStyle =
                    "border-slate-100 bg-slate-50/30 text-slate-400 opacity-60";
                  letterStyle = "bg-slate-100 text-slate-400 border-slate-100";
                }
              } else if (isDiscarded) {
                altStyle =
                  "border-slate-100 bg-slate-50/50 text-slate-300 line-through opacity-50";
                letterStyle = "bg-slate-100 text-slate-300 border-slate-100";
              }

              return (
                <div key={alt.id} className="group flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isVerified}
                    onClick={() => handleSelectAlternative(alt.id)}
                    className={`flex flex-1 items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-all md:text-base ${altStyle} ${!isVerified && "cursor-pointer"
                      }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-bold ${letterStyle}`}
                    >
                      {alt.optionLetter}
                    </span>
                    <span>{alt.text}</span>
                  </button>

                  {!isVerified && (
                    <button
                      type="button"
                      onClick={() => handleToggleDiscard(alt.id)}
                      className="cursor-pointer rounded-lg border border-slate-100 p-2 text-xs font-semibold text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-50 hover:text-red-500"
                      title="Descartar alternativa"
                    >
                      Ø
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Text response input / Subquestions (if open ended) */}
        {activeItem.type === "open_ended" && (
          <div className="space-y-6">
            {activeItem.subquestions && activeItem.subquestions.length > 0 ? (
              activeItem.subquestions.map((sub) => {
                const subAnswer =
                  subResponses[activeItemId]?.[sub.letter] ?? "";
                const isEvalOrVerified =
                  isVerified || showOpenEndedEvaluation[activeItemId];
                const currentItemEvals = granularEvals[activeItemId] || {};
                const subEval = currentItemEvals[sub.letter];

                return (
                  <div
                    key={sub.letter}
                    className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/30 p-5 shadow-xs"
                  >
                    {/* Subquestion Header */}
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#102A43] text-xs font-bold text-white uppercase">
                        {sub.letter}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800 md:text-base">
                          {sub.statement}
                        </p>
                      </div>
                    </div>

                    {/* Subquestion Textarea */}
                    <div className="flex flex-col gap-2">
                      <textarea
                        disabled={isEvalOrVerified}
                        value={subAnswer}
                        onChange={(e) =>
                          handleSubquestionResponseChange(
                            sub.letter,
                            e.target.value,
                          )
                        }
                        placeholder={
                          locale === "es"
                            ? `Escribe tu respuesta para la subpregunta ${sub.letter}...`
                            : `Escreva sua resposta para a subpergunta ${sub.letter}...`
                        }
                        rows={4}
                        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-teal-500 focus:outline-none disabled:bg-slate-100/70 disabled:text-slate-600 md:text-base"
                      />
                    </div>

                    {/* Subquestion Espelho de Correção (when evaluating or verified) */}
                    {isEvalOrVerified && sub.explanation && (
                      <div className="animate-fadeIn space-y-3 rounded-xl border border-teal-100 bg-teal-50/40 p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold tracking-wider text-teal-800 uppercase">
                            {criteriaTitle} —{" "}
                            {locale === "es" ? "Subpregunta" : "Subpergunta"}{" "}
                            {sub.letter}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700 md:text-base">
                          {sub.explanation}
                        </p>

                        {/* Granular Subquestion Evaluation Buttons (during evaluation) */}
                        {!isVerified &&
                          showOpenEndedEvaluation[activeItemId] && (
                            <div className="flex flex-col items-start justify-between gap-3 border-t border-teal-200/60 pt-3 sm:flex-row sm:items-center">
                              <span className="text-xs font-semibold text-slate-700">
                                {locale === "es"
                                  ? "¿Cómo fue tu respuesta en esta subpregunta?"
                                  : "Como foi sua resposta nesta subpergunta?"}
                              </span>
                              <div className="flex w-full items-center gap-2 sm:w-auto">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSubquestionEvalChange(
                                      sub.letter,
                                      true,
                                    )
                                  }
                                  className={`flex-1 cursor-pointer rounded-lg border px-3.5 py-1.5 text-xs font-bold transition-all sm:flex-none ${subEval === true
                                    ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                                    : "border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
                                    }`}
                                >
                                  ✓ {btnCorrect}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSubquestionEvalChange(
                                      sub.letter,
                                      false,
                                    )
                                  }
                                  className={`flex-1 cursor-pointer rounded-lg border px-3.5 py-1.5 text-xs font-bold transition-all sm:flex-none ${subEval === false
                                    ? "border-rose-600 bg-rose-600 text-white shadow-xs"
                                    : "border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
                                    }`}
                                >
                                  ✗ {btnIncorrect}
                                </button>
                              </div>
                            </div>
                          )}

                        {/* Granular Subquestion Evaluation Badge (when verified) */}
                        {isVerified && subEval !== undefined && (
                          <div className="flex items-center justify-between gap-2 border-t border-teal-200/60 pt-2.5">
                            <span className="text-xs font-semibold text-slate-500">
                              {locale === "es"
                                ? "Autoevaluación:"
                                : "Autoavaliação:"}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-bold ${subEval
                                ? "border border-emerald-200 bg-emerald-100 text-emerald-800"
                                : "border border-rose-200 bg-rose-100 text-rose-800"
                                }`}
                            >
                              {subEval ? `✓ ${btnCorrect}` : `✗ ${btnIncorrect}`}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              /* Fallback for legacy single open-ended without subquestions */
              <div className="flex flex-col gap-2">
                <textarea
                  disabled={
                    isVerified || showOpenEndedEvaluation[activeItemId]
                  }
                  value={subResponses[activeItemId]?.[""] ?? ""}
                  onChange={(e) =>
                    handleSubquestionResponseChange("", e.target.value)
                  }
                  placeholder={textPlaceholder}
                  rows={6}
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 md:text-base"
                />
              </div>
            )}
          </div>
        )}

        {/* Bottom Verify Action */}
        {!isVerified && !showOpenEndedEvaluation[activeItemId] && (
          <button
            onClick={handleVerify}
            disabled={isVerifyDisabled()}
            className="block w-full cursor-pointer rounded-xl bg-[#13A89E] py-3 text-center text-base font-medium text-white transition-colors hover:bg-[#0f8e85] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {t.verify}
          </button>
        )}

        {/* Step 2: Discursive self evaluation flow */}
        {activeItem.type === "open_ended" &&
          !isVerified &&
          showOpenEndedEvaluation[activeItemId] && (
            <div className="animate-fadeIn space-y-6 border-t border-slate-100 pt-4">
              {/* General Question Explanation if not using subquestions */}
              {(!activeItem.subquestions ||
                activeItem.subquestions.length === 0) && (
                  <div className="space-y-4">
                    {activeItem.explanation && (
                      <div className="space-y-2 rounded-xl border border-teal-100 bg-teal-50/20 p-5">
                        <h4 className="text-base font-bold text-teal-800">
                          {criteriaTitle}
                        </h4>
                        <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700 md:text-base">
                          {activeItem.explanation}
                        </p>
                      </div>
                    )}

                    {/* Self assessment banner for single open-ended */}
                    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                      <p className="text-sm font-semibold text-[#102A43] md:text-base">
                        {promptEval}
                      </p>
                      <div className="mx-auto flex max-w-sm gap-4">
                        <button
                          onClick={() => handleDiscursiveSelfEvaluate(true)}
                          className="flex-1 cursor-pointer rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white shadow transition-colors hover:bg-emerald-500"
                        >
                          ✓ {btnCorrect}
                        </button>
                        <button
                          onClick={() => handleDiscursiveSelfEvaluate(false)}
                          className="flex-1 cursor-pointer rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white shadow transition-colors hover:bg-rose-500"
                        >
                          ✗ {btnIncorrect}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              {/* Confirmation Banner for subquestions */}
              {activeItem.subquestions &&
                activeItem.subquestions.length > 0 && (
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                    <p className="text-sm font-semibold text-[#102A43] md:text-base">
                      {locale === "es"
                        ? "Califica cada subpregunta arriba y confirma tu autoevaluación."
                        : "Avalie cada subpergunta acima e confirme sua autoavaliação."}
                    </p>
                    <button
                      onClick={handleConfirmDiscursiveEvaluation}
                      disabled={
                        !activeItem.subquestions.every(
                          (sub) =>
                            typeof (granularEvals[activeItemId] || {})[
                            sub.letter
                            ] === "boolean",
                        )
                      }
                      className="block w-full cursor-pointer rounded-xl bg-[#13A89E] py-3 text-center text-base font-medium text-white transition-colors hover:bg-[#0f8e85] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {locale === "es"
                        ? "Confirmar autoevaluación"
                        : "Confirmar autoavaliação"}
                    </button>
                  </div>
                )}
            </div>
          )}

        {/* Answer Result banner & metacognitive marks after verification */}
        {isVerified && (
          <div className="animate-fadeIn space-y-6 border-t border-slate-100 pt-4">
            {/* Answer Result banner */}
            <div
              className={`flex items-center gap-3 rounded-xl border p-4 ${isCorrect === true
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
                }`}
            >
              <span className="text-2xl">
                {isCorrect === true ? "✓" : "✗"}
              </span>
              <div>
                <h4 className="text-base font-bold">
                  {isCorrect === true ? t.correct : t.incorrect}
                </h4>
              </div>
            </div>

            {/* Metacognitive Mark */}
            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-5">
              <h4 className="text-sm font-bold text-[#102A43] md:text-base">
                {t.metacognitiveTitle}
              </h4>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                {[
                  {
                    key: "domine" as const,
                    label: t.domine,
                    bg: "hover:bg-emerald-50 hover:border-emerald-300",
                    active:
                      "bg-emerald-100 border-emerald-400 text-emerald-800",
                  },
                  {
                    key: "duda" as const,
                    label: t.duda,
                    bg: "hover:bg-amber-50 hover:border-amber-300",
                    active: "bg-amber-100 border-amber-400 text-amber-800",
                  },
                  {
                    key: "vacile" as const,
                    label: t.vacile,
                    bg: "hover:bg-indigo-50 hover:border-indigo-300",
                    active: "bg-indigo-100 border-indigo-400 text-indigo-800",
                  },
                  {
                    key: "no_sabia" as const,
                    label: t.no_sabia,
                    bg: "hover:bg-rose-50 hover:border-rose-300",
                    active: "bg-rose-100 border-rose-400 text-rose-800",
                  },
                ].map((mark) => (
                  <button
                    key={mark.key}
                    onClick={() => handleMetacognitiveMark(mark.key)}
                    className={`cursor-pointer rounded-lg border border-slate-200 p-2.5 text-center text-sm font-semibold transition-all ${verifiedMark === mark.key
                      ? mark.active
                      : `bg-white text-slate-600 ${mark.bg}`
                      }`}
                  >
                    {mark.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Criteria / Explanation (for multiple choice or fallback single open-ended) */}
            {activeItem.explanation &&
              (!activeItem.subquestions ||
                activeItem.subquestions.length === 0) && (
                <div className="space-y-2 rounded-xl border border-slate-100 p-5">
                  <h4 className="text-base font-bold text-[#102A43]">
                    {activeItem.type === "open_ended"
                      ? criteriaTitle
                      : t.explanation}
                  </h4>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-slate-600 md:text-base">
                    {activeItem.explanation}
                  </p>
                </div>
              )}

            {/* Navigation Button */}
            {currentIndex < items.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="block w-full cursor-pointer rounded-xl bg-[#102A43] py-3 text-center text-base font-medium text-white transition-colors hover:bg-[#1a3f60]"
              >
                {t.next}
              </button>
            ) : (
              <button
                onClick={handleFinishSession}
                className="block w-full cursor-pointer rounded-xl bg-[#102A43] py-3 text-center text-base font-medium text-white transition-colors hover:bg-[#1a3f60]"
              >
                {t.finish}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quota Modal */}
      {showQuotaModal && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="animate-in zoom-in-95 w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl duration-200">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#102A43]">
              {tBilling("modalTitle")}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {tBilling("modalDesc")}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <a
                href={`/${locale}/app/billing`}
                className="block w-full rounded-lg bg-[#13A89E] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0f8e85]"
              >
                {tBilling("modalButton")}
              </a>
              <a
                href={`/${locale}/app`}
                className="block w-full rounded-lg bg-slate-100 px-4 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
              >
                {tBilling("goBack")}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
