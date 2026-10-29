"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, Square, Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, ChevronDown, Images, Play, RotateCw, AlertCircle, FileText, HelpCircle, ShieldCheck, Route, Upload, PenLine, PencilLine } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePartnerStore, SubjectFilters, type Subject } from "../store/usePartnerStore";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";
import { Skeleton } from "./Skeleton";
import { IngestedPdfViewer } from "./IngestedPdfViewer";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { resolveTaxonomyBoard, useTaxonomySubjects } from "@/features/subjects/subjectCatalog";
import { useVisualsIndex } from "../hooks/useVisualsIndex";
import { VisualsModal } from "./visuals/VisualsModal";
import { SourceReportModal } from "./SourceReportModal";
import { SourceQuestionsModal } from "./SourceQuestionsModal";
import { SourceReleaseModal } from "./SourceReleaseModal";
import { SourceAuthoringModal } from "./SourceAuthoringModal";
import { IngestionPathPanel } from "./IngestionPathPanel";
import { RunOutcome, RunProgress } from "./RunStatus";
import {
  ACTIVE_STATES,
  deleteBlockedReason,
  SOURCE_STATE_HINTS,
  SOURCE_STATE_LABELS,
  STARTABLE_STATES,
  type SourceState,
} from "../types/sources";
import { CORRECTION_STEPS, UPLOAD_STEPS } from "../utils/ingestionPath";
import { ChapterCorrectionModal } from "./ChapterCorrectionModal";

interface SubjectRegistryProps {
  /** Open the upload form; with a chapter, prefilled from it (the next step after a run that needs a new upload). */
  onUploadClick: (prefill?: Subject) => void;
}

/** While a run is only queued, re-read the list this often. */
export const LIST_POLL_MS = 10_000;
/** While a run is processing, this often: the backend reports progress every couple of seconds. */
export const RUN_POLL_MS = 4_000;

/**
 * Whether a row gets its start / retry / run-again button. With an outcome the server decides: `start` and `run_again`
 * (which is how a lost `running` run comes back) offer it, other steps keep the re-run of a finished run; never when
 * `can_run_again` is false. Without an outcome (an older server) the startable states decide.
 */
export function canRunFromRow(subject: Pick<Subject, "state" | "outcome">): boolean {
  const outcome = subject.outcome;
  if (!outcome) return STARTABLE_STATES.has(subject.state);
  if (!outcome.can_run_again) return false;
  return outcome.next_step === "run_again" || outcome.next_step === "start" || STARTABLE_STATES.has(subject.state);
}

const STATE_OPTIONS = [
  { value: "", label: "All Statuses" },
  ...(Object.entries(SOURCE_STATE_LABELS) as [SourceState, string][]).map(([value, label]) => ({
    value,
    label,
    hint: SOURCE_STATE_HINTS[value],
  })),
];

const inputClass =
  "w-full px-3 py-2 bg-[#F6F7F2] border border-[#122D30]/10 focus:border-[#122D30]/40 rounded-xl text-xs font-bold text-[#122D30] outline-none placeholder:text-[#122D30]/30";

const labelClass = "text-[10px] font-black text-[#122D30]/50 uppercase tracking-widest mb-1 block";

