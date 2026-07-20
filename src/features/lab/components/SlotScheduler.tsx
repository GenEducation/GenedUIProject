"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Clock, Ban, PlayCircle, CalendarX2, FlaskConical } from "lucide-react";
import { useLabStore } from "../store/useLabStore";
import { OBJECTIVE_MODES, type ObjectiveMode, type SlotResponse } from "../types/lab";
import { ApiRequestError } from "@/utils/authFetch";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const statusStyles: Record<string, string> = {
  SCHEDULED: "bg-border text-muted",
  ACTIVE: "bg-emerald-50 text-emerald-600",
  COMPLETED: "bg-border text-ink",
  CANCELLED: "bg-danger-bg text-danger-ink",
};

interface SlotSchedulerProps {
  teacherId: string;
  partnerId: string;
  onOpenSlot: (slot: SlotResponse) => void;
}

export function SlotScheduler({ teacherId, partnerId, onOpenSlot }: SlotSchedulerProps) {
  const { labs, fetchLabs, slots, isLoadingSlots, fetchSlots, cancelSlot, fetchCatalog, lastError } =
    useLabStore();
  const [onDate, setOnDate] = useState(todayIso());
  const [isCreateOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (partnerId) {
      fetchLabs(partnerId);
      fetchCatalog(partnerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  useEffect(() => {
    fetchSlots({ onDate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDate]);

  const sortedSlots = useMemo(
    () => [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [slots],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="mx-auto max-w-6xl px-6 py-8 lg:px-10"
    >
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-emerald">School Lab Mode</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-ink sm:text-4xl">Today&apos;s Periods</h1>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={onDate}
            onChange={(e) => setOnDate(e.target.value)}
            className="rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-emerald"
          />
          <button
            onClick={() => setCreateOpen(true)}
            disabled={labs.length === 0}
            className="flex items-center gap-2 rounded-xl bg-emerald px-4.5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(5,159,109,.28)] transition-all hover:-translate-y-0.5 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={17} />
            Schedule period
          </button>
        </div>
      </div>

      {labs.length === 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-warning-border bg-warning-bg p-4 text-[13.5px] text-warning-ink">
          <FlaskConical size={18} className="mt-0.5 shrink-0" />
          <span>No labs available yet. Ask your partner admin to set up a lab before scheduling.</span>
        </div>
      )}
      {lastError && (
        <div className="mb-6 rounded-2xl border border-danger-bg bg-danger-bg p-4 text-[13.5px] text-danger-ink">{lastError}</div>
      )}

      {isLoadingSlots ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-border" />
          ))}
        </div>
      ) : sortedSlots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/5 text-muted-light">
            <CalendarX2 size={26} />
          </div>
          <h3 className="font-serif text-xl font-semibold text-ink">No periods scheduled</h3>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
            Nothing is on the timetable for this date yet.
          </p>
          {labs.length > 0 && (
            <button
              onClick={() => setCreateOpen(true)}
              className="mx-auto mt-5 flex items-center gap-1.5 rounded-xl bg-emerald px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-emerald-600"
            >
              <Plus size={15} />
              Schedule period
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSlots.map((slot, i) => (
            <motion.div
              key={slot.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.04, ease: "easeOut" }}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(4,46,92,.06)]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-ink/5 text-ink">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">
                    Grade {slot.grade}
                    {slot.section} · {slot.subject}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    <span className="font-serif font-semibold text-ink">
                      {slot.start_time.slice(11, 16)}–{slot.end_time.slice(11, 16)}
                    </span>{" "}
                    · {OBJECTIVE_MODES.find((m) => m.value === slot.objective_mode)?.label || slot.objective_mode}
                    {slot.chapter ? ` · ${slot.chapter}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyles[slot.status]}`}>
                  {slot.status}
                </span>
                {slot.status === "SCHEDULED" && (
                  <button
                    onClick={() => cancelSlot(slot.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-danger-bg px-3 py-2 text-[11px] font-bold text-danger-ink hover:bg-[#fbdcd3]"
                  >
                    <Ban size={12} />
                    Cancel
                  </button>
                )}
                {(slot.status === "SCHEDULED" || slot.status === "ACTIVE" || slot.status === "COMPLETED") && (
                  <button
                    onClick={() => onOpenSlot(slot)}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-600"
                  >
                    <PlayCircle size={12} />
                    {slot.status === "COMPLETED" ? "View report" : "Run period"}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <CreateSlotModal
        isOpen={isCreateOpen}
        teacherId={teacherId}
        labs={labs}
        defaultDate={onDate}
        onClose={() => setCreateOpen(false)}
      />
    </motion.div>
  );
}

function CreateSlotModal({
  isOpen,
  teacherId,
  labs,
  defaultDate,
  onClose,
}: {
  isOpen: boolean;
  teacherId: string;
  labs: { id: string; name: string }[];
  defaultDate: string;
  onClose: () => void;
}) {
  const { createSlot, fetchSlots, catalog } = useLabStore();
  const [labId, setLabId] = useState(labs[0]?.id || "");
  // Grade + section are picked as one unit ("5|A") from the roster catalog, so a
  // period is never scheduled against a class that has no enrollment register.
  const [classKey, setClassKey] = useState("");
  const [gradeStr, section] = classKey ? classKey.split("|") : ["", ""];
  const grade = gradeStr ? Number(gradeStr) : 0;
  const [subject, setSubject] = useState("");
  const [objectiveMode, setObjectiveMode] = useState<ObjectiveMode>("CHAPTER_PRACTICE");
  const [chapter, setChapter] = useState("");
  const [skillFocus, setSkillFocus] = useState("");
  const [scheduledDate, setScheduledDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:40");
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deterministic dropdown options, derived from the school's ingested content.
  // Subjects are scoped to the chosen grade; chapters to the chosen subject+grade.
  const gradeSubjects = useMemo(
    () => [...new Set(catalog.chapters.filter((c) => c.grade === grade).map((c) => c.subject))].sort(),
    [catalog, grade],
  );
  const subjectChapters = useMemo(
    () =>
      catalog.chapters
        .filter((c) => c.grade === grade && c.subject === subject)
        .map((c) => c.document_title),
    [catalog, grade, subject],
  );
  const isGapRecovery = objectiveMode === "GAP_RECOVERY";

  useEffect(() => {
    if (!labId && labs[0]) setLabId(labs[0].id);
  }, [labs, labId]);

  useEffect(() => {
    setScheduledDate(defaultDate);
  }, [defaultDate, isOpen]);

  // Keep selections consistent with the catalog: drop a subject that isn't
  // offered for the chosen grade, and a chapter that doesn't belong to the
  // chosen subject.
  useEffect(() => {
    if (subject && !gradeSubjects.includes(subject)) {
      setSubject("");
      setChapter("");
    }
  }, [gradeSubjects, subject]);

  useEffect(() => {
    if (chapter && !subjectChapters.includes(chapter)) {
      setChapter("");
    }
  }, [subjectChapters, chapter]);

  const handleSubmit = async () => {
    if (!labId || !classKey || !subject.trim()) return;
    const chapterValue = chapter.trim();
    if (isGapRecovery && (!chapterValue || !skillFocus.trim())) {
      setError("Gap Recovery needs a chapter and what you taught (skill focus).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createSlot({
        lab_id: labId,
        teacher_id: teacherId,
        grade,
        section: section.trim(),
        subject: subject.trim(),
        objective_mode: objectiveMode,
        // The picked chapter is both the display label and the RAG anchor.
        chapter: chapterValue || undefined,
        document_title: chapterValue || undefined,
        skill_focus: skillFocus.trim() || undefined,
        scheduled_date: scheduledDate,
        start_time: `${scheduledDate}T${startTime}:00+05:30`,
        end_time: `${scheduledDate}T${endTime}:00+05:30`,
      });
      await fetchSlots({ onDate: defaultDate });
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to schedule period.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-ink/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 z-[101] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-7 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-ink">Schedule a period</h3>
              <button onClick={onClose} className="text-muted-light hover:text-muted">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={labId}
                onChange={(e) => setLabId(e.target.value)}
                className="col-span-2 rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20"
              >
                {labs.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name}
                  </option>
                ))}
              </select>
              <select
                value={classKey}
                onChange={(e) => setClassKey(e.target.value)}
                disabled={catalog.classes.length === 0}
                className="col-span-2 rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20 disabled:cursor-not-allowed disabled:bg-ink/5 disabled:text-muted"
              >
                <option value="">
                  {catalog.classes.length === 0
                    ? "No classes with a roster yet"
                    : "Select class…"}
                </option>
                {catalog.classes.map((c) => (
                  <option key={`${c.grade}|${c.section}`} value={`${c.grade}|${c.section}`}>
                    Grade {c.grade} · {c.section}
                  </option>
                ))}
              </select>
              <select
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setChapter("");
                }}
                disabled={gradeSubjects.length === 0}
                className="col-span-2 rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20 disabled:cursor-not-allowed disabled:bg-ink/5 disabled:text-muted"
              >
                <option value="">
                  {!classKey
                    ? "Select a class first"
                    : gradeSubjects.length === 0
                      ? "No subjects available for this grade"
                      : "Select subject…"}
                </option>
                {gradeSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={objectiveMode}
                onChange={(e) => setObjectiveMode(e.target.value as ObjectiveMode)}
                className="col-span-2 rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20"
              >
                {OBJECTIVE_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
              <select
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                disabled={subjectChapters.length === 0}
                className="col-span-2 rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20 disabled:cursor-not-allowed disabled:bg-ink/5 disabled:text-muted"
              >
                <option value="">
                  {subjectChapters.length > 0
                    ? isGapRecovery
                      ? "Select chapter…"
                      : "Select chapter (optional)…"
                    : subject
                      ? "No chapters available for this subject"
                      : "Select a subject first"}
                </option>
                {subjectChapters.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {isGapRecovery && (
                <input
                  value={skillFocus}
                  onChange={(e) => setSkillFocus(e.target.value)}
                  placeholder="What you taught (e.g. adding fractions with unlike denominators)"
                  className="col-span-2 rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20"
                />
              )}
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="col-span-2 rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20"
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20"
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20"
              />
            </div>
            {error && <p className="mt-3 text-xs text-danger-ink">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={
                !labId ||
                !classKey ||
                !subject.trim() ||
                isSubmitting ||
                (isGapRecovery && (!chapter.trim() || !skillFocus.trim()))
              }
              className="mt-5 w-full rounded-xl bg-emerald py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {isSubmitting ? "Scheduling…" : "Schedule period"}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
