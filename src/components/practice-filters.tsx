"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { TaxonomyNode } from "@/modules/content";
import { startPracticeSessionAction } from "@/app/[locale]/(student)/app/practice-actions";

interface PracticeFiltersProps {
  taxonomyNodes: TaxonomyNode[];
  quota: {
    isBlocked: boolean;
    answeredToday: number;
    limit: number;
    tier: "free" | "premium";
  };
  activeSession: { id: string } | null;
}

export function PracticeFilters({
  taxonomyNodes,
  quota,
  activeSession,
}: PracticeFiltersProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const router = useRouter();

  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("");
  const [selectedFocus, setSelectedFocus] = useState("");
  const [selectedSubfocus, setSelectedSubfocus] = useState("");

  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // Filter taxonomy nodes by level
  const specialties = taxonomyNodes.filter((n) => n.level === "specialty");
  const themes = taxonomyNodes.filter(
    (n) => n.level === "theme" && n.parentId === selectedSpecialty,
  );
  const focuses = taxonomyNodes.filter(
    (n) => n.level === "focus" && n.parentId === selectedTheme,
  );
  const subfocuses = taxonomyNodes.filter(
    (n) => n.level === "subfocus" && n.parentId === selectedFocus,
  );

  async function handleStartPractice() {
    setError("");
    setPending(true);

    // Deepest selected node is our active filter
    const activeNodeId =
      selectedSubfocus ||
      selectedFocus ||
      selectedTheme ||
      selectedSpecialty ||
      undefined;

    try {
      const result = await startPracticeSessionAction(locale, activeNodeId);
      if (result.error) {
        if (result.error === "quota_exceeded") {
          router.push(`/${locale}/app/billing`);
        } else if (result.error === "no_questions_for_filters") {
          setError(t("noQuestionsForFilters"));
        } else {
          setError(t("failedToCreateSession"));
        }
      } else if (result.sessionId) {
        router.push(`/${locale}/app/practice/${result.sessionId}`);
        router.refresh();
      }
    } catch {
      setError(t("failedToCreateSession"));
    } finally {
      setPending(false);
    }
  }

  // Handle changes that reset lower levels
  const handleSpecialtyChange = (val: string) => {
    setSelectedSpecialty(val);
    setSelectedTheme("");
    setSelectedFocus("");
    setSelectedSubfocus("");
    setError("");
  };

  const handleThemeChange = (val: string) => {
    setSelectedTheme(val);
    setSelectedFocus("");
    setSelectedSubfocus("");
    setError("");
  };

  const handleFocusChange = (val: string) => {
    setSelectedFocus(val);
    setSelectedSubfocus("");
    setError("");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Cascading Selects */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="specialty-filter"
            className="text-xs font-semibold text-slate-600"
          >
            {t("filterSpecialty")}
          </label>
          <select
            id="specialty-filter"
            value={selectedSpecialty}
            onChange={(e) => handleSpecialtyChange(e.target.value)}
            disabled={quota.isBlocked || pending}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#13A89E] focus:outline-none disabled:opacity-50"
          >
            <option value="">{t("selectAll")}</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="theme-filter"
            className="text-xs font-semibold text-slate-600"
          >
            {t("filterTheme")}
          </label>
          <select
            id="theme-filter"
            value={selectedTheme}
            onChange={(e) => handleThemeChange(e.target.value)}
            disabled={!selectedSpecialty || quota.isBlocked || pending}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#13A89E] focus:outline-none disabled:opacity-50"
          >
            <option value="">{t("selectAll")}</option>
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="focus-filter"
            className="text-xs font-semibold text-slate-600"
          >
            {t("filterFocus")}
          </label>
          <select
            id="focus-filter"
            value={selectedFocus}
            onChange={(e) => handleFocusChange(e.target.value)}
            disabled={!selectedTheme || quota.isBlocked || pending}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#13A89E] focus:outline-none disabled:opacity-50"
          >
            <option value="">{t("selectAll")}</option>
            {focuses.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="subfocus-filter"
            className="text-xs font-semibold text-slate-600"
          >
            {t("filterSubfocus")}
          </label>
          <select
            id="subfocus-filter"
            value={selectedSubfocus}
            onChange={(e) => setSelectedSubfocus(e.target.value)}
            disabled={!selectedFocus || quota.isBlocked || pending}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#13A89E] focus:outline-none disabled:opacity-50"
          >
            <option value="">{t("selectAll")}</option>
            {subfocuses.map((sf) => (
              <option key={sf.id} value={sf.id}>
                {sf.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-2">
        {activeSession ? (
          <div className="flex flex-col gap-2">
            <a
              href={
                quota.isBlocked
                  ? "#"
                  : `/${locale}/app/practice/${activeSession.id}`
              }
              aria-disabled={quota.isBlocked}
              className={`block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                quota.isBlocked
                  ? "pointer-events-none cursor-not-allowed bg-slate-200"
                  : "cursor-pointer bg-[#102A43] text-white hover:bg-[#1a3f60]"
              }`}
            >
              {t("resumePractice")}
            </a>
            <button
              onClick={handleStartPractice}
              disabled={quota.isBlocked || pending}
              className={`block w-full rounded-lg px-4 py-2 text-center text-xs font-semibold transition-colors ${
                quota.isBlocked || pending
                  ? "cursor-not-allowed bg-slate-100 text-slate-300"
                  : "cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {pending ? t("working") || "Cargando..." : t("startNewPractice")}
            </button>
          </div>
        ) : (
          <button
            onClick={handleStartPractice}
            disabled={quota.isBlocked || pending}
            className={`block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
              quota.isBlocked || pending
                ? "cursor-not-allowed bg-slate-200 text-slate-400"
                : "cursor-pointer bg-[#102A43] text-white hover:bg-[#1a3f60]"
            }`}
          >
            {pending ? t("working") || "Cargando..." : t("startPractice")}
          </button>
        )}
      </div>
    </div>
  );
}
