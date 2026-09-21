"use client";

import { useState, useRef, useEffect } from "react";
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
  availableYears?: number[];
  availableInstitutions?: string[];
}

export function PracticeFilters({
  taxonomyNodes,
  quota,
  activeSession,
  availableYears = [],
  availableInstitutions = ["INEP"],
}: PracticeFiltersProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const router = useRouter();

  // Taxonomy states
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("");
  const [selectedFocus, setSelectedFocus] = useState("");
  const [selectedSubfocus, setSelectedSubfocus] = useState("");

  // Year & Institution states
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState("");

  const yearDropdownRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // Close year dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        yearDropdownRef.current &&
        !yearDropdownRef.current.contains(event.target as Node)
      ) {
        setIsYearDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  const toggleYear = (year: number) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year],
    );
    setError("");
  };

  const handleSelectAllYears = () => {
    setSelectedYears(availableYears);
    setError("");
  };

  const handleClearYears = () => {
    setSelectedYears([]);
    setError("");
  };

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
      const result = await startPracticeSessionAction(
        locale,
        activeNodeId,
        selectedYears.length > 0 ? selectedYears : undefined,
        selectedInstitution || undefined,
      );
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

  const yearSummaryText =
    selectedYears.length === 0 || selectedYears.length === availableYears.length
      ? t("allYears")
      : t("yearsCount", { count: selectedYears.length });

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
            {themes.map((th) => (
              <option key={th.id} value={th.id}>
                {th.name}
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

        {/* Year Multi-select Filter */}
        <div className="relative flex flex-col gap-1.5" ref={yearDropdownRef}>
          <label className="text-xs font-semibold text-slate-600">
            {t("filterYears")}
          </label>
          <button
            type="button"
            onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
            disabled={quota.isBlocked || pending}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:border-slate-300 focus:border-[#13A89E] focus:outline-none disabled:opacity-50"
          >
            <span className="truncate">{yearSummaryText}</span>
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform ${isYearDropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isYearDropdownOpen && (
            <div className="absolute top-full z-30 mt-1 flex max-h-60 w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllYears}
                  className="font-medium text-[#13A89E] hover:underline"
                >
                  {t("selectAll")}
                </button>
                <button
                  type="button"
                  onClick={handleClearYears}
                  className="font-medium text-slate-500 hover:text-slate-700"
                >
                  {t("clearAll")}
                </button>
              </div>

              <div className="overflow-y-auto p-1">
                {availableYears.length > 0 ? (
                  availableYears.map((yr) => {
                    const isChecked = selectedYears.includes(yr);
                    return (
                      <label
                        key={yr}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleYear(yr)}
                          className="h-4 w-4 rounded border-slate-300 text-[#13A89E] focus:ring-[#13A89E]"
                        />
                        <span>{yr}</span>
                      </label>
                    );
                  })
                ) : (
                  <p className="p-3 text-center text-xs text-slate-400">
                    {t("allYears")}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Institution Filter */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="institution-filter"
            className="text-xs font-semibold text-slate-600"
          >
            {t("filterInstitution")}
          </label>
          <select
            id="institution-filter"
            value={selectedInstitution}
            onChange={(e) => {
              setSelectedInstitution(e.target.value);
              setError("");
            }}
            disabled={quota.isBlocked || pending}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#13A89E] focus:outline-none disabled:opacity-50"
          >
            <option value="">{t("allInstitutions")}</option>
            {availableInstitutions.map((inst) => (
              <option key={inst} value={inst}>
                {inst}
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
