"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, Square, Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, Images, Play, AlertCircle, FileText, HelpCircle, ShieldCheck } from "lucide-react";
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
import {
  ACTIVE_STATES,
  DELETABLE_STATES,
  SOURCE_STATE_LABELS,
  STARTABLE_STATES,
  type SourceState,
} from "../types/sources";
import { activeStatus, shownPercent } from "../utils/ingestionProgress";

interface SubjectRegistryProps {
  onUploadClick: () => void;
}

/** While a run is only queued, re-read the list this often. */
export const LIST_POLL_MS = 10_000;
/** While a run is processing, this often: the backend reports progress every couple of seconds. */
export const RUN_POLL_MS = 4_000;

const STATE_OPTIONS = [
  { value: "", label: "All Statuses" },
  ...(Object.entries(SOURCE_STATE_LABELS) as [SourceState, string][]).map(([value, label]) => ({ value, label })),
];

const STATE_CHIP: Record<SourceState, string> = {
  registered: "bg-[#075E63]/5 text-[#122D30]/60 border-[#122D30]/10",
  queued: "bg-amber-50 text-amber-600 border-amber-200",
  running: "bg-[#075E63]/10 text-[#075E63] border-[#075E63]/20",
  review_needed: "bg-sky-50 text-sky-700 border-sky-200",
  invalid: "bg-red-50 text-red-600 border-red-200",
  ready: "bg-[#DCEBE7]/30 text-[#122D30] border-[#122D30]/5",
  failed: "bg-red-50 text-red-600 border-red-200",
};

const inputClass =
  "w-full px-3 py-2 bg-[#F6F7F2] border border-[#122D30]/10 focus:border-[#122D30]/40 rounded-xl text-xs font-bold text-[#122D30] outline-none placeholder:text-[#122D30]/30";

const labelClass = "text-[10px] font-black text-[#122D30]/50 uppercase tracking-widest mb-1 block";

