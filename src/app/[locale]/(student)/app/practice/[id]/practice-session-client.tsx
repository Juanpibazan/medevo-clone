"use client";

import { useEffect, useState, useTransition } from "react";
import {
  verifyResponseAction,
  saveMetacognitiveMarkAction,
  toggleFavoriteAction,
  finishSessionAction,
} from "../../practice-actions";
import type { MetacognitiveMark } from "@/modules/practice";

interface Alternative {
  id: string;
  optionLetter: "A" | "B" | "C" | "D" | "E";
  text: string;
  isCorrect?: boolean;
}

interface Item {
  id: string;
  sessionId: string;
  questionVersionId: string;
  position: number;
  createdAt: Date;
  title: string;
  statement: string;
  explanation: string | null;
  alternatives: Alternative[];
  response: {
    id: string;
    selectedAlternativeId: string | null;
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

export function PracticeSessionClient({
  locale,
  sessionId,
  initialItems,
  t,
}: PracticeSessionClientProps) {
  const [, startTransition] = useTransition();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Store selections and elapsed seconds as maps keyed by item ID
  const [selections, setSelections] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {};
    for (const item of initialItems) {
      initial[item.id] = item.response?.selectedAlternativeId ?? null;
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

  const [discardedAlts, setDiscardedAlts] = useState<Record<string, boolean>>({});

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
    altId: string,
    elapsed: number
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

        // Auto-save draft every 10 seconds if an alternative is selected
        const currentSelection = selections[activeItemId];
        if (nextSeconds % 10 === 0 && currentSelection) {
          saveDraftSilent(sessionId, activeItemId, currentSelection, nextSeconds);
        }

        return {
          ...prev,
          [activeItemId]: nextSeconds,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeItemId, isVerified, selections, sessionId]);

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
                  }),
                  selectedAlternativeId: alternativeId,
                  timeTakenSeconds: seconds,
                },
              }
            : it
        )
      );

      try {
        await saveDraftSilent(sessionId, activeItemId, alternativeId, seconds);
      } catch (err) {
        console.error("Failed to save draft:", err);
      }
    });
  };

  const handleToggleDiscard = (alternativeId: string) => {
    if (isVerified) return;
    setDiscardedAlts((prev) => ({
      ...prev,
      [alternativeId]: !prev[alternativeId],
    }));
  };

  const handleVerify = () => {
    if (isVerified || !selectedAlt) return;

    startTransition(async () => {
      try {
        const result = await verifyResponseAction(sessionId, activeItemId, selectedAlt, seconds);

        setItems((prev) =>
          prev.map((it) =>
            it.id === activeItemId
              ? {
                  ...it,
                  explanation: result.explanation,
                  alternatives: it.alternatives.map((alt) =>
                    alt.id === result.correctAlternativeId
                      ? { ...alt, isCorrect: true }
                      : { ...alt, isCorrect: false }
                  ),
                  response: {
                    ...(it.response!),
                    isCorrect: result.response.isCorrect,
                    verifiedAt: result.response.verifiedAt,
                    timeTakenSeconds: seconds,
                  },
                }
              : it
          )
        );
      } catch (err) {
        console.error("Verification failed:", err);
      }
    });
  };

  const handleMetacognitiveMark = (mark: MetacognitiveMark) => {
    startTransition(async () => {
      try {
        const updatedResp = await saveMetacognitiveMarkAction(sessionId, activeItemId, mark);
        setItems((prev) =>
          prev.map((it) =>
            it.id === activeItemId
              ? {
                  ...it,
                  response: {
                    ...(it.response!),
                    metacognitiveMark: updatedResp.metacognitiveMark as MetacognitiveMark,
                  },
                }
              : it
          )
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
                      isCorrect: null,
                      timeTakenSeconds: 0,
                      metacognitiveMark: null,
                      verifiedAt: null,
                    }),
                    isFavorite: updatedResp.isFavorite,
                  },
                }
              : it
          )
        );
      } catch (err) {
        console.error("Failed to toggle favorite:", err);
      }
    });
  };

  const handleFinishSession = () => {
    startTransition(async () => {
      try {
        if (!isVerified && selectedAlt) {
          await saveDraftSilent(sessionId, activeItemId, selectedAlt, seconds);
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 max-w-6xl mx-auto px-4 py-8">
      {/* Sidebar Navigation */}
      <div className="lg:col-span-1 bg-white p-5 border border-slate-100 rounded-xl shadow-sm space-y-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h2 className="font-bold text-[#102A43] text-lg">Progreso</h2>
            <span className="text-sm font-semibold text-[#13A89E] bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
              {formatTime(seconds)}
            </span>
          </div>

          {/* Question Grid */}
          <div className="grid grid-cols-5 gap-2">
            {items.map((item, idx) => {
              const itemVerified = item.response?.verifiedAt !== null;
              const itemCorrect = item.response?.isCorrect;
              const itemHasDraft = selections[item.id] !== null;

              let btnBg = "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100";
              if (idx === currentIndex) {
                btnBg = "bg-white border-[#102A43] text-[#102A43] ring-2 ring-[#102A43]/10 font-bold";
              } else if (itemVerified) {
                btnBg = itemCorrect
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold"
                  : "bg-red-50 border-red-300 text-red-700 font-semibold";
              } else if (itemHasDraft) {
                btnBg = "bg-teal-50 border-teal-300 text-[#13A89E] font-semibold";
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-10 border rounded-lg flex items-center justify-center text-sm cursor-pointer transition-all ${btnBg}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleFinishSession}
          className="w-full bg-[#102A43] hover:bg-[#1a3f60] text-white font-medium py-2.5 rounded-lg text-sm transition-colors cursor-pointer"
        >
          {t.finish}
        </button>
      </div>

      {/* Main Question Panel */}
      <div className="lg:col-span-3 bg-white p-6 md:p-8 border border-slate-100 rounded-xl shadow-sm space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t.question} {currentIndex + 1} {t.of} {items.length}
            </span>
            <h1 className="text-lg md:text-xl font-bold text-[#102A43] mt-1">
              {activeItem.title}
            </h1>
          </div>
          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded-lg border transition-all cursor-pointer ${
              isFavorited
                ? "bg-amber-50 border-amber-300 text-amber-500"
                : "bg-white border-slate-200 text-slate-400 hover:text-amber-500"
            }`}
            title={t.favorite}
          >
            ★
          </button>
        </div>

        {/* Statement */}
        <p className="text-slate-700 leading-relaxed text-sm md:text-base whitespace-pre-line bg-slate-50/50 p-4 rounded-xl border border-slate-100/50">
          {activeItem.statement}
        </p>

        {/* Alternatives */}
        <div className="space-y-3">
          {activeItem.alternatives.map((alt) => {
            const isSelected = selectedAlt === alt.id;
            const isDiscarded = discardedAlts[alt.id];

            let altStyle = "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
            let letterStyle = "bg-slate-100 text-slate-500 border-slate-200";

            if (isSelected) {
              altStyle = "border-[#13A89E] bg-teal-50/20 text-[#102A43] shadow-sm";
              letterStyle = "bg-[#13A89E] text-white border-[#13A89E]";
            }

            if (isVerified) {
              if (alt.isCorrect) {
                altStyle = "border-emerald-500 bg-emerald-50/20 text-emerald-800 font-medium";
                letterStyle = "bg-emerald-500 text-white border-emerald-500";
              } else if (isSelected) {
                altStyle = "border-red-500 bg-red-50/20 text-red-800";
                letterStyle = "bg-red-500 text-white border-red-500";
              } else {
                altStyle = "border-slate-100 bg-slate-50/30 text-slate-400 opacity-60";
                letterStyle = "bg-slate-100 text-slate-400 border-slate-100";
              }
            } else if (isDiscarded) {
              altStyle = "border-slate-100 bg-slate-50/50 text-slate-300 line-through opacity-50";
              letterStyle = "bg-slate-100 text-slate-300 border-slate-100";
            }

            return (
              <div key={alt.id} className="flex gap-2 items-center group">
                <button
                  type="button"
                  disabled={isVerified}
                  onClick={() => handleSelectAlternative(alt.id)}
                  className={`flex-1 border text-left rounded-xl p-3.5 flex gap-3 items-center text-sm md:text-base transition-all ${altStyle} ${
                    !isVerified && "cursor-pointer"
                  }`}
                >
                  <span className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-sm ${letterStyle}`}>
                    {alt.optionLetter}
                  </span>
                  <span>{alt.text}</span>
                </button>

                {!isVerified && (
                  <button
                    type="button"
                    onClick={() => handleToggleDiscard(alt.id)}
                    className="p-2 border border-slate-100 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-50 hover:text-red-500 transition-all cursor-pointer text-xs font-semibold"
                    title="Descartar alternativa"
                  >
                    Ø
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        {!isVerified ? (
          <button
            onClick={handleVerify}
            disabled={!selectedAlt}
            className="w-full bg-[#13A89E] hover:bg-[#0f8e85] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors cursor-pointer text-center block text-base"
          >
            {t.verify}
          </button>
        ) : (
          <div className="space-y-6 pt-4 border-t border-slate-100 animate-fadeIn">
            {/* Answer Result banner */}
            <div
              className={`p-4 rounded-xl border flex items-center gap-3 ${
                isCorrect
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <span className="text-2xl">{isCorrect ? "✓" : "✗"}</span>
              <div>
                <h4 className="font-bold text-base">
                  {isCorrect ? t.correct : t.incorrect}
                </h4>
              </div>
            </div>

            {/* Metacognitive Mark */}
            <div className="space-y-3 p-5 border border-slate-100 bg-slate-50/50 rounded-xl">
              <h4 className="font-bold text-[#102A43] text-sm md:text-base">
                {t.metacognitiveTitle}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                  { key: "domine" as const, label: t.domine, bg: "hover:bg-emerald-50 hover:border-emerald-300", active: "bg-emerald-100 border-emerald-400 text-emerald-800" },
                  { key: "duda" as const, label: t.duda, bg: "hover:bg-amber-50 hover:border-amber-300", active: "bg-amber-100 border-amber-400 text-amber-800" },
                  { key: "vacile" as const, label: t.vacile, bg: "hover:bg-indigo-50 hover:border-indigo-300", active: "bg-indigo-100 border-indigo-400 text-indigo-800" },
                  { key: "no_sabia" as const, label: t.no_sabia, bg: "hover:bg-rose-50 hover:border-rose-300", active: "bg-rose-100 border-rose-400 text-rose-800" },
                ].map((mark) => (
                  <button
                    key={mark.key}
                    onClick={() => handleMetacognitiveMark(mark.key)}
                    className={`p-2.5 border border-slate-200 rounded-lg text-sm font-semibold transition-all cursor-pointer text-center ${
                      verifiedMark === mark.key ? mark.active : `bg-white text-slate-600 ${mark.bg}`
                    }`}
                  >
                    {mark.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Explanation */}
            {activeItem.explanation && (
              <div className="space-y-2 p-5 border border-slate-100 rounded-xl">
                <h4 className="font-bold text-[#102A43] text-base">{t.explanation}</h4>
                <p className="text-slate-600 text-sm md:text-base leading-relaxed whitespace-pre-line">
                  {activeItem.explanation}
                </p>
              </div>
            )}

            {/* Navigation Button */}
            {currentIndex < items.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="w-full bg-[#102A43] hover:bg-[#1a3f60] text-white font-medium py-3 rounded-xl transition-colors cursor-pointer text-center block text-base"
              >
                {t.next}
              </button>
            ) : (
              <button
                onClick={handleFinishSession}
                className="w-full bg-[#102A43] hover:bg-[#1a3f60] text-white font-medium py-3 rounded-xl transition-colors cursor-pointer text-center block text-base"
              >
                {t.finish}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
