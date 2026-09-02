"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type {
  SupportedLocale,
} from "@/modules/identity";
import type {
  Question,
  QuestionVersion,
  QuestionImage,
  TaxonomyNode,
  QuestionType,
} from "@/modules/content";
import {
  SubmitForReviewButton,
  CreateDraftButton,
  AnnulButton,
} from "./backoffice-client-helpers";

export interface QuestionWithVersions {
  question: Question;
  versions: Array<QuestionVersion & { images: QuestionImage[] }>;
}

interface BackofficeQuestionListProps {
  initialQuestions: QuestionWithVersions[];
  taxonomyNodes: TaxonomyNode[];
  locale: SupportedLocale;
  isEditor: boolean;
  isReviewer: boolean;
}

export function BackofficeQuestionList({
  initialQuestions,
  taxonomyNodes,
  locale,
  isEditor,
  isReviewer,
}: BackofficeQuestionListProps) {
  const t = useTranslations("backoffice");

  // Resilient translation helper with language fallback in case Next.js dev server has cached older translations
  const tr = useCallback(
    (
      key: string,
      ptFallback: string,
      esFallback: string,
      values?: Record<string, string | number>,
    ) => {
      try {
        const hasFn = (t as unknown as { has?: (k: string) => boolean }).has;
        if (typeof hasFn === "function") {
          if (hasFn.call(t, key)) {
            return t(key, values);
          }
        } else {
          return t(key, values);
        }
      } catch {
        // Catch any MISSING_MESSAGE error thrown by next-intl
      }
      return locale === "pt-BR" ? ptFallback : esFallback;
    },
    [t, locale],
  );

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial states from URL search params
  const urlQ = searchParams.get("q") || "";
  const urlType = (searchParams.get("type") as "all" | QuestionType) || "all";
  const urlSpecialty = searchParams.get("specialty") || "";
  const urlTheme = searchParams.get("theme") || "";
  const urlFocus = searchParams.get("focus") || "";

  // Local state for instantaneous filtering
  const [searchTerm, setSearchTerm] = useState(urlQ);
  const [selectedType, setSelectedType] = useState<"all" | QuestionType>(urlType);
  const [selectedSpecialty, setSelectedSpecialty] = useState(urlSpecialty);
  const [selectedTheme, setSelectedTheme] = useState(urlTheme);
  const [selectedFocus, setSelectedFocus] = useState(urlFocus);

  // Track previous URL params to adjust state if external navigation occurs (e.g. browser back/forward)
  const [prevUrl, setPrevUrl] = useState({
    q: urlQ,
    type: urlType,
    specialty: urlSpecialty,
    theme: urlTheme,
    focus: urlFocus,
  });

  if (
    prevUrl.q !== urlQ ||
    prevUrl.type !== urlType ||
    prevUrl.specialty !== urlSpecialty ||
    prevUrl.theme !== urlTheme ||
    prevUrl.focus !== urlFocus
  ) {
    setPrevUrl({
      q: urlQ,
      type: urlType,
      specialty: urlSpecialty,
      theme: urlTheme,
      focus: urlFocus,
    });
    setSearchTerm(urlQ);
    setSelectedType(urlType);
    setSelectedSpecialty(urlSpecialty);
    setSelectedTheme(urlTheme);
    setSelectedFocus(urlFocus);
  }

  // Helper to update URL search params
  const updateUrl = useCallback(
    (newParams: Record<string, string | null>) => {
      const current = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(newParams)) {
        if (!value || value === "all") {
          current.delete(key);
        } else {
          current.set(key, value);
        }
      }
      const queryString = current.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [searchParams, pathname, router],
  );

  // Debounce search input update to URL
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm.trim() !== urlQ) {
        updateUrl({ q: searchTerm.trim() || null });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, urlQ, updateUrl]);

  // Taxonomy trees & options
  const specialties = useMemo(
    () => taxonomyNodes.filter((n) => n.level === "specialty"),
    [taxonomyNodes],
  );

  const themes = useMemo(
    () =>
      selectedSpecialty
        ? taxonomyNodes.filter(
            (n) => n.level === "theme" && n.parentId === selectedSpecialty,
          )
        : [],
    [taxonomyNodes, selectedSpecialty],
  );

  const focuses = useMemo(
    () =>
      selectedTheme
        ? taxonomyNodes.filter(
            (n) => n.level === "focus" && n.parentId === selectedTheme,
          )
        : [],
    [taxonomyNodes, selectedTheme],
  );

  // Precompute map of parentId -> childIds for fast taxonomy subtree lookup
  const taxonomyChildrenMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const node of taxonomyNodes) {
      if (node.parentId) {
        const existing = map.get(node.parentId) || [];
        existing.push(node.id);
        map.set(node.parentId, existing);
      }
    }
    return map;
  }, [taxonomyNodes]);

  // Function to gather all descendant node IDs + target node ID
  const getSubtreeNodeIds = useCallback(
    (rootNodeId: string): Set<string> => {
      const set = new Set<string>([rootNodeId]);
      const queue = [rootNodeId];
      while (queue.length > 0) {
        const current = queue.shift()!;
        const children = taxonomyChildrenMap.get(current);
        if (children) {
          for (const childId of children) {
            if (!set.has(childId)) {
              set.add(childId);
              queue.push(childId);
            }
          }
        }
      }
      return set;
    },
    [taxonomyChildrenMap],
  );

  // Deepest selected taxonomy node
  const activeTaxonomyNodeId = selectedFocus || selectedTheme || selectedSpecialty;

  const validTaxonomyIds = useMemo(() => {
    if (!activeTaxonomyNodeId) return null;
    return getSubtreeNodeIds(activeTaxonomyNodeId);
  }, [activeTaxonomyNodeId, getSubtreeNodeIds]);

  // Filter questions
  const filteredQuestions = useMemo(() => {
    return initialQuestions.filter(({ question, versions }) => {
      const latestVersion = versions[0];

      // Filter by type
      if (selectedType !== "all") {
        if (!latestVersion || latestVersion.type !== selectedType) {
          return false;
        }
      }

      // Filter by taxonomy
      if (validTaxonomyIds) {
        if (
          !latestVersion ||
          !latestVersion.taxonomyNodeId ||
          !validTaxonomyIds.has(latestVersion.taxonomyNodeId)
        ) {
          return false;
        }
      }

      // Filter by search query (id or title)
      const q = searchTerm.trim().toLowerCase();
      if (q) {
        const idMatches = question.id.toLowerCase().includes(q);
        const titleMatches =
          latestVersion?.title?.toLowerCase().includes(q) ?? false;

        if (!idMatches && !titleMatches) {
          return false;
        }
      }

      return true;
    });
  }, [initialQuestions, selectedType, validTaxonomyIds, searchTerm]);

  // Handlers for taxonomy changes
  const handleSpecialtyChange = (specialtyId: string) => {
    setSelectedSpecialty(specialtyId);
    setSelectedTheme("");
    setSelectedFocus("");
    updateUrl({
      specialty: specialtyId || null,
      theme: null,
      focus: null,
    });
  };

  const handleThemeChange = (themeId: string) => {
    setSelectedTheme(themeId);
    setSelectedFocus("");
    updateUrl({
      theme: themeId || null,
      focus: null,
    });
  };

  const handleFocusChange = (focusId: string) => {
    setSelectedFocus(focusId);
    updateUrl({
      focus: focusId || null,
    });
  };

  const handleTypeChange = (type: "all" | QuestionType) => {
    setSelectedType(type);
    updateUrl({ type: type === "all" ? null : type });
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedType("all");
    setSelectedSpecialty("");
    setSelectedTheme("");
    setSelectedFocus("");
    updateUrl({
      q: null,
      type: null,
      specialty: null,
      theme: null,
      focus: null,
    });
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
      selectedType !== "all" ||
      selectedSpecialty ||
      selectedTheme ||
      selectedFocus,
  );

  // Helper to build taxonomy breadcrumb path
  const getTaxonomyPath = (nodeId: string): string => {
    const path: string[] = [];
    let currentId: string | null = nodeId;
    const maxDepth = 10;
    let depth = 0;

    while (currentId && depth < maxDepth) {
      const node = taxonomyNodes.find((n) => n.id === currentId);
      if (!node) break;
      path.unshift(node.name);
      currentId = node.parentId;
      depth++;
    }

    return path.join(" > ");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Filter Panel */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Top row: Search input + Question type pills */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={tr(
                "searchPlaceholder",
                "Buscar por título ou ID da questão...",
                "Buscar por título o ID de pregunta...",
              )}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-10 pl-10 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  updateUrl({ q: null });
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                title="Limpar busca"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Question Type segmented buttons */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => handleTypeChange("all")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                selectedType === "all"
                  ? "bg-white text-[#102A43] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tr("filterTypeAll", "Todas", "Todas")}
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("multiple_choice")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                selectedType === "multiple_choice"
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tr("filterTypeMultipleChoice", "Múltipla Escolha", "Opción Múltiple")}
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("open_ended")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                selectedType === "open_ended"
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tr("filterTypeOpenEnded", "Discursiva", "Discursiva")}
            </button>
          </div>
        </div>

        {/* Bottom row: Cascading taxonomy dropdowns */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label
              htmlFor="taxonomy-specialty"
              className="mb-1 block text-xs font-semibold text-slate-500"
            >
              {tr("specialty", "Especialidade", "Especialidad")}
            </label>
            <select
              id="taxonomy-specialty"
              value={selectedSpecialty}
              onChange={(e) => handleSpecialtyChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">
                {tr("allSpecialties", "Todas as especialidades", "Todas las especialidades")}
              </option>
              {specialties.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="taxonomy-theme"
              className="mb-1 block text-xs font-semibold text-slate-500"
            >
              {tr("theme", "Tema", "Tema")}
            </label>
            <select
              id="taxonomy-theme"
              value={selectedTheme}
              onChange={(e) => handleThemeChange(e.target.value)}
              disabled={!selectedSpecialty || themes.length === 0}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 transition-colors disabled:opacity-50 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">
                {tr("allThemes", "Todos os temas", "Todos los temas")}
              </option>
              {themes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="taxonomy-focus"
              className="mb-1 block text-xs font-semibold text-slate-500"
            >
              {tr("focus", "Foco", "Foco")}
            </label>
            <select
              id="taxonomy-focus"
              value={selectedFocus}
              onChange={(e) => handleFocusChange(e.target.value)}
              disabled={!selectedTheme || focuses.length === 0}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 transition-colors disabled:opacity-50 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">
                {tr("allFocuses", "Todos os focos", "Todos los focos")}
              </option>
              {focuses.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Feedback: Count + Reset button */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>
            {tr(
              "resultsCount",
              `Mostrando ${filteredQuestions.length} de ${initialQuestions.length} questões`,
              `Mostrando ${filteredQuestions.length} de ${initialQuestions.length} preguntas`,
              {
                filtered: filteredQuestions.length,
                total: initialQuestions.length,
              },
            )}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 font-semibold text-teal-600 transition-colors hover:text-teal-700 hover:underline"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {tr("clearFilters", "Limpar filtros", "Limpiar filtros")}
            </button>
          )}
        </div>
      </div>

      {/* Questions list */}
      {initialQuestions.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-slate-400 shadow-sm">
          <p className="text-base italic">
            {tr("noQuestions", "Nenhuma questão cadastrada.", "No hay preguntas registradas.")}
          </p>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <p className="text-base font-semibold text-slate-700">
            {tr(
              "noResultsFound",
              "Nenhuma questão encontrada com os filtros selecionados.",
              "No se encontraron preguntas con los filtros seleccionados.",
            )}
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="mt-3 inline-flex items-center rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 transition-colors hover:bg-teal-100"
          >
            {tr("clearFilters", "Limpar filtros", "Limpiar filtros")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {filteredQuestions.map(({ question, versions }) => {
            const activeVersion = versions.find(
              (v) => v.id === question.publishedVersionId,
            );
            // Latest version (highest versionNumber)
            const latestVersion = versions[0];

            return (
              <div
                key={question.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-4">
                    {latestVersion?.images && latestVersion.images.length > 0 && (
                      <div className="relative flex h-16 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={latestVersion.images[0].url}
                          alt="Miniatura da questão"
                          className="max-h-full max-w-full object-contain"
                        />
                        {latestVersion.images.length > 1 && (
                          <span className="py-0.2 absolute right-0.5 bottom-0.5 rounded bg-slate-900/60 px-1 text-[8px] font-bold text-white">
                            +{latestVersion.images.length - 1}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-600">
                          ID: {question.id}
                        </span>
                        {latestVersion && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-slate-600 uppercase">
                            {latestVersion.type === "open_ended"
                              ? "Discursiva"
                              : "Múltipla Escolha"}
                          </span>
                        )}
                        {latestVersion?.type === "open_ended" &&
                          latestVersion.subquestions &&
                          latestVersion.subquestions.length > 0 && (
                            <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-teal-700 uppercase">
                              {latestVersion.subquestions.length}{" "}
                              {latestVersion.subquestions.length === 1
                                ? "subpergunta"
                                : "subperguntas"}
                            </span>
                          )}
                        {activeVersion && (
                          <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            Publicada: v{activeVersion.versionNumber}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-[#102A43]">
                        {latestVersion?.title || "Sem título"}
                      </h3>
                      {latestVersion && (
                        <p className="text-xs text-slate-400">
                          Taxonomia:{" "}
                          {getTaxonomyPath(latestVersion.taxonomyNodeId)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isEditor &&
                      activeVersion &&
                      !versions.some(
                        (v) => v.status === "draft" || v.status === "in_review",
                      ) && (
                        <CreateDraftButton
                          locale={locale}
                          questionId={question.id}
                        />
                      )}
                    {isReviewer &&
                      activeVersion &&
                      activeVersion.status !== "annulled" && (
                        <AnnulButton
                          locale={locale}
                          questionId={question.id}
                        />
                      )}
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="mb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
                    Histórico de Versões
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead>
                        <tr className="text-left text-xs font-bold text-slate-400 uppercase">
                          <th className="py-2 pr-4">Versão</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Data Criada</th>
                          <th className="py-2 pl-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {versions.map((v) => {
                          let badgeClass =
                            "bg-slate-100 text-slate-600 border-slate-200";
                          if (v.status === "published") {
                            badgeClass =
                              "bg-emerald-50 text-emerald-700 border-emerald-200";
                          } else if (v.status === "in_review") {
                            badgeClass =
                              "bg-amber-50 text-amber-700 border-amber-200";
                          } else if (v.status === "annulled") {
                            badgeClass =
                              "bg-rose-50 text-rose-700 border-rose-200";
                          }

                          return (
                            <tr key={v.id} className="hover:bg-slate-50/50">
                              <td className="py-3 pr-4 font-semibold text-slate-700">
                                v{v.versionNumber}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}
                                >
                                  {v.status === "draft" && "Rascunho"}
                                  {v.status === "in_review" && "Em Revisão"}
                                  {v.status === "published" && "Publicada"}
                                  {v.status === "annulled" && "Anulada"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {new Date(v.createdAt).toLocaleDateString(
                                  locale === "pt-BR" ? "pt-BR" : "es-ES",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </td>
                              <td className="space-x-2 py-3 pl-4 text-right">
                                {v.status === "draft" && isEditor && (
                                  <>
                                    <Link
                                      href={`/app/backoffice/editar?versionId=${v.id}`}
                                      className="inline-flex rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                    >
                                      Editar Rascunho
                                    </Link>
                                    <SubmitForReviewButton
                                      locale={locale}
                                      versionId={v.id}
                                    />
                                  </>
                                )}
                                {v.status === "in_review" && isReviewer && (
                                  <Link
                                    href={`/app/backoffice/revisar/${v.id}`}
                                    className="inline-flex rounded bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-500"
                                  >
                                    Revisar
                                  </Link>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