export function SubjectRegistry({ onUploadClick }: SubjectRegistryProps) {
  const subjects = usePartnerStore((state) => state.subjects);
  const isSubjectsLoading = usePartnerStore((state) => state.isSubjectsLoading);
  const fetchSubjects = usePartnerStore((state) => state.fetchSubjects);
  const removeSubject = usePartnerStore((state) => state.removeSubject);
  const cancelIngestion = usePartnerStore((state) => state.cancelIngestion);
  const decideExcludedPages = usePartnerStore((state) => state.decideExcludedPages);
  const startIngestion = usePartnerStore((state) => state.startIngestion);
  const openIngestedPdf = usePartnerStore((state) => state.openIngestedPdf);
  const setSubjectFilters = usePartnerStore((state) => state.setSubjectFilters);
  const setSubjectOffset = usePartnerStore((state) => state.setSubjectOffset);
  const subjectFilters = usePartnerStore((state) => state.subjectFilters);
  const subjectPagination = usePartnerStore((state) => state.subjectPagination);

  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [visualsFor, setVisualsFor] = useState<Subject | null>(null);
  const [reportFor, setReportFor] = useState<Subject | null>(null);
  const [questionsFor, setQuestionsFor] = useState<Subject | null>(null);
  const [releaseFor, setReleaseFor] = useState<Subject | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
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
  useEffect(() => {
    if (!hasActiveRun) return;
    const timer = setInterval(() => void fetchSubjects(), hasRunningRun ? RUN_POLL_MS : LIST_POLL_MS);
    return () => clearInterval(timer);
  }, [hasActiveRun, hasRunningRun, fetchSubjects]);

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
    if (!deleteId) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await removeSubject(deleteId);
      setDeleteId(null);
    } catch (err) {
      setDeleteError(asError(err).message || "Failed to delete. Please try again.");
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
          onClick={onUploadClick}
          className="flex items-center justify-center gap-3 px-6 py-3 bg-[#075E63] text-white rounded-2xl hover:bg-[#075E63]/90 transition-all shadow-[0_8px_30px_rgba(18,45,48,0.2)] group"
        >
          <div className="bg-white/10 p-1 rounded-lg">
            <Plus size={18} />
          </div>
          <span className="text-sm font-bold tracking-tight">Upload Curriculum</span>
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
            <div className="bg-[#FBFCFB] border border-[#122D30]/5 rounded-[1.5rem] p-5">
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
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={handleClear}
                  className="flex items-center gap-1.5 px-4 py-2 text-[#122D30]/50 hover:text-[#122D30] text-xs font-bold transition-colors"
                >
                  <X size={12} />
                  Clear
                </button>
                <button
                  onClick={handleApply}
                  className="px-5 py-2 bg-[#075E63] text-white text-xs font-bold rounded-xl hover:bg-[#075E63]/90 transition-all"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            const explain = subject.detail && ["failed", "invalid", "review_needed"].includes(subject.state) && !awaitingAnswers;
            const status = activeStatus(subject.state, subject.progress);
            const percent = shownPercent(subject.state, subject.progress);

            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => openIngestedPdf(subject)}
                className="group relative flex items-center justify-between p-3 md:p-4 bg-white rounded-xl md:rounded-2xl border border-transparent hover:border-[#122D30]/5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] transition-all overflow-hidden cursor-pointer"
              >
                <div className="flex-1 flex items-center gap-3 md:gap-4 min-w-0">
                  {/* Left Side Highlight bar */}
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#075E63] opacity-0 group-hover:opacity-100 transition-opacity rounded-r-full" />

                  {/* Chapter Details */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-center justify-between pr-4 w-full gap-3">
                      {/* Left: Chapter, book & grade */}
                      <div className="flex flex-col gap-0.5 group-hover:translate-x-1 transition-transform w-[240px] md:w-[320px] shrink-0 min-w-0">
                        <h3 className="text-base md:text-lg font-bold text-[#122D30] tracking-tight truncate">
                          {subject.title}
                        </h3>
                        <p className="text-[11px] font-bold text-[#122D30]/50 ml-[2px] uppercase tracking-wider truncate">
                          {subject.book_title} · Ch {subject.chapter_ordinal} · Grade {subject.grade}
                        </p>
                        {status && (
                          <p
                            role="status"
                            className={`flex items-center gap-1.5 text-[11px] font-semibold ml-[2px] min-w-0 ${subject.state === "running" ? "text-[#075E63]" : "text-amber-700/80"}`}
                          >
                            <span
                              aria-hidden
                              className={`h-1.5 w-1.5 shrink-0 rounded-full motion-safe:animate-pulse ${subject.state === "running" ? "bg-[#075E63]" : "bg-amber-500"}`}
                            />
                            <span className="truncate">{status.line}</span>
                            {status.step && <span className="shrink-0 text-[#122D30]/40">· {status.step}</span>}
                          </p>
                        )}
                        {explain && (
                          <p
                            className={`text-[11px] ml-[2px] truncate ${subject.state === "review_needed" ? "text-sky-700/80" : "text-red-600/80"}`}
                            title={subject.detail ?? undefined}
                          >
                            {subject.detail}
                          </p>
                        )}
                        {subject.has_report && (
                          // eslint-disable-next-line no-restricted-syntax -- inline text link under the title, not a sized action button
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setReportFor(subject); }}
                            className="self-start ml-[2px] mt-0.5 inline-flex items-center gap-1 text-[11px] font-black text-[#122D30] underline decoration-[#122D30]/30 underline-offset-2 hover:decoration-[#122D30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#122D30]/40 rounded"
                          >
                            <FileText size={12} aria-hidden /> {subject.state === "ready" ? "View report" : "See what needs fixing"}
                          </button>
                        )}
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

                      {/* Middle: Subject */}
                      <div className="hidden sm:flex flex-1 items-center min-w-0">
                        <span className="text-sm font-bold text-[#122D30]/70 bg-[#075E63]/5 px-4 py-1.5 rounded-xl border border-[#122D30]/10 truncate">
                          {subject.subject}
                        </span>
                      </div>

                      {/* Right: State & Actions */}
                      <div className="flex shrink-0 items-center gap-3 ml-4">
                        {awaitingAnswers ? (
                          <Button
                            size="sm"
                            pill
                            leadingIcon={<HelpCircle size={13} />}
                            onClick={(e) => { e.stopPropagation(); setQuestionsFor(subject); }}
                          >
                            {subject.questions === 1 ? "Answer 1 question" : `Answer ${subject.questions} questions`}
                          </Button>
                        ) : (
                          <span
                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap transition-colors ${STATE_CHIP[subject.state]}`}
                          >
                            {SOURCE_STATE_LABELS[subject.state]}
                            {percent !== null && <span className="ml-1 tabular-nums">{percent}%</span>}
                          </span>
                        )}

                        {subject.state === "ready" && (
                          <Button
                            size="sm"
                            pill
                            variant="secondary"
                            leadingIcon={<ShieldCheck size={13} />}
                            onClick={(e) => { e.stopPropagation(); setReleaseFor(subject); }}
                          >
                            Review &amp; publish
                          </Button>
                        )}

                        {STARTABLE_STATES.has(subject.state) && (
                          <Button
                            iconOnly
                            size="sm"
                            variant="outline"
                            aria-label={subject.state === "registered" ? "Start ingestion" : "Run ingestion again"}
                            title={subject.state === "registered" ? "Start ingestion" : "Run again"}
                            loading={busy}
                            onClick={(e) => { e.stopPropagation(); void runAction(subject, startIngestion); }}
                          >
                            <Play size={14} />
                          </Button>
                        )}

                        {subject.state === "queued" && (
                          <Button
                            iconOnly
                            size="sm"
                            variant="destructive"
                            aria-label="Stop Ingestion"
                            loading={busy}
                            onClick={(e) => { e.stopPropagation(); void runAction(subject, cancelIngestion); }}
                          >
                            <Square size={14} className="fill-current" />
                          </Button>
                        )}

                        {hasVisuals && (
                          <span className="relative inline-flex">
                            <Button
                              iconOnly
                              size="sm"
                              variant="outline"
                              aria-label={pendingVisuals > 0 ? `Review visuals (${pendingVisuals} to review)` : "Review visuals"}
                              title="Teaching visuals"
                              onClick={(e) => { e.stopPropagation(); setVisualsFor(subject); }}
                            >
                              <Images size={16} />
                            </Button>
                            {pendingVisuals > 0 && (
                              <span
                                aria-hidden
                                className="pointer-events-none absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                              >
                                {pendingVisuals}{visualsIndex.pendingFull ? "+" : ""}
                              </span>
                            )}
                          </span>
                        )}

                        {DELETABLE_STATES.has(subject.state) && (
                          <Button iconOnly size="sm" variant="destructive" aria-label="Delete" onClick={(e) => { e.stopPropagation(); setDeleteId(subject.id); }}>
                            <Trash2 size={18} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress bar while queued or running: the run's real percent once it reports one, a sweep until then */}
                {isRunning && (
                  <div
                    role="progressbar"
                    aria-label={`${subject.title} ingestion progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent ?? undefined}
                    aria-valuetext={percent !== null ? `${percent}%` : status?.line}
                    className={`absolute bottom-0 left-0 right-0 overflow-hidden ${percent !== null ? "h-1.5 bg-[#DCEBE7]/60" : "h-1 bg-[#DCEBE7]/20"}`}
                  >
                    {percent !== null ? (
                      <div
                        className="h-full rounded-r-full bg-[#075E63] transition-[width] duration-[1200ms] ease-out"
                        style={{ width: `${Math.max(percent, 2)}%` }}
                      />
                    ) : (
                      <motion.div
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        className={`h-full w-1/2 ${subject.state === "queued" ? "bg-amber-400" : "bg-[#075E63]"}`}
                      />
                    )}
                  </div>
                )}

              </motion.div>
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
        isOpen={!!deleteId}
        onClose={() => { setDeleteId(null); setDeleteError(null); }}
        onConfirm={handleDelete}
        title="Delete this chapter?"
        message="It will be removed from your registry. Only chapters that haven't produced reviewable content can be deleted."
        isLoading={isDeleting}
        error={deleteError}
      />

      {/* Reconciliation questions popup */}
      <SourceQuestionsModal
        subject={questionsFor}
        onClose={() => setQuestionsFor(null)}
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
      <SourceReportModal subject={reportFor} onClose={() => setReportFor(null)} />

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
