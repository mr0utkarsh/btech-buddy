import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  RotateCcw,
} from "lucide-react";
import { api } from "../lib/api";
import type {
  Paper,
  PaperListResponse,
  FilterOptions,
} from "../lib/types";
import { PaperCard } from "../components/PaperCard";
import { GridSkeleton } from "../components/Skeleton";
import { useToast } from "../context/ToastContext";
import { examTypeLabel } from "../lib/format";

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "downloads", label: "Most downloaded" },
  { value: "year", label: "Year (newest)" },
  { value: "year_asc", label: "Year (oldest)" },
  { value: "subject", label: "Subject A–Z" },
];

export function Browse() {
  const [params, setParams] = useSearchParams();
  const { error: toastError } = useToast();

  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [result, setResult] = useState<PaperListResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const q = params.get("q") || "";
  const institution = params.get("institution") || "";
  const branch = params.get("branch") || "";
  const specialization = params.get("specialization") || "";
  const semester = params.get("semester") || "";
  const examType = params.get("exam") || "";
  const year = params.get("year") || "";
  const sort = params.get("sort") || "newest";
  const page = Math.max(1, parseInt(params.get("page") || "1", 10));

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  const reset = () => {
    setParams(new URLSearchParams(), { replace: true });
  };

  // Load filter options once.
  useEffect(() => {
    let cancelled = false;
    api
      .get<FilterOptions>("/api/papers/filters")
      .then((data) => !cancelled && setFilters(data))
      .catch((e) =>
        !cancelled && toastError(e instanceof Error ? e.message : "Failed to load filters")
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [toastError]);

  // Load results whenever filters change.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (institution) query.set("institution_id", institution);
    if (branch) query.set("branch_id", branch);
    if (semester) query.set("semester", semester);
    if (examType) query.set("exam_type", examType);
    if (year) query.set("year", year);
    query.set("sort", sort);
    query.set("page", String(page));
    query.set("limit", "12");

    api
      .get<PaperListResponse>(`/api/papers?${query.toString()}`)
      .then((data) => {
        if (cancelled) return;
        // Defensive: never store a null/malformed envelope.
        if (data && Array.isArray((data as PaperListResponse).data)) {
          setResult(data);
        } else {
          setResult({ data: [], total: 0, page, limit: 12 });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setResult({ data: [], total: 0, page, limit: 12 });
          toastError(e instanceof Error ? e.message : "Failed to load papers");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q, institution, branch, semester, examType, year, sort, page, toastError]);

  const activeFilterCount = useMemo(
    () =>
      [institution, branch, semester, examType, year].filter(Boolean)
        .length,
    [institution, branch, semester, examType, year]
  );

  const totalPages = result
    ? Math.ceil(result.total / result.limit)
    : 0;

  const filterPanel = (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="f-institution"
          className="text-xs font-semibold uppercase tracking-wider text-fg-subtle"
        >
          University / Institution
        </label>
        <select
          id="f-institution"
          value={institution}
          onChange={(e) => setParam("institution", e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
        >
          <option value="">All institutions</option>
          {(filters?.institutions || []).map((inst) => (
            <option key={inst.id} value={inst.id}>
              {inst.short_name} ({inst.type})
              {inst.verified ? " ✓" : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="f-branch"
          className="text-xs font-semibold uppercase tracking-wider text-fg-subtle"
        >
          Branch
        </label>
        <select
          id="f-branch"
          value={branch}
          onChange={(e) => setParam("branch", e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
        >
          <option value="">All branches</option>
          {(filters?.branches || []).map((br) => (
            <option key={br.id} value={br.id}>
              {br.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="f-specialization"
          className="text-xs font-semibold uppercase tracking-wider text-fg-subtle"
        >
          Specialization
        </label>
        <select
          id="f-specialization"
          value={specialization}
          onChange={(e) => setParam("specialization", e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
        >
          <option value="">All specializations</option>
          {(filters?.specializations || []).map((sp) => (
            <option key={sp.id} value={sp.id}>
              {sp.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="f-semester"
          className="text-xs font-semibold uppercase tracking-wider text-fg-subtle"
        >
          Semester
        </label>
        <select
          id="f-semester"
          value={semester}
          onChange={(e) => setParam("semester", e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
        >
          <option value="">All semesters</option>
          {(filters?.semesters || []).map((s) => (
            <option key={s} value={s}>
              Semester {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="f-exam"
          className="text-xs font-semibold uppercase tracking-wider text-fg-subtle"
        >
          Exam type
        </label>
        <select
          id="f-exam"
          value={examType}
          onChange={(e) => setParam("exam", e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
        >
          <option value="">All exam types</option>
          {(filters?.exam_types || []).map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="f-year"
          className="text-xs font-semibold uppercase tracking-wider text-fg-subtle"
        >
          Year
        </label>
        <select
          id="f-year"
          value={year}
          onChange={(e) => setParam("year", e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
        >
          <option value="">All years</option>
          {(filters?.years || []).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={reset}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm font-medium text-fg-muted transition hover:bg-surface-2"
      >
        <RotateCcw className="h-4 w-4" />
        Reset filters
        {activeFilterCount > 0 && ` (${activeFilterCount})`}
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-fg sm:text-4xl">
          Browse Papers
        </h1>
        <p className="mt-1 text-fg-muted">
          {result ? (
            <>
              <span className="font-semibold text-fg">
                {result.total}
              </span>{" "}
              published paper{result.total === 1 ? "" : "s"} available
            </>
          ) : (
            "Search the complete question paper library"
          )}
        </p>
      </div>

      {/* Search row */}
      <div className="mb-6 flex gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem(
              "q"
            ) as HTMLInputElement;
            setParam("q", input.value.trim());
          }}
          className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-surface p-1.5 shadow-soft focus-within:border-accent"
          role="search"
        >
          <Search className="ml-2 h-5 w-5 shrink-0 text-fg-subtle" />
          <input
            name="q"
            key={q}
            defaultValue={q}
            placeholder="Search subject, paper code, university…"
            className="w-full bg-transparent px-1 py-2 text-sm outline-none placeholder:text-fg-subtle"
            aria-label="Search papers"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover"
          >
            Search
          </button>
        </form>
        <button
          className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-fg shadow-soft lg:hidden"
          onClick={() => setMobileFiltersOpen(true)}
          aria-label="Open filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-fg">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Quick exam-type chips (Mid-Sem / End-Sem) */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          Exam:
        </span>
        {[
          { value: "mid_sem", label: "Mid-Sem" },
          { value: "end_sem", label: "End-Sem" },
        ].map((chip) => {
          const active = examType === chip.value;
          return (
            <button
              key={chip.value}
              onClick={() => setParam("exam", active ? "" : chip.value)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                active
                  ? "border-accent bg-accent text-accent-fg shadow-soft"
                  : "border-line bg-surface text-fg-muted hover:border-accent hover:text-accent"
              }`}
              aria-pressed={active}
            >
              {chip.label}
            </button>
          );
        })}
        {examType && (
          <button
            onClick={() => setParam("exam", "")}
            className="flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg-subtle transition hover:bg-surface-2"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-fg">
              <SlidersHorizontal className="h-4 w-4 text-accent" />
              Filters
            </h2>
            {filterPanel}
          </div>
        </aside>

        {/* Mobile filter drawer */}
        {mobileFiltersOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[80] bg-scrim backdrop-blur-sm lg:hidden"
            onClick={() => setMobileFiltersOpen(false)}
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="h-full w-80 max-w-[85vw] overflow-y-auto bg-surface p-6 shadow-lift"
              role="dialog"
              aria-label="Filters"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">
                  Filters
                </h2>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="rounded-lg p-1.5 hover:bg-surface-2"
                  aria-label="Close filters"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {filterPanel}
            </motion.div>
          </motion.div>
        )}

        {/* Results */}
        <section aria-live="polite">
          {/* Sort */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              {q && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                  &ldquo;{q}&rdquo;
                  <button
                    onClick={() => setParam("q", "")}
                    aria-label="Remove search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              {activeFilterCount > 0 &&
                [
                  institution &&
                    filters?.institutions.find(
                      (i) => i.id === institution
                    )?.short_name,
                  branch &&
                    filters?.branches.find((b) => b.id === branch)
                      ?.name,
                  semester && `Sem ${semester}`,
                  examType && examTypeLabel(examType),
                  year && year,
                ]
                  .filter(Boolean)
                  .map((label, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-fg-muted"
                    >
                      {label}
                    </span>
                  ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setParam("sort", e.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
              aria-label="Sort results"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <GridSkeleton count={8} />
          ) : !result || (result.data || []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-14 text-center">
              <FileSearch className="mx-auto h-12 w-12 text-fg-muted" />
              <h3 className="mt-4 font-display text-lg font-semibold text-fg">
                No papers found
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-fg-subtle">
                Try removing some filters or broadening your search.
              </p>
              <button
                onClick={reset}
                className="mt-5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {(result.data || []).map((paper, i) => (
                  <PaperCard key={paper.id} paper={paper} index={i} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav
                  className="mt-8 flex items-center justify-center gap-2"
                  aria-label="Pagination"
                >
                  <button
                    disabled={page <= 1}
                    onClick={() => setParam("page", String(page - 1))}
                    className="flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-fg-muted transition hover:bg-surface-2 disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </button>
                  {Array.from({ length: totalPages })
                    .map((_, i) => i + 1)
                    .map((p) => (
                      <button
                        key={p}
                        onClick={() => setParam("page", String(p))}
                        className={`h-10 min-w-10 rounded-lg px-3 text-sm font-semibold transition ${
                          p === page
                            ? "bg-accent text-accent-fg"
                            : "border border-line bg-surface text-fg-muted hover:bg-surface-2"
                        }`}
                        aria-current={p === page ? "page" : undefined}
                      >
                        {p}
                      </button>
                    ))}
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setParam("page", String(page + 1))}
                    className="flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-fg-muted transition hover:bg-surface-2 disabled:opacity-40"
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
