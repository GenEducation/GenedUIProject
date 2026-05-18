"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, Square, Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePartnerStore, SubjectFilters } from "../store/usePartnerStore";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";

interface SubjectRegistryProps {
  onUploadClick: () => void;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "completed", label: "Active" },
  { value: "failed", label: "Failed" },
  { value: "in-progress", label: "Processing" },
];

const inputClass =
  "w-full px-3 py-2 bg-[#F8F9F8] border border-[#1A3D2C]/10 focus:border-[#1A3D2C]/40 rounded-xl text-xs font-bold text-[#1A3D2C] outline-none placeholder:text-[#1A3D2C]/30";

const labelClass = "text-[10px] font-black text-[#1A3D2C]/50 uppercase tracking-widest mb-1 block";

export function SubjectRegistry({ onUploadClick }: SubjectRegistryProps) {
  const subjects = usePartnerStore((state) => state.subjects);
  const fetchSubjects = usePartnerStore((state) => state.fetchSubjects);
  const removeSubject = usePartnerStore((state) => state.removeSubject);
  const cancelIngestion = usePartnerStore((state) => state.cancelIngestion);
  const setSubjectFilters = usePartnerStore((state) => state.setSubjectFilters);
  const setSubjectOffset = usePartnerStore((state) => state.setSubjectOffset);
  const subjectFilters = usePartnerStore((state) => state.subjectFilters);
  const subjectPagination = usePartnerStore((state) => state.subjectPagination);

  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Local draft state for filter inputs — committed on Apply
  const [draft, setDraft] = useState<SubjectFilters>({});

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

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
    if (deleteId) {
      await removeSubject(deleteId);
      setDeleteId(null);
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                {/* Search */}
                <div className="lg:col-span-2">
                  <label className={labelClass}>Search</label>
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A3D2C]/30" />
                    <input
                      type="text"
                      placeholder="Document title or file..."
                      value={draft.search ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value || undefined }))}
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className={labelClass}>Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. English"
                    value={draft.subject ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value || undefined }))}
                    className={inputClass}
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
                  <select
                    value={draft.status ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value || undefined }))}
                    className={`${inputClass} appearance-none cursor-pointer`}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* From Date */}
                <div>
                  <label className={labelClass}>From Date</label>
                  <input
                    type="date"
                    value={draft.from_date ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, from_date: e.target.value || undefined }))}
                    className={inputClass}
                  />
                </div>

                {/* To Date */}
                <div>
                  <label className={labelClass}>To Date</label>
                  <input
                    type="date"
                    value={draft.to_date ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, to_date: e.target.value || undefined }))}
                    className={inputClass}
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

      {/* Registry List */}
      <div className="flex-1 flex flex-col bg-[#FBFCFB] rounded-[2rem] md:rounded-[2.5rem] p-3 md:p-4 border border-gray-100/50 shadow-[0_8px_40px_rgba(0,0,0,0.02)] min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-hide pr-1 md:pr-2">
          <div className="space-y-2 md:space-y-3">
          {subjects.map((subject, i) => {
            const isActive = subject.status === "active";
            const isProcessing = subject.status === "in-progress";
            const isFailed = subject.status === "failed";

            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative flex items-center justify-between p-3 md:p-4 bg-white rounded-xl md:rounded-2xl border border-transparent hover:border-[#1A3D2C]/5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] transition-all cursor-pointer overflow-hidden"
              >
                <div className="flex-1 flex items-center gap-3 md:gap-4">
                  {/* Left Side Highlight bar */}
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#1A3D2C] opacity-0 group-hover:opacity-100 transition-opacity rounded-r-full" />

                  {/* Subject Details */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between pr-4 w-full">
                      {/* Left: Agent Name & Grade */}
                      <div className="flex flex-col gap-0.5 group-hover:translate-x-1 transition-transform w-[280px] md:w-[320px] shrink-0">
                        <h3 className="text-base md:text-lg font-bold text-[#1A3D2C] tracking-tight flex items-center gap-2">
                          {subject.agent}
                        </h3>
                        <p className="text-[11px] font-bold text-[#1A3D2C]/50 ml-[2px] uppercase tracking-wider">
                          Grade {subject.grade}
                        </p>
                      </div>

                      {/* Middle: Subject */}
                      <div className="hidden sm:flex flex-1 items-center">
                        <span className="text-sm font-bold text-[#1A3D2C]/70 bg-[#1A3D2C]/5 px-4 py-1.5 rounded-xl border border-[#1A3D2C]/10 capitalize">
                          {subject.subject}
                        </span>
                      </div>

                      {/* Right: Status & Actions */}
                      <div className="flex shrink-0 items-center gap-4 ml-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${
                            isActive ? "bg-[#D1E6D9]/30 text-[#1A3D2C] border-[#1A3D2C]/5" :
                            isProcessing ? "bg-amber-50 text-amber-600 border-amber-200" :
                            "bg-red-50 text-red-600 border-red-200"
                          }`}
                        >
                          {subject.status}
                        </span>

                        {isProcessing && (
                          <div className="flex items-center gap-2 mr-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelIngestion(subject.id);
                              }}
                              className="p-2 text-[#1A3D2C]/40 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all group/stop"
                              title="Stop Ingestion"
                            >
                              <Square size={14} className="fill-current group-hover/stop:scale-90 transition-transform" />
                            </button>
                          </div>
                        )}

                        {(isActive || isFailed) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(subject.id);
                            }}
                            className="p-2 text-[#1A3D2C]/20 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress bar for in-progress */}
                {isProcessing && (
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
              <button
                onClick={handlePrev}
                disabled={offset === 0}
                className="p-1.5 rounded-xl text-[#1A3D2C]/40 hover:text-[#1A3D2C] hover:bg-[#1A3D2C]/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[11px] font-bold text-[#1A3D2C]/60 px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={handleNext}
                disabled={offset + limit >= total_count}
                className="p-1.5 rounded-xl text-[#1A3D2C]/40 hover:text-[#1A3D2C] hover:bg-[#1A3D2C]/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Curriculum?"
        message="This will permanently remove this subject and all associated learning materials from your registry."
      />
    </div>
  );
}
