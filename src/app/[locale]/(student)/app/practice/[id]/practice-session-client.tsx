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
  const [selections, setSelections] = useState<Record<string, string | null>>(
    () => {
      const initial: Record<string, string | null> = {};
      for (const item of initialItems) {
        initial[item.id] = item.response?.selectedAlternativeId ?? null;
      }
      return initial;
    },
  );

  const [times, setTimes] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const item of initialItems) {
      initial[item.id] = item.response?.timeTakenSeconds ?? 0;
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
    altId: string,
    elapsed: number,
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
          saveDraftSilent(
            sessionId,
            activeItemId,
            currentSelection,
            nextSeconds,
          );
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
            : it,
        ),
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
        const result = await verifyResponseAction(
          sessionId,
          activeItemId,
          selectedAlt,
          seconds,
        );

        setItems((prev) =>
          prev.map((it) =>
            it.id === activeItemId
              ? {
                  ...it,
                  explanation: result.explanation,
                  alternatives: it.alternatives.map((alt) =>
                    alt.id === result.correctAlternativeId
                      ? { ...alt, isCorrect: true }
                      : { ...alt, isCorrect: false },
                  ),
                  response: {
                    ...it.response!,
                    isCorrect: result.response.isCorrect,
                    verifiedAt: result.response.verifiedAt,
                    timeTakenSeconds: seconds,
                  },
                }
              : it,
          ),
        );
      } catch (err) {
        console.error("Verification failed:", err);
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
              const itemVerified = item.response?.verifiedAt !== null;
              const itemCorrect = item.response?.isCorrect;
              const itemHasDraft = selections[item.id] !== null;

              let btnBg =
                "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100";
              if (idx === currentIndex) {
                btnBg =
                  "bg-white border-[#102A43] text-[#102A43] ring-2 ring-[#102A43]/10 font-bold";
              } else if (itemVerified) {
                btnBg = itemCorrect
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
            <h1 className="mt-1 text-lg font-bold text-[#102A43] md:text-xl">
              {activeItem.title}
            </h1>
          </div>
          <button
            onClick={handleToggleFavorite}
            className={`cursor-pointer rounded-lg border p-2 transition-all ${
              isFavorited
                ? "border-amber-300 bg-amber-50 text-amber-500"
                : "border-slate-200 bg-white text-slate-400 hover:text-amber-500"
            }`}
            title={t.favorite}
          >
            ★
          </button>
        </div>

        {/* Statement */}
        <p className="rounded-xl border border-slate-100/50 bg-slate-50/50 p-4 text-sm leading-relaxed whitespace-pre-line text-slate-700 md:text-base">
          {activeItem.statement}
        </p>

        {/* Alternatives */}
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
                  className={`flex flex-1 items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-all md:text-base ${altStyle} ${
                    !isVerified && "cursor-pointer"
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

        {/* Bottom Actions */}
        {!isVerified ? (
          <button
            onClick={handleVerify}
            disabled={!selectedAlt}
            className="block w-full cursor-pointer rounded-xl bg-[#13A89E] py-3 text-center text-base font-medium text-white transition-colors hover:bg-[#0f8e85] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {t.verify}
          </button>
        ) : (
          <div className="animate-fadeIn space-y-6 border-t border-slate-100 pt-4">
            {/* Answer Result banner */}
            <div
              className={`flex items-center gap-3 rounded-xl border p-4 ${
                isCorrect
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              <span className="text-2xl">{isCorrect ? "✓" : "✗"}</span>
              <div>
                <h4 className="text-base font-bold">
                  {isCorrect ? t.correct : t.incorrect}
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
                    className={`cursor-pointer rounded-lg border border-slate-200 p-2.5 text-center text-sm font-semibold transition-all ${
                      verifiedMark === mark.key
                        ? mark.active
                        : `bg-white text-slate-600 ${mark.bg}`
                    }`}
                  >
                    {mark.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Explanation */}
            {activeItem.explanation && (
              <div className="space-y-2 rounded-xl border border-slate-100 p-5">
                <h4 className="text-base font-bold text-[#102A43]">
                  {t.explanation}
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
    </div>
  );
}
