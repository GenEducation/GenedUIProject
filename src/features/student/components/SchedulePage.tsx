"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useScheduleStore } from "@/features/student/store/useScheduleStore";
import { useTestStore } from "@/features/student/store/useTestStore";
import { useSidebarStore } from "@/features/student/store/useSidebarStore";
import {
  CalendarClock,
  Loader2,
  Sparkles,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { StudentHomeSidebar } from "./StudentHomeSidebar";
import { DatePicker } from "./DatePicker";
import { TimePicker } from "./TimePicker";
import { RescheduleModal, RescheduleModalTarget } from "@/components/shared/RescheduleModal";
import { SessionType } from "../types/schedule";
import { Button } from "@/components/ui/Button";
import { STRINGS } from "../constants/strings";
import {
  requireExactSubject,
  type ExactSubject,
} from "@/features/subjects/subjectCatalog";
import { PageHeader } from "@/components/student/PageHeader";
import { SidebarToggle } from "@/components/student/SidebarToggle";
import { PageContainer } from "@/components/student/PageContainer";
import { FIELD_CLASSNAME, FIELD_FOCUS_CLASSNAME } from "@/components/ui/fieldStyles";

function tomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function getSessionStartTimestamp(scheduledDateStr: string, scheduledTimeStr?: string | null): number {
  const d = new Date(scheduledDateStr);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const dateVal = d.getUTCDate();

  let hours = 9;
  let minutes = 0;
  if (scheduledTimeStr) {
    const parts = scheduledTimeStr.split(":");
    if (parts.length === 2) {
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
    }
  }

  const istDate = new Date(Date.UTC(year, month, dateVal, hours, minutes));
  const utcDate = new Date(istDate.getTime() - (5 * 60 + 30) * 60 * 1000);
  return utcDate.getTime();
}

export function SchedulePage() {
  const router = useRouter();
  const { studentProfile, availableAgents, isAgentsLoading, fetchAvailableAgents } = useStudentStore();
  const { sessions, isLoading, isBooking, bookError, loadScheduledSessions, bookSession, isRescheduling, rescheduleError, rescheduleSession } = useScheduleStore();
  const { loadTest } = useTestStore();

  const { sidebarOpen, setSidebarOpen, applyResponsive } = useSidebarStore();
  const [sessionType, setSessionType] = useState<SessionType>("TEST");
  const [subject, setSubject] = useState<ExactSubject | "">("");
  const [topic, setTopic] = useState("");
  const [scheduledDate, setScheduledDate] = useState(tomorrowDateString());
  const [scheduledTime, setScheduledTime] = useState("");
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [bookedConfirmation, setBookedConfirmation] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<RescheduleModalTarget | null>(null);
  const [rescheduleConfirmation, setRescheduleConfirmation] = useState(false);

  useEffect(() => {
    const handle = () => applyResponsive(window.innerWidth >= 1024);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, [applyResponsive]);

  useEffect(() => {
    if (studentProfile?.user_id) {
      fetchAvailableAgents();
      loadScheduledSessions(studentProfile.user_id);
    }
  }, [studentProfile, fetchAvailableAgents, loadScheduledSessions]);

  useEffect(() => {
    if (availableAgents.length > 0 && !subject) {
      setSubject(availableAgents[0].subject);
    }
  }, [availableAgents, subject]);

  const chapters = availableAgents.find((a) => a.subject === subject)?.document_titles ?? [];

  useEffect(() => {
    setTopic((prev) => (chapters.includes(prev) ? prev : chapters[0] ?? ""));
  }, [chapters]);

  const handleBook = async () => {
    if (!studentProfile?.user_id || !Number.isInteger(studentProfile.grade) || !subject || !scheduledDate) return;
    if (sessionType === "TEST" && !topic) return;
    const exactSubject = requireExactSubject(subject, studentProfile.grade);

    setBookedConfirmation(false);
    const result = await bookSession({
      user_id: studentProfile.user_id,
      session_type: sessionType,
      subject: exactSubject,
      topic: topic || undefined,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime || undefined,
    });

    if (result) {
      setBookedConfirmation(true);
      setTimeout(() => setBookedConfirmation(false), 4000);
    }
  };

  const handleStartSession = async (sessionTypeForSession: SessionType, sessionId: string) => {
    setIsStartingSession(true);
    try {
      if (sessionTypeForSession === "TEST") {
        await loadTest(sessionId);
        router.push("/student/test?from=schedule");
      } else {
        router.push(`/student/chat/${sessionId}`);
      }
    } catch (error) {
      console.error("Error starting scheduled session:", error);
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleReschedule = (id: string, sessionTypeForRow: SessionType, subjectForRow: string, topicForRow: string | null) => {
    setRescheduleTarget({
      id,
      sessionType: sessionTypeForRow,
      subject: subjectForRow,
      topic: topicForRow,
    });
  };

  const handleConfirmReschedule = async (scheduledDate: string, scheduledTime: string) => {
    if (!rescheduleTarget) return;
    const result = await rescheduleSession(rescheduleTarget.id, {
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime || undefined,
    });
    if (result) {
      setRescheduleTarget(null);
      setRescheduleConfirmation(true);
      setTimeout(() => setRescheduleConfirmation(false), 4000);
    }
  };

  // Classify a session by its lifecycle so genuinely upcoming sessions are
  // separated from ones that already failed prep or slipped into the past.
  const classify = (s: (typeof sessions)[number]) => {
    const startTs = getSessionStartTimestamp(s.scheduled_date, s.scheduled_time);
    const isExpired = Date.now() - startTs > 24 * 60 * 60 * 1000;
    const isFailed = s.preparation_status === "FAILED";
    const isReady = s.preparation_status === "COMPLETED" && !!s.session_id;
    return { startTs, isExpired, isFailed, isReady };
  };

  // The backend can emit several rows for the same topic/date when prep is
  // retried; collapse them, keeping the "most ready" row.
  const readinessRank = (s: (typeof sessions)[number]) => {
    const { isReady, isFailed, isExpired } = classify(s);
    if (isReady) return 3;
    if (isExpired) return 1;
    if (isFailed) return 0;
    return 2; // being prepared / pending
  };
  const validSessions = sessions.filter((session) => {
    try {
      requireExactSubject(session.subject, studentProfile?.grade);
      return true;
    } catch {
      return false;
    }
  });
  const dedupedSessions = Object.values(
    validSessions.reduce<Record<string, (typeof sessions)[number]>>((acc, s) => {
      const key = `${s.subject}|${s.topic ?? ""}|${s.scheduled_date}|${s.scheduled_time ?? ""}`;
      if (!acc[key] || readinessRank(s) > readinessRank(acc[key])) acc[key] = s;
      return acc;
    }, {})
  );

  const upcomingSessions = dedupedSessions
    .filter((s) => {
      const c = classify(s);
      return !c.isExpired && !c.isFailed;
    })
    .sort((a, b) => classify(a).startTs - classify(b).startTs);

  const pastSessions = dedupedSessions
    .filter((s) => {
      const c = classify(s);
      return c.isExpired || c.isFailed;
    })
    .sort((a, b) => classify(b).startTs - classify(a).startTs);

  // Single card renderer reused by both the Upcoming and Past sections.
  const renderSessionCard = (s: (typeof sessions)[number]) => {
    const { isExpired, isReady, isFailed } = classify(s);

    const statusConfig = isFailed
      ? { bg: "bg-amber-50", text: "text-amber-600", label: "Couldn't set up" }
      : isExpired
      ? { bg: "bg-gray-100", text: "text-gray-500", label: "Missed" }
      : isReady
      ? { bg: "bg-emerald-50", text: "text-emerald-600", label: "Ready" }
      : { bg: "bg-[var(--primary-ink)]/5", text: "text-[var(--primary-ink)]/40", label: "Being Prepared" };

    const progressLabel: Record<string, string> = {
      PENDING: isExpired ? "Incomplete" : "Not started",
      STARTED: "In progress",
      "STARTED-EARLY": "Started early",
      COMPLETED: "Finished",
    };

    return (
      <motion.div
        key={s.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="bg-white p-4 sm:p-6 rounded-3xl border border-[var(--primary-ink)]/5 shadow-sm space-y-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-black text-[var(--primary-ink)] truncate">
              {s.topic || s.subject}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black text-[var(--primary-ink)]/40 uppercase tracking-widest">
                {s.subject}
              </span>
              <span className="text-[10px] font-black text-[var(--primary-ink)]/30 uppercase tracking-widest px-2 py-0.5 rounded-full bg-[var(--primary-ink)]/5">
                {s.session_type}
              </span>
            </div>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${statusConfig.bg} ${statusConfig.text} text-[10px] font-black uppercase tracking-wider`}>
            {isFailed ? <AlertTriangle size={10} /> : isReady ? <CheckCircle2 size={10} /> : <Clock size={10} />}
            {statusConfig.label}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-[var(--primary-ink)]/60">
              {new Date(s.scheduled_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              {s.scheduled_time && <span className="ml-1.5 text-[var(--primary-ink)]/40">· {s.scheduled_time} IST</span>}
            </p>
            <p className="text-[10px] font-medium text-[var(--primary-ink)]/30 uppercase tracking-widest">
              {progressLabel[s.status] ?? s.status}
            </p>
          </div>

          {isFailed || isExpired ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleReschedule(s.id, s.session_type, s.subject, s.topic)}
            >
              Reschedule
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleStartSession(s.session_type, s.session_id!)}
              disabled={!isReady || isStartingSession}
            >
              {s.session_type === "TEST" ? STRINGS.practice.startCta : "Open Session"}
            </Button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <StudentHomeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />
      <SidebarToggle />
      <div className="flex-1 min-w-0 flex flex-col h-full bg-[var(--surface-page)] overflow-hidden font-sans">
        <PageHeader
          icon={<CalendarClock size={16} />}
          title="Schedule"
          onBack={() => window.location.href = '/student'}
          sidebarOpen={sidebarOpen}
        />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar">
          <PageContainer className="space-y-8 sm:space-y-12">
            {/* Booking Form */}
            <div className="bg-white p-4 sm:p-6 md:p-8 rounded-[28px] sm:rounded-[40px] border border-[var(--primary-ink)]/5 shadow-sm space-y-6">
              <h2 className="text-sm font-black text-[var(--primary-ink)] uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={14} />
                Book a Session
              </h2>

              {/* Session Type Toggle */}
              <div className="flex gap-2 sm:gap-3">
                {(["TEST", "LEARNING"] as SessionType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSessionType(type)}
                    className={`flex-1 flex items-center justify-center text-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-3 sm:py-4 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-wide sm:tracking-[0.2em] leading-tight transition-all border ${
                      // Neutral ink selection, not a second brand accent — the
                      // page's one colored "action" is the emerald Schedule
                      // Session CTA below. A solid navy block here read as a
                      // second, competing primary color on the same screen.
                      sessionType === type
                        ? "bg-white text-[var(--primary-ink)] border-[var(--primary-ink)]/25 shadow-sm"
                        : "bg-[#F4F3EE]/50 text-[var(--primary-ink)]/40 border-[var(--primary-ink)]/5 hover:text-[var(--primary-ink)]"
                    }`}
                  >
                    {type === "TEST" ? <GraduationCap size={16} className="shrink-0" /> : <BookOpen size={16} className="shrink-0" />}
                    <span className="whitespace-nowrap">{type === "TEST" ? "Test" : "Learning Session"}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Subject */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--primary-ink)]/40 uppercase tracking-widest">Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => {
                      setSubject(requireExactSubject(e.target.value, studentProfile?.grade));
                    }}
                    className={`${FIELD_CLASSNAME} ${FIELD_FOCUS_CLASSNAME} px-4`}
                  >
                    {isAgentsLoading && <option value="">Loading...</option>}
                    {!isAgentsLoading && availableAgents.length === 0 && <option value="">No subjects available</option>}
                    {availableAgents.map((a) => (
                      <option key={a.subject} value={a.subject}>{a.subject}</option>
                    ))}
                  </select>
                </div>

                {/* Topic */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--primary-ink)]/40 uppercase tracking-widest">
                    Chapter {sessionType === "LEARNING" && "(optional)"}
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={isAgentsLoading}
                    className={`${FIELD_CLASSNAME} ${FIELD_FOCUS_CLASSNAME} px-4 disabled:opacity-50`}
                  >
                    {isAgentsLoading && <option value="">Loading...</option>}
                    {!isAgentsLoading && chapters.length === 0 && <option value="">No chapters available</option>}
                    {chapters.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--primary-ink)]/40 uppercase tracking-widest">Date</label>
                  <DatePicker
                    value={scheduledDate}
                    min={tomorrowDateString()}
                    onChange={setScheduledDate}
                  />
                </div>

                {/* Time (optional) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--primary-ink)]/40 uppercase tracking-widest">Start Time <span className="font-medium normal-case">(optional, IST)</span></label>
                  <TimePicker
                    value={scheduledTime}
                    onChange={setScheduledTime}
                  />
                </div>
              </div>

              {bookError && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-50 text-red-600 text-sm font-medium">
                  <AlertTriangle size={16} />
                  {bookError}
                </div>
              )}

              {bookedConfirmation && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-50 text-emerald-600 text-sm font-bold">
                  <CheckCircle2 size={16} />
                  Session scheduled! It will be prepared the night before.
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleBook}
                disabled={isBooking || !subject || !scheduledDate || (sessionType === "TEST" && !topic)}
                trailingIcon={!isBooking && <ArrowRight size={16} />}
              >
                {isBooking ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  "Schedule Session"
                )}
              </Button>
            </div>

            {/* Scheduled Sessions List */}
            <div className="space-y-4">
              {rescheduleConfirmation && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-50 text-emerald-600 text-sm font-bold mb-4">
                  <CheckCircle2 size={16} />
                  Session rescheduled! It will be prepared the night before.
                </div>
              )}

              <h2 className="text-sm font-black text-[var(--primary-ink)] uppercase tracking-widest flex items-center gap-2">
                <CalendarClock size={14} />
                Upcoming Sessions
              </h2>

              {isLoading ? (
                <div className="flex items-center gap-3 py-6 text-[var(--primary-ink)]/40">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm font-bold uppercase tracking-widest">Loading sessions...</span>
                </div>
              ) : upcomingSessions.length === 0 && pastSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4 bg-white/40 rounded-[40px] border border-dashed border-[var(--primary-ink)]/10">
                  <div className="w-16 h-16 rounded-full bg-[var(--primary-ink)]/5 flex items-center justify-center text-[var(--primary-ink)]/20">
                    <CalendarClock size={32} />
                  </div>
                  <p className="text-sm font-medium text-[var(--primary-ink)]/40">No sessions scheduled yet.</p>
                </div>
              ) : (
                <>
                  {upcomingSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3 bg-white/40 rounded-[32px] border border-dashed border-[var(--primary-ink)]/10">
                      <div className="w-12 h-12 rounded-full bg-[var(--primary-ink)]/5 flex items-center justify-center text-[var(--primary-ink)]/20">
                        <CalendarClock size={24} />
                      </div>
                      <p className="text-sm font-medium text-[var(--primary-ink)]/40">Nothing coming up — book a session above.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AnimatePresence mode="popLayout">
                        {upcomingSessions.map((s) => renderSessionCard(s))}
                      </AnimatePresence>
                    </div>
                  )}

                  {pastSessions.length > 0 && (
                    <div className="space-y-4 pt-8">
                      <h2 className="text-sm font-black text-[var(--primary-ink)]/50 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={14} />
                        Past &amp; Needs Attention
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnimatePresence mode="popLayout">
                          {pastSessions.map((s) => renderSessionCard(s))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </PageContainer>
        </div>
      </div>

      <RescheduleModal
        isOpen={!!rescheduleTarget}
        target={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onConfirm={handleConfirmReschedule}
        isSubmitting={isRescheduling}
        errorMessage={rescheduleError}
      />
    </div>
  );
}
