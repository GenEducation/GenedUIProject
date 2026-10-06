"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, Square, Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, Images, Play, AlertCircle } from "lucide-react";
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
import {
  ACTIVE_STATES,
  DELETABLE_STATES,
  SOURCE_STATE_LABELS,
  STARTABLE_STATES,
  type SourceState,
} from "../types/sources";

interface SubjectRegistryProps {
  onUploadClick: () => void;
}

/** While a run is queued or running, re-read the list this often. */
export const LIST_POLL_MS = 10_000;

const STATE_OPTIONS = [
  { value: "", label: "All Statuses" },
  ...(Object.entries(SOURCE_STATE_LABELS) as [SourceState, string][]).map(([value, label]) => ({ value, label })),
];

const STATE_CHIP: Record<SourceState, string> = {
  registered: "bg-[#1A3D2C]/5 text-[#1A3D2C]/60 border-[#1A3D2C]/10",
  queued: "bg-amber-50 text-amber-600 border-amber-200",
  running: "bg-amber-50 text-amber-600 border-amber-200",
  review_needed: "bg-sky-50 text-sky-700 border-sky-200",
  invalid: "bg-red-50 text-red-600 border-red-200",
  ready: "bg-[#D1E6D9]/30 text-[#1A3D2C] border-[#1A3D2C]/5",
  failed: "bg-red-50 text-red-600 border-red-200",
};

const inputClass =
  "w-full px-3 py-2 bg-[#F8F9F8] border border-[#1A3D2C]/10 focus:border-[#1A3D2C]/40 rounded-xl text-xs font-bold text-[#1A3D2C] outline-none placeholder:text-[#1A3D2C]/30";

const labelClass = "text-[10px] font-black text-[#1A3D2C]/50 uppercase tracking-widest mb-1 block";

export function SubjectRegistry({ onUploadClick }: SubjectRegistryProps) {
  const subjects = usePartnerStore((state) => state.subjects);
  const isSubjectsLoading = usePartnerStore((state) => state.isSubjectsLoading);
  const fetchSubjects = usePartnerStore((state) => state.fetchSubjects);
  const removeSubject = usePartnerStore((state) => state.removeSubject);
  const cancelIngestion = usePartnerStore((state) => state.cancelIngestion);
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const visualsIndex = useVisualsIndex(subjects);
  const subjectNames = [...new Set(useTaxonomySubjects(resolveTaxonomyBoard()).map((s) => s.name))];

  // Local draft state for filter inputs — committed on Apply
  const [draft, setDraft] = useState<SubjectFilters>({});

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // The worker reports run state to the server; poll while any run is still going.
  const hasActiveRun = subjects.some((s) => ACTIVE_STATES.has(s.state));
  useEffect(() => {
    if (!hasActiveRun) return;
    const timer = setInterval(() => void fetchSubjects(), LIST_POLL_MS);
    return () => clearInterval(timer);
  }, [hasActiveRun, fetchSubjects]);

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
              ? "bg-[#1A3D2C] text-white border-[#1A3D2C]"
              : "bg-white text-[#1A3D2C]/60 border-[#1A3D2C]/10 hover:border-[#1A3D2C]/30"
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
          className="flex items-center justify-center gap-3 px-6 py-3 bg-[#1A3D2C] text-white rounded-2xl hover:bg-[#1A3D2C]/90 transition-all shadow-[0_8px_30px_rgba(26,61,44,0.2)] group"
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
            <div className="bg-[#FBFCFB] border border-[#1A3D2C]/5 rounded-[1.5rem] p-5">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                {/* Search */}
                <div className="lg:col-span-2">
                  <label className={labelClass}>Search</label>
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A3D2C]/30" />
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
                  className="flex items-center gap-1.5 px-4 py-2 text-[#1A3D2C]/50 hover:text-[#1A3D2C] text-xs font-bold transition-colors"
                >
                  <X size={12} />
                  Clear
                </button>
                <button
                  onClick={handleApply}
                  className="px-5 py-2 bg-[#1A3D2C] text-white text-xs font-bold rounded-xl hover:bg-[#1A3D2C]/90 transition-all"
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
            const explain = subject.detail && ["failed", "invalid", "review_needed"].includes(subject.state);

            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => openIngestedPdf(subject)}
                className="group relative flex items-center justify-between p-3 md:p-4 bg-white rounded-xl md:rounded-2xl border border-transparent hover:border-[#1A3D2C]/5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] transition-all overflow-hidden cursor-pointer"
              >
                <div className="flex-1 flex items-center gap-3 md:gap-4 min-w-0">
                  {/* Left Side Highlight bar */}
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#1A3D2C] opacity-0 group-hover:opacity-100 transition-opacity rounded-r-full" />

                  {/* Chapter Details */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-center justify-between pr-4 w-full gap-3">
                      {/* Left: Chapter, book & grade */}
                      <div className="flex flex-col gap-0.5 group-hover:translate-x-1 transition-transform w-[240px] md:w-[320px] shrink-0 min-w-0">
                        <h3 className="text-base md:text-lg font-bold text-[#1A3D2C] tracking-tight truncate">
                          {subject.title}
                        </h3>
                        <p className="text-[11px] font-bold text-[#1A3D2C]/50 ml-[2px] uppercase tracking-wider truncate">
                          {subject.book_title} · Ch {subject.chapter_ordinal} · Grade {subject.grade}
                        </p>
                        {explain && (
                          <p
                            className={`text-[11px] ml-[2px] truncate ${subject.state === "review_needed" ? "text-sky-700/80" : "text-red-600/80"}`}
                            title={subject.detail ?? undefined}
                          >
                            {subject.detail}
                          </p>
                        )}
                      </div>

                      {/* Middle: Subject */}
                      <div className="hidden sm:flex flex-1 items-center min-w-0">
                        <span className="text-sm font-bold text-[#1A3D2C]/70 bg-[#1A3D2C]/5 px-4 py-1.5 rounded-xl border border-[#1A3D2C]/10 truncate">
                          {subject.subject}
                        </span>
                      </div>

                      {/* Right: State & Actions */}
                      <div className="flex shrink-0 items-center gap-3 ml-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap transition-colors ${STATE_CHIP[subject.state]}`}
                        >
                          {SOURCE_STATE_LABELS[subject.state]}
                        </span>

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

                {/* Progress bar while queued or running */}
                {isRunning && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#D1E6D9]/20 overflow-hidden">
                    <motion.div
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="h-full w-1/2 bg-[#1A3D2C]"
                    />
                  </div>
                )}

              </motion.div>
            );
          })}
          </div>
        </div>

        {/* Pagination */}
        {total_count > 0 && (
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#1A3D2C]/5">
            <span className="text-[11px] font-bold text-[#1A3D2C]/40">
              {offset + 1}–{Math.min(offset + limit, total_count)} of {total_count}
            </span>
            <div className="flex items-center gap-1">
              <Button iconOnly size="sm" variant="tertiary" aria-label="Previous page" onClick={handlePrev} disabled={offset === 0}>
                <ChevronLeft size={16} />
              </Button>
              <span className="text-[11px] font-bold text-[#1A3D2C]/60 px-2">
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
