"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Clock, Ban, PlayCircle, CalendarX2, FlaskConical, Users } from "lucide-react";
import { useLabStore } from "../store/useLabStore";
import { OBJECTIVE_MODES, type ObjectiveMode, type SlotResponse } from "../types/lab";
import { ApiRequestError } from "@/utils/authFetch";
import { CreateClassModal } from "./CreateClassModal";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { Select } from "@/components/ui/Select";
import { bookingWindowEnd } from "@/utils/datetime";
import {
  requireExactSubject,
  type ExactSubject,
} from "@/features/subjects/subjectCatalog";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const FALLBACK_TZ = "Asia/Kolkata";

/** Default period length used to derive the end time from the start time. */
const DEFAULT_PERIOD_MINUTES = 40;

/** Current wall clock in `timeZone` as "HH:MM" (24h). */
function nowWallClock(timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

/** Shift an "HH:MM" wall clock by `minutes`, wrapping within the day. */
function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Minutes that `timeZone`'s wall clock is ahead of UTC at `date` (IST → +330).
 * Uses Intl so it stays correct per IANA zone / DST instead of a hardcoded offset.
 */
function tzOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const map: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** Interpret a `YYYY-MM-DD` + `HH:MM` wall clock as local to `timeZone`; return the UTC instant as ISO. */
function zonedWallClockToUtcIso(dateStr: string, timeStr: string, timeZone: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  return new Date(guess.getTime() - tzOffsetMinutes(guess, timeZone) * 60000).toISOString();
}

/** Render a UTC ISO instant as `HH:MM` wall clock in `timeZone`. */
function formatSlotTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  });
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
  const [isClassCreateOpen, setClassCreateOpen] = useState(false);

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
    () =>
      [...slots].sort((a, b) => {
        const byTime = b.start_time.localeCompare(a.start_time);
        if (byTime !== 0) return byTime;
        return b.id.localeCompare(a.id);
      }),
    [slots],
  );

  // Times are stored/returned as UTC instants; render each in its lab's timezone.
  const labTimezone = (labId: string) =>
    labs.find((l) => l.id === labId)?.timezone ?? FALLBACK_TZ;

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
          <DatePicker
            value={onDate}
            onChange={setOnDate}
            aria-label="Show periods for date"
            accentColor="var(--emerald)"
            buttonStyle={{
              background: "#FFFFFF",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "12px 14px",
              color: "var(--ink)",
            }}
          />
          <button
            onClick={() => setClassCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink hover:border-emerald"
          >
            <Users size={17} /> Create class
          </button>
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
                      {formatSlotTime(slot.start_time, labTimezone(slot.lab_id))}–
                      {formatSlotTime(slot.end_time, labTimezone(slot.lab_id))}
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
      <CreateClassModal
        isOpen={isClassCreateOpen}
        partnerId={partnerId}
        onClose={() => setClassCreateOpen(false)}
        onCreated={async () => {
          await fetchCatalog(partnerId);
        }}
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
  labs: { id: string; name: string; timezone: string }[];
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
  const [subject, setSubject] = useState<ExactSubject | "">("");
  const [objectiveMode, setObjectiveMode] = useState<ObjectiveMode>("CHAPTER_PRACTICE");
  const [chapter, setChapter] = useState("");
  const [skillFocus, setSkillFocus] = useState("");
  const [scheduledDate, setScheduledDate] = useState(defaultDate);
  // Defaults track the lab's local "now" (IST for our labs); the teacher can
  // still edit both fields freely.
  const [startTime, setStartTime] = useState(() => nowWallClock(labs[0]?.timezone ?? FALLBACK_TZ));
  const [endTime, setEndTime] = useState(() =>
    addMinutes(nowWallClock(labs[0]?.timezone ?? FALLBACK_TZ), DEFAULT_PERIOD_MINUTES),
  );
  // Per-student session budget in minutes (defaults to the 50-min lab default).
  const [sessionMinutes, setSessionMinutes] = useState(50);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deterministic dropdown options, derived from the school's ingested content.
  // Subjects are scoped to the chosen grade; chapters to the chosen subject+grade.
  const gradeSubjects = useMemo(() => {
    const subjects = new Set<ExactSubject>();
    for (const chapter of catalog.chapters.filter((item) => item.grade === grade)) {
      try {
        subjects.add(requireExactSubject(chapter.subject, grade));
      } catch {
        // Do not expose historical/non-taxonomy lab catalogue entries.
      }
    }
    return Array.from(subjects).sort();
  }, [catalog, grade]);
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

  // Re-seed the times each time the modal opens so "now" is actually now.
  useEffect(() => {
    if (!isOpen) return;
    const tz = labs.find((l) => l.id === labId)?.timezone ?? FALLBACK_TZ;
    const now = nowWallClock(tz);
    setStartTime(now);
    setEndTime(addMinutes(now, DEFAULT_PERIOD_MINUTES));
    // Only on open — editing the lab mid-form shouldn't clobber typed times.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
    if (!labId || !classKey || !subject) return;
    const exactSubject = requireExactSubject(subject, grade);
    const chapterValue = chapter.trim();
    if (isGapRecovery && (!chapterValue || !skillFocus.trim())) {
      setError("Gap Recovery needs a chapter and what you taught (skill focus).");
      return;
    }
    setSubmitting(true);
    setError(null);
    // Interpret the teacher's wall-clock entry in the selected lab's timezone,
    // not a hardcoded IST offset, so non-IST labs schedule correctly too.
    const labTz = labs.find((l) => l.id === labId)?.timezone ?? FALLBACK_TZ;
    try {
      await createSlot({
        lab_id: labId,
        teacher_id: teacherId,
        grade,
        section: section.trim(),
        subject: exactSubject,
        objective_mode: objectiveMode,
        // The picked chapter is both the display label and the RAG anchor.
        chapter: chapterValue || undefined,
        document_title: chapterValue || undefined,
        skill_focus: skillFocus.trim() || undefined,
        scheduled_date: scheduledDate,
        start_time: zonedWallClockToUtcIso(scheduledDate, startTime, labTz),
        end_time: zonedWallClockToUtcIso(scheduledDate, endTime, labTz),
        session_seconds: Math.round(Math.min(240, Math.max(1, sessionMinutes || 1)) * 60),
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
              <Select
                aria-label="Lab"
                className="col-span-2"
                value={labId}
                onChange={setLabId}
                options={labs.map((lab) => ({ value: lab.id, label: lab.name }))}
                buttonStyle={{
                  background: "#FFFFFF",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  color: "var(--ink)",
                }}
              />
              <Select
                aria-label="Class"
                className="col-span-2"
                value={classKey}
                onChange={setClassKey}
                disabled={catalog.classes.length === 0}
                placeholder={
                  catalog.classes.length === 0
                    ? "No classes with a roster yet"
                    : "Select class…"
                }
                options={catalog.classes.map((c) => ({
                  value: `${c.grade}|${c.section}`,
                  label: `Grade ${c.grade} · ${c.section}`,
                }))}
                buttonStyle={{
                  background: "#FFFFFF",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  color: "var(--ink)",
                }}
              />
              <Select
                aria-label="Subject"
                className="col-span-2"
                value={subject}
                onChange={(v) => {
                  const match = gradeSubjects.find((candidate) => candidate === v);
                  setSubject(match ?? "");
                  setChapter("");
                }}
                disabled={gradeSubjects.length === 0}
                placeholder={
                  !classKey
                    ? "Select a class first"
                    : gradeSubjects.length === 0
                      ? "No subjects available for this grade"
                      : "Select subject…"
                }
                options={gradeSubjects.map((s) => ({ value: s, label: s }))}
                buttonStyle={{
                  background: "#FFFFFF",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  color: "var(--ink)",
                }}
              />
              <Select
                aria-label="Objective mode"
                className="col-span-2"
                value={objectiveMode}
                onChange={(v) => setObjectiveMode(v as ObjectiveMode)}
                options={OBJECTIVE_MODES.map((mode) => ({
                  value: mode.value,
                  label: mode.label,
                }))}
                buttonStyle={{
                  background: "#FFFFFF",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  color: "var(--ink)",
                }}
              />
              <Select
                aria-label="Chapter"
                className="col-span-2"
                value={chapter}
                onChange={setChapter}
                disabled={subjectChapters.length === 0}
                placeholder={
                  subjectChapters.length > 0
                    ? isGapRecovery
                      ? "Select chapter…"
                      : "Select chapter (optional)…"
                    : subject
                      ? "No chapters available for this subject"
                      : "Select a subject first"
                }
                options={subjectChapters.map((c) => ({ value: c, label: c }))}
                buttonStyle={{
                  background: "#FFFFFF",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  color: "var(--ink)",
                }}
              />
              {isGapRecovery && (
                <input
                  value={skillFocus}
                  onChange={(e) => setSkillFocus(e.target.value)}
                  placeholder="What you taught (e.g. adding fractions with unlike denominators)"
                  className="col-span-2 rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20"
                />
              )}
              <DatePicker
                value={scheduledDate}
                onChange={setScheduledDate}
                max={bookingWindowEnd()}
                aria-label="Session date"
                accentColor="var(--emerald)"
                className="col-span-2"
                buttonStyle={{
                  background: "#FFFFFF",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  color: "var(--ink)",
                }}
              />
              <TimePicker
                value={startTime}
                onChange={setStartTime}
                aria-label="Start time"
                accentColor="var(--emerald)"
                clearable={false}
                buttonStyle={{
                  background: "#FFFFFF",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  color: "var(--ink)",
                }}
              />
              <TimePicker
                value={endTime}
                onChange={setEndTime}
                aria-label="End time"
                accentColor="var(--emerald)"
                clearable={false}
                buttonStyle={{
                  background: "#FFFFFF",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  color: "var(--ink)",
                }}
              />
              <label className="col-span-2 flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5 text-sm">
                <span className="text-muted">Session length — minutes per student</span>
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={sessionMinutes}
                  onChange={(e) => setSessionMinutes(Number(e.target.value))}
                  className="w-20 rounded-lg border border-border px-2.5 py-1.5 text-right text-sm text-ink outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20"
                />
              </label>
            </div>
            {error && <p className="mt-3 text-xs text-danger-ink">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={
                !labId ||
                !classKey ||
                !subject ||
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