export function SubjectRegistry({ onUploadClick }: SubjectRegistryProps) {
  const subjects = usePartnerStore((state) => state.subjects);
  const isSubjectsLoading = usePartnerStore((state) => state.isSubjectsLoading);
  const fetchSubjects = usePartnerStore((state) => state.fetchSubjects);
  const subjectsError = usePartnerStore((state) => state.subjectsError);
  const subjectsFailures = usePartnerStore((state) => state.subjectsFailures);
  const removeSubject = usePartnerStore((state) => state.removeSubject);
  const cancelIngestion = usePartnerStore((state) => state.cancelIngestion);
  const decideExcludedPages = usePartnerStore((state) => state.decideExcludedPages);
  const startIngestion = usePartnerStore((state) => state.startIngestion);
  const openIngestedPdf = usePartnerStore((state) => state.openIngestedPdf);
  const setSubjectFilters = usePartnerStore((state) => state.setSubjectFilters);
  const setSubjectOffset = usePartnerStore((state) => state.setSubjectOffset);
  const subjectFilters = usePartnerStore((state) => state.subjectFilters);
  const subjectPagination = usePartnerStore((state) => state.subjectPagination);

  const [deleteFor, setDeleteFor] = React.useState<Subject | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [visualsFor, setVisualsFor] = useState<Subject | null>(null);
  const [reportFor, setReportFor] = useState<Subject | null>(null);
  const [questionsFor, setQuestionsFor] = useState<Subject | null>(null);
  const [authoringFor, setAuthoringFor] = useState<Subject | null>(null);
  const [correctionFor, setCorrectionFor] = useState<Subject | null>(null);
  const [releaseFor, setReleaseFor] = useState<Subject | null>(null);
  const [pathOpen, setPathOpen] = useState<ReadonlySet<string>>(new Set());
  const togglePath = (id: string) =>
    setPathOpen((open) => {
      const next = new Set(open);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // The chapter just uploaded: opened, scrolled to and marked for a few seconds, so its start is seen.
  const justUploadedId = usePartnerStore((state) => state.justUploadedId);
  const clearJustUploaded = usePartnerStore((state) => state.clearJustUploaded);
  const [freshId, setFreshId] = useState<string | null>(null);
  useEffect(() => {
    if (!justUploadedId || !subjects.some((s) => s.id === justUploadedId)) return;
    const id = justUploadedId;
    clearJustUploaded();
    setPathOpen((open) => new Set(open).add(id));
    setFreshId(id);
    requestAnimationFrame(() => document.querySelector(`[data-source-row="${CSS.escape(id)}"]`)?.scrollIntoView?.({ behavior: "smooth", block: "center" }));
    const timer = setTimeout(() => setFreshId(null), 4000);
    return () => clearTimeout(timer);
  }, [justUploadedId, subjects, clearJustUploaded]);
  const [actionError, setActionError] = useState<string | null>(null);
  const uploadNotice = usePartnerStore((state) => state.uploadNotice);

  const clearUploadNotice = usePartnerStore((state) => state.clearUploadNotice);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Re-running a chapter whose run produced results (ready / review_needed) needs a confirm: the new run
  // replaces them. A failed or invalid run has nothing to lose, so its Retry starts straight away.
  const [rerunFor, setRerunFor] = useState<Subject | null>(null);
  const visualsIndex = useVisualsIndex(subjects);
  const subjectNames = [...new Set(useTaxonomySubjects(resolveTaxonomyBoard()).map((s) => s.name))];

  // Local draft state for filter inputs — committed on Apply
  const [draft, setDraft] = useState<SubjectFilters>({});

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // The worker reports run state (and a running chapter's progress) to the server; poll while any run is still
  // going, faster while one is processing so its progress bar moves.
  const hasActiveRun = subjects.some((s) => ACTIVE_STATES.has(s.state));
  const hasRunningRun = subjects.some((s) => s.state === "running");
  // While reads fail, keep retrying even with no run going, so the banner clears once GenEd answers again.
  const retrying = subjectsError !== null;
  useEffect(() => {
    if (!hasActiveRun && !retrying) return;
    // A hidden tab skips its ticks; the next visible one catches up.
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void fetchSubjects({ background: true });
    }, hasRunningRun ? RUN_POLL_MS : LIST_POLL_MS);
    return () => clearInterval(timer);
  }, [hasActiveRun, hasRunningRun, retrying, fetchSubjects]);

  /** Start or stop a run, showing the server's reason when it doesn't fit (409). */
  const runAction = async (subject: Subject, action: (id: string) => Promise<void>) => {
    setBusyId(subject.id);
    setActionError(null);
    try {
      await action(subject.id);
    } catch (err) {
      setActionError(asError(err).message || "That didn't work. Please try again.");
      void fetchSubjects();
    } finally {
      setBusyId(null);
    }
  };

  // Re-fetch whenever offset changes (pagination)
  useEffect(() => {
    fetchSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectPagination.offset]);

  const handleApply = () => {
    setSubjectFilters(draft);
    // fetchSubjects reads from store, so wait for state flush via useEffect
  };

  // Trigger fetch after filters change in store
  useEffect(() => {
    fetchSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectFilters]);

  const handleClear = () => {
    setDraft({});
    setSubjectFilters({});
  };

  const handleDelete = async () => {
    if (!deleteFor) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await removeSubject(deleteFor.id);
      setDeleteFor(null);
    } catch (err) {
      // The server says why (a 409 names the chapter's state); the list may have moved on meanwhile.
      setDeleteError(asError(err).message || "Failed to delete. Please try again.");
      void fetchSubjects();
    } finally {
      setIsDeleting(false);
    }
  };

  const { total_count, limit, offset } = subjectPagination;
  const hasFilters = Object.values(subjectFilters).some((v) => v != null && v !== "");
  const totalPages = Math.ceil(total_count / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handlePrev = () => {
    if (offset > 0) setSubjectOffset(Math.max(0, offset - limit));
  };

  const handleNext = () => {
    if (offset + limit < total_count) setSubjectOffset(offset + limit);
  };

  return (
    <div className="flex-1 px-4 md:px-12 pt-8 md:pt-12 pb-8 bg-white flex flex-col min-h-0 overflow-hidden">
      {/* Actions Section */}
      <div className="flex items-center justify-between gap-3 mb-4 md:mb-5">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all ${
            showFilters || hasFilters
              ? "bg-[#075E63] text-white border-[#122D30]"
              : "bg-white text-[#122D30]/60 border-[#122D30]/10 hover:border-[#122D30]/30"
          }`}
        >
          <SlidersHorizontal size={14} />
          Filters
          {hasFilters && (
            <span className="bg-white/20 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
              ON
            </span>
          )}
        </button>

        <button
          onClick={() => onUploadClick()}
          className="flex shrink-0 items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 whitespace-nowrap bg-[#075E63] text-white rounded-2xl hover:bg-[#075E63]/90 transition-all shadow-[0_8px_30px_rgba(18,45,48,0.2)] group"
        >
          <div className="bg-white/10 p-1 rounded-lg">
            <Plus size={18} />
          </div>
          <span className="text-sm font-bold tracking-tight">Upload<span className="hidden sm:inline"> Curriculum</span></span>
        </button>
      </div>

      {/* Filter Bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* A form, so Enter in any field (a dropdown included) applies the filters. */}
            <form
              aria-label="Filters"
              className="bg-[#FBFCFB] border border-[#122D30]/5 rounded-[1.5rem] p-5"
              onSubmit={(e) => {
                e.preventDefault();
                handleApply();
              }}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                {/* Search */}
                <div className="lg:col-span-2">
                  <label className={labelClass}>Search</label>
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#122D30]/30" />
                    <input
                      type="text"
                      placeholder="Book or chapter title..."
                      value={draft.search ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value || undefined }))}
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className={labelClass}>Subject</label>
                  <Select
                    aria-label="Subject"
                    value={draft.subject ?? ""}
                    onChange={(v) => setDraft((d) => ({ ...d, subject: v || undefined }))}
                    options={[{ value: "", label: "All Subjects" }, ...subjectNames.map((name) => ({ value: name, label: name }))]}
                  />
                </div>

                {/* Grade */}
                <div>
                  <label className={labelClass}>Grade</label>
                  <input
                    type="number"
                    placeholder="e.g. 4"
                    min={1}
                    max={12}
                    value={draft.grade ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        grade: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                {/* Status */}
                <div>
                  <label className={labelClass}>Status</label>
                  <Select
                    aria-label="Status"
                    value={draft.state ?? ""}
                    onChange={(v) => setDraft((d) => ({ ...d, state: (v || undefined) as SourceState | undefined }))}
                    options={STATE_OPTIONS}
                    panelWidth={300}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1.5 px-4 py-2 text-[#122D30]/50 hover:text-[#122D30] text-xs font-bold transition-colors"
                >
                  <X size={12} />
                  Clear
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#075E63] text-white text-xs font-bold rounded-xl hover:bg-[#075E63]/90 transition-all"
                >
                  Apply Filters
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {subjectsError && (
        <div role="status" className="mb-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
          <AlertCircle size={14} className="shrink-0" aria-hidden />
          <span className="flex-1">Can&apos;t reach GenEd, retrying{subjectsFailures > 1 ? ` (${subjectsFailures} tries)` : ""}</span>
        </div>
      )}

      {uploadNotice && (
        <div role="status" className="mb-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
          <AlertCircle size={14} className="shrink-0" aria-hidden />
          <span className="flex-1">{uploadNotice}</span>
          <Button iconOnly size="sm" variant="tertiary" aria-label="Dismiss" onClick={clearUploadNotice}>
            <X size={14} />
          </Button>
        </div>
      )}

      {actionError && (
        <div role="alert" className="mb-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
          <AlertCircle size={14} className="shrink-0" aria-hidden />
          <span className="flex-1">{actionError}</span>
          <Button iconOnly size="sm" variant="tertiary" aria-label="Dismiss" onClick={() => setActionError(null)}>
            <X size={14} />
          </Button>
        </div>
      )}

      {/* Registry List */}
      <div className="flex-1 flex flex-col bg-[#FBFCFB] rounded-[2rem] md:rounded-[2.5rem] p-3 md:p-4 border border-gray-100/50 shadow-[0_8px_40px_rgba(0,0,0,0.02)] min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-hide pr-1 md:pr-2">
          <div className="space-y-2 md:space-y-3">
          {isSubjectsLoading && subjects.length === 0 && (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`skel-${i}`}
                className="flex items-center justify-between p-3 md:p-4 bg-white rounded-xl md:rounded-2xl"
              >
                <div className="flex-1 flex items-center gap-3 md:gap-4">
                  <div className="flex flex-col gap-1.5 w-[280px] md:w-[320px]">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="hidden sm:block h-7 w-24 rounded-xl" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
              </div>
            ))
          )}
          {subjects.map((subject, i) => {
            const isRunning = ACTIVE_STATES.has(subject.state);
            const visualCounts = visualsIndex.countsFor(subject);
            const hasVisuals = !!visualCounts && visualCounts.pending + visualCounts.accepted + visualCounts.rejected > 0;
            const pendingVisuals = visualCounts?.pending ?? 0;
            const busy = busyId === subject.id;
            // A chapter waiting on questions says so with its button; its raw detail names server paths.
            const awaitingAnswers = subject.state === "review_needed" && subject.questions > 0;
            // The server's next step; a re-run of an upload whose failed checks are the partner's would end the same way.
            const next = subject.outcome?.next_step ?? null;
            // The server decides: a lost `running` run comes back as `run_again`. Rows from a server without outcomes
            // fall back to the states a run can start from.
            const canRunAgain = canRunFromRow(subject);
            // A chapter the partner can complete with questions of their own offers that first; uploading stays in its path.
            const addQuestions = next === "add_questions";
            const needsCorrection = next !== null && CORRECTION_STEPS.has(next);
            const needsUpload = next !== null && UPLOAD_STEPS.has(next) && !addQuestions;
            const showPath = pathOpen.has(subject.id);
            // Published: live for students, nothing left to review (the server's next step is `none`).
            const live = subject.state === "ready" && subject.release?.state === "published";

            return (
              <React.Fragment key={subject.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => openIngestedPdf(subject)}
                data-source-row={subject.id}
                className={`@container/row group relative flex items-center justify-between p-3 md:p-4 bg-white rounded-xl md:rounded-2xl border ${freshId === subject.id ? "border-[#075E63]/40 ring-4 ring-[#075E63]/10" : "border-transparent"} hover:border-[#122D30]/5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] transition-all overflow-hidden cursor-pointer`}
              >
                <div className="flex-1 flex items-center gap-3 md:gap-4 min-w-0">
                  {/* Left Side Highlight bar */}
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#075E63] opacity-0 group-hover:opacity-100 transition-opacity rounded-r-full" />

                  {/* Chapter Details */}
                  <div className="flex-1 flex flex-col min-w-0">
                    {/* Laid out by the row's own width, not the window's (the sidebar takes a share of it): one line when
                        wide; the title beside its actions over the run when medium; stacked when narrow. */}
                    <div className="grid w-full items-center gap-x-5 gap-y-3 pr-1 md:pr-3 grid-cols-1 [grid-template-areas:'title'_'status'_'actions'] @[600px]/row:grid-cols-[minmax(0,1fr)_auto] @[600px]/row:[grid-template-areas:'title_actions'_'status_status'] @[1040px]/row:grid-cols-[minmax(240px,320px)_minmax(0,1fr)_auto] @[1040px]/row:[grid-template-areas:'title_status_actions']">
                      {/* Chapter, book & grade */}
                      <div className="flex flex-col gap-0.5 group-hover:translate-x-1 transition-transform min-w-0 [grid-area:title]">
                        <h3 className="text-base md:text-lg font-bold text-[#122D30] tracking-tight truncate">
                          {subject.title}
                        </h3>
                        <p className="text-[11px] lg:text-[12px] font-bold text-[#122D30]/50 ml-[2px] uppercase tracking-wider truncate">
                          {subject.book_title} · Ch {subject.chapter_ordinal} · Grade {subject.grade}
                          {/* Narrow rows have no room for the subject chip; it reads here instead. */}
                          <span className="@[600px]/row:hidden"> · {subject.subject}</span>
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            pill
                            aria-expanded={showPath}
                            aria-controls={`path-${subject.id}`}
                            leadingIcon={<Route size={14} aria-hidden />}
                            onClick={(e) => { e.stopPropagation(); togglePath(subject.id); }}
                          >
                            {showPath ? "Hide run details" : "Run details"}
                            <ChevronDown size={14} aria-hidden className={`transition-transform ${showPath ? "rotate-180" : ""}`} />
                          </Button>
                          {subject.has_report && (
                            <Button
                              size="sm"
                              variant="outline"
                              pill
                              leadingIcon={<FileText size={14} aria-hidden />}
                              onClick={(e) => { e.stopPropagation(); setReportFor(subject); }}
                            >
                              {subject.state === "ready" ? "Report" : "What needs fixing"}
                            </Button>
                          )}
                        </div>
                        {subject.excluded_pages?.status === "pending" && (
                          // The server cut a solutions appendix at upload; publishing waits until the partner answers.
                          <div
                            role="note"
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 ml-[2px] flex flex-wrap items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-2 py-1 text-[11px] text-amber-900"
                          >
                            <AlertCircle size={12} aria-hidden className="shrink-0" />
                            <span>
                              Pages {subject.excluded_pages.first_page}–{subject.excluded_pages.last_page} were left out:
                              they look like the chapter&apos;s solutions.
                            </span>
                            <Button
                              size="sm"
                              pill
                              variant="secondary"
                              loading={busy}
                              onClick={() => void runAction(subject, (id) => decideExcludedPages(id, "confirm"))}
                            >
                              Yes, leave them out
                            </Button>
                            <Button
                              size="sm"
                              pill
                              variant="outline"
                              disabled={busy || !STARTABLE_STATES.has(subject.state)}
                              title={STARTABLE_STATES.has(subject.state) ? undefined : "You can add them once this run finishes"}
                              onClick={() => void runAction(subject, (id) => decideExcludedPages(id, "include"))}
                            >
                              No, include them
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Subject, and the run: its phases while it runs, what it means once it has finished */}
                      <div className="flex min-w-0 items-center gap-4 @[1040px]/row:gap-6 [grid-area:status]">
                        <span title={subject.subject} className="hidden @[600px]/row:inline-block w-[128px] lg:w-[148px] shrink-0 text-center text-sm lg:text-[15px] font-bold text-[#122D30]/70 bg-[#075E63]/5 px-3 py-1.5 rounded-xl border border-[#122D30]/10 truncate">
                          {subject.subject}
                        </span>
                        <div className="min-w-0 flex-1">
                          {isRunning ? <RunProgress subject={subject} /> : <RunOutcome subject={subject} />}
                        </div>
                      </div>

                      {/* Actions (on one line, one minimum width, so every row's status starts at the same place; they wrap
                          rather than overflow when the row is narrow) */}
                      <div className="flex flex-wrap items-center justify-start gap-2.5 [grid-area:actions] @[600px]/row:justify-end @[1040px]/row:min-w-[240px]">
                        {/* The state itself is the middle's sentence; here only what can be done about it. */}
                        {awaitingAnswers && (
                          <Button
                            pill
                            leadingIcon={<HelpCircle size={16} />}
                            onClick={(e) => { e.stopPropagation(); setQuestionsFor(subject); }}
                          >
                            {subject.questions === 1 ? "Answer 1 question" : `Answer ${subject.questions} questions`}
                          </Button>
                        )}

                        {/* Only when the server says review is next (a ready run with blocking findings is not); a server
                            without outcomes falls back to an unpublished ready chapter. */}
                        {(subject.outcome ? next === "review_release" : subject.state === "ready" && !live) && (
                          <Button
                            pill
                            variant="secondary"
                            leadingIcon={<ShieldCheck size={16} />}
                            onClick={(e) => { e.stopPropagation(); setReleaseFor(subject); }}
                          >
                            Review &amp; publish
                          </Button>
                        )}

                        {addQuestions && (
                          <Button
                            pill
                            leadingIcon={<PenLine size={16} />}
                            onClick={(e) => { e.stopPropagation(); setAuthoringFor(subject); }}
                          >
                            Add questions
                          </Button>
                        )}

                        {needsCorrection && (
                          <Button
                            pill
                            leadingIcon={<PencilLine size={16} />}
                            onClick={(e) => { e.stopPropagation(); setCorrectionFor(subject); }}
                          >
                            Fix chapter details
                          </Button>
                        )}

                        {needsUpload && (
                          <Button
                            pill
                            leadingIcon={<Upload size={16} />}
                            onClick={(e) => { e.stopPropagation(); onUploadClick(subject); }}
                          >
                            Upload again
                          </Button>
                        )}

                        {canRunAgain && (
                          subject.state === "registered" ? (
                            <Button
                              iconOnly
                              variant="outline"
                              aria-label="Start ingestion"
                              title="Start ingestion"
                              loading={busy}
                              onClick={(e) => { e.stopPropagation(); void runAction(subject, startIngestion); }}
                            >
                              <Play size={18} />
                            </Button>
                          ) : subject.state === "failed" || subject.state === "invalid" || ACTIVE_STATES.has(subject.state) ? (
                            <Button
                              iconOnly
                              variant="outline"
                              aria-label="Retry ingestion"
                              title="Retry"
                              loading={busy}
                              onClick={(e) => { e.stopPropagation(); void runAction(subject, startIngestion); }}
                            >
                              <RotateCw size={18} />
                            </Button>
                          ) : (
                            <Button
                              iconOnly
                              variant="outline"
                              aria-label="Run ingestion again"
                              title="Run again"
                              loading={busy}
                              onClick={(e) => { e.stopPropagation(); setRerunFor(subject); }}
                            >
                              <RotateCw size={18} />
                            </Button>
                          )
                        )}

                        {subject.state === "queued" && (
                          <Button
                            iconOnly
                            variant="destructive"
                            aria-label="Stop Ingestion"
                            loading={busy}
                            onClick={(e) => { e.stopPropagation(); void runAction(subject, cancelIngestion); }}
                          >
                            <Square size={16} className="fill-current" />
                          </Button>
                        )}

                        {hasVisuals && (
                          <span className="relative inline-flex">
                            <Button
                              iconOnly
                              variant="outline"
                              aria-label={pendingVisuals > 0 ? `Review visuals (${pendingVisuals} to review)` : "Review visuals"}
                              title="Teaching visuals"
                              onClick={(e) => { e.stopPropagation(); setVisualsFor(subject); }}
                            >
                              <Images size={19} />
                            </Button>
                            {pendingVisuals > 0 && (
                              <span
                                aria-hidden
                                className="pointer-events-none absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                              >
                                {pendingVisuals}{visualsIndex.pendingMayBeMore(subject) ? "+" : ""}
                              </span>
                            )}
                          </span>
                        )}

                        {/* Every stage shows delete. Where the server would refuse (queued, running, published) it is
                            disabled with the reason; a refusal the list can't foresee still shows in the confirm. */}
                        {(() => {
                          const blocked = deleteBlockedReason(subject);
                          return (
                            // The tooltip sits on a wrapper: a disabled button gets no pointer events to show its own.
                            <span title={blocked ?? "Delete chapter"} className="inline-flex">
                              <Button
                                iconOnly
                                variant="destructive"
                                aria-label="Delete"
                                aria-description={blocked ?? undefined}
                                disabled={blocked !== null || (isDeleting && deleteFor?.id === subject.id)}
                                onClick={(e) => { e.stopPropagation(); setDeleteError(null); setDeleteFor(subject); }}
                              >
                                <Trash2 size={19} />
                              </Button>
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

              </motion.div>
              {showPath && (
                <div id={`path-${subject.id}`}>
                  <IngestionPathPanel
                    subject={subject}
                    onOpenReport={() => setReportFor(subject)}
                    onUploadAgain={() => onUploadClick(subject)}
                    onReviewVisuals={() => setVisualsFor(subject)}
                    onAddQuestions={() => setAuthoringFor(subject)}
                  />
                </div>
              )}
              </React.Fragment>
            );
          })}
          </div>
        </div>

        {/* Pagination */}
        {total_count > 0 && (
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#122D30]/5">
            <span className="text-[11px] font-bold text-[#122D30]/40">
              {offset + 1}–{Math.min(offset + limit, total_count)} of {total_count}
            </span>
            <div className="flex items-center gap-1">
              <Button iconOnly size="sm" variant="tertiary" aria-label="Previous page" onClick={handlePrev} disabled={offset === 0}>
                <ChevronLeft size={16} />
              </Button>
              <span className="text-[11px] font-bold text-[#122D30]/60 px-2">
                {currentPage} / {totalPages}
              </span>
              <Button iconOnly size="sm" variant="tertiary" aria-label="Next page" onClick={handleNext} disabled={offset + limit >= total_count}>
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deleteFor}
        onClose={() => { setDeleteFor(null); setDeleteError(null); }}
        onConfirm={handleDelete}
        title="Delete this chapter?"
        message={`"${deleteFor?.title ?? ""}" will be removed from your registry, with its uploaded PDF and run results.`}
        isLoading={isDeleting}
        error={deleteError}
      />

      {/* Re-run confirmation */}
      <DeleteConfirmationModal
        isOpen={!!rerunFor}
        onClose={() => setRerunFor(null)}
        onConfirm={() => {
          const subject = rerunFor;
          setRerunFor(null);
          if (subject) void runAction(subject, startIngestion);
        }}
        title="Run this chapter again?"
        message={`This starts a fresh ingestion run for "${rerunFor?.title ?? ""}". It can take a while, and it replaces the current results and report.`}
        confirmLabel="Run again"
        cancelLabel="Cancel"
        tone="caution"
        icon={RotateCw}
      />

      {/* Reconciliation questions popup */}
      <SourceQuestionsModal
        subject={questionsFor}
        onClose={() => setQuestionsFor(null)}
        onSaved={() => void fetchSubjects()}
        onRerun={(subject) => startIngestion(subject.id)}
      />

      {/* Correcting where a chapter sits, when core files it differently */}
      <ChapterCorrectionModal subject={correctionFor} onClose={() => setCorrectionFor(null)} />

      {/* Completing a chapter's questions (ADR 0036) */}
      <SourceAuthoringModal
        subject={authoringFor}
        onClose={() => setAuthoringFor(null)}
        onSaved={() => void fetchSubjects()}
        onRerun={(subject) => startIngestion(subject.id)}
      />

      {/* Review & publish popup */}
      <SourceReleaseModal
        subject={releaseFor}
        onClose={() => setReleaseFor(null)}
        onPublished={() => void fetchSubjects()}
        onRerun={(subject) => startIngestion(subject.id)}
      />

      {/* Ingestion report popup */}
      <SourceReportModal
        subject={reportFor}
        onClose={() => setReportFor(null)}
        onAddQuestions={setAuthoringFor}
        onUploadAgain={(subject) => onUploadClick(subject)}
        onReviewVisuals={setVisualsFor}
        onReviewRelease={setReleaseFor}
      />

      {/* Visual review popup */}
      <VisualsModal
        subject={visualsFor}
        counts={visualsFor ? visualsIndex.countsFor(visualsFor) : null}
        onClose={() => {
          setVisualsFor(null);
          void visualsIndex.refresh();
        }}
        onChanged={() => void visualsIndex.refresh()}
      />

      {/* Ingested PDF Viewer */}
      <IngestedPdfViewer />
    </div>
  );
}
