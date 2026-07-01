"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useScheduleStore } from "@/features/student/store/useScheduleStore";
import { DatePicker } from "@/features/student/components/DatePicker";
import { studentService } from "@/features/student/services/studentService";
import { SessionType } from "@/features/student/types/schedule";
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

interface AgentSubject {
  subject: string;
  document_titles: string[];
}

interface ParentScheduleViewProps {
  studentId: string;
  parentId: string;
  studentName?: string;
}

function tomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function ParentScheduleView({ studentId, parentId, studentName }: ParentScheduleViewProps) {
  const { sessions, isLoading, isBooking, bookError, loadScheduledSessions, bookSession } = useScheduleStore();

  const [sessionType, setSessionType] = useState<SessionType>("TEST");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [scheduledDate, setScheduledDate] = useState(tomorrowDateString());
  const [scheduledTime, setScheduledTime] = useState("");
  const [agentSubjects, setAgentSubjects] = useState<AgentSubject[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [bookedConfirmation, setBookedConfirmation] = useState(false);

  useEffect(() => {
    loadScheduledSessions(studentId, parentId);
  }, [studentId, parentId, loadScheduledSessions]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchAgents = async () => {
      setIsLoadingAgents(true);
      try {
        const data = await studentService.fetchAvailableAgents(studentId, controller.signal);
        if (cancelled) return;

        const subjects: AgentSubject[] = [];
        if (data?.partners && Array.isArray(data.partners)) {
          data.partners.forEach((partner: any) => {
            if (partner.subjects && Array.isArray(partner.subjects)) {
              partner.subjects.forEach((sub: any) => {
                sub.agents?.forEach((agent: any) => {
                  if (agent.subject) {
                    subjects.push({ subject: agent.subject, document_titles: agent.document_titles ?? [] });
                  }
                });
              });
            }
          });
        }
        setAgentSubjects(subjects);
        if (subjects.length > 0) setSubject((prev) => prev || subjects[0].subject);
      } catch (e: any) {
        if (e?.name !== "AbortError") console.error("Failed to fetch available agents:", e);
      } finally {
        if (!cancelled) setIsLoadingAgents(false);
      }
    };

    fetchAgents();
    return () => { cancelled = true; controller.abort(); };
  }, [studentId]);

  const chapters = agentSubjects.find((a) => a.subject === subject)?.document_titles ?? [];

  useEffect(() => {
    setTopic((prev) => (chapters.includes(prev) ? prev : chapters[0] ?? ""));
  }, [chapters]);

  const handleBook = async () => {
    if (!subject || !scheduledDate) return;
    if (sessionType === "TEST" && !topic) return;

    setBookedConfirmation(false);
    const result = await bookSession({
      user_id: studentId,
      session_type: sessionType,
      subject,
      topic: topic || undefined,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime || undefined,
    }, parentId);

    if (result) {
      setBookedConfirmation(true);
      setTimeout(() => setBookedConfirmation(false), 4000);
    }
  };

  const handleReschedule = (sessionTypeForRow: SessionType, subjectForRow: string, topicForRow: string | null) => {
    setSessionType(sessionTypeForRow);
    setSubject(subjectForRow);
    if (topicForRow) setTopic(topicForRow);
    setScheduledDate(tomorrowDateString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sortedSessions = [...sessions].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Booking Form */}
        <div className="bg-white p-8 rounded-[40px] border border-[#1a3a2a]/5 shadow-sm space-y-6">
          <h2 className="text-sm font-black text-[#1a3a2a] uppercase tracking-widest flex items-center gap-2">
            <Sparkles size={14} />
            Schedule a Session{studentName ? ` for ${studentName}` : ""}
          </h2>

          {/* Session Type Toggle */}
          <div className="flex gap-3">
            {(["TEST", "LEARNING"] as SessionType[]).map((type) => (
              <button
                key={type}
                onClick={() => setSessionType(type)}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all border ${
                  sessionType === type
                    ? "bg-[#1a3a2a] text-white border-[#1a3a2a] shadow-lg shadow-[#1a3a2a]/10"
                    : "bg-[#F4F3EE]/50 text-[#1a3a2a]/40 border-[#1a3a2a]/5 hover:text-[#1a3a2a]"
                }`}
              >
                {type === "TEST" ? <GraduationCap size={16} /> : <BookOpen size={16} />}
                {type === "TEST" ? "Test" : "Learning Session"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Subject */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#1a3a2a]/40 uppercase tracking-widest">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isLoadingAgents}
                className="w-full bg-[#F4F3EE]/50 border border-[#1a3a2a]/5 rounded-2xl py-3.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/10 focus:bg-white transition-all disabled:opacity-50"
              >
                {isLoadingAgents && <option value="">Loading...</option>}
                {!isLoadingAgents && agentSubjects.length === 0 && <option value="">No subjects available</option>}
                {agentSubjects.map((a) => (
                  <option key={a.subject} value={a.subject}>{a.subject}</option>
                ))}
              </select>
            </div>

            {/* Topic */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#1a3a2a]/40 uppercase tracking-widest">
                Chapter {sessionType === "LEARNING" && "(optional)"}
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isLoadingAgents}
                className="w-full bg-[#F4F3EE]/50 border border-[#1a3a2a]/5 rounded-2xl py-3.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/10 focus:bg-white transition-all disabled:opacity-50"
              >
                {isLoadingAgents && <option value="">Loading...</option>}
                {!isLoadingAgents && chapters.length === 0 && <option value="">No chapters available</option>}
                {chapters.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#1a3a2a]/40 uppercase tracking-widest">Date</label>
              <DatePicker
                value={scheduledDate}
                min={tomorrowDateString()}
                onChange={setScheduledDate}
              />
            </div>

            {/* Time (optional) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#1a3a2a]/40 uppercase tracking-widest">Start Time <span className="font-medium normal-case">(optional, IST)</span></label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full bg-[#F4F3EE]/50 border border-[#1a3a2a]/5 rounded-2xl py-3.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/10 focus:bg-white transition-all"
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

          <button
            onClick={handleBook}
            disabled={isBooking || !subject || !scheduledDate || (sessionType === "TEST" && !topic)}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#1a3a2a] text-white rounded-3xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-[#1a3a2a]/10 hover:bg-[#059669] hover:shadow-[#1a3a2a]/20 disabled:opacity-50 transition-all"
          >
            {isBooking ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                Schedule Session
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        {/* Scheduled Sessions List */}
        <div className="space-y-4">
          <h2 className="text-sm font-black text-[#1a3a2a] uppercase tracking-widest flex items-center gap-2">
            <CalendarClock size={14} />
            Upcoming Sessions
          </h2>

          {isLoading ? (
            <div className="flex items-center gap-3 py-6 text-[#1a3a2a]/40">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm font-bold uppercase tracking-widest">Loading sessions...</span>
            </div>
          ) : sortedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4 bg-white/40 rounded-[40px] border border-dashed border-[#1a3a2a]/10">
              <div className="w-16 h-16 rounded-full bg-[#1a3a2a]/5 flex items-center justify-center text-[#1a3a2a]/20">
                <CalendarClock size={32} />
              </div>
              <p className="text-sm font-medium text-[#1a3a2a]/40">No sessions scheduled yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {sortedSessions.map((s) => {
                  const isReady = s.preparation_status === "COMPLETED" && !!s.session_id;
                  const isFailed = s.preparation_status === "FAILED";

                  const statusConfig = isFailed
                    ? { bg: "bg-red-50", text: "text-red-600", label: "Preparation Failed" }
                    : isReady
                    ? { bg: "bg-emerald-50", text: "text-emerald-600", label: "Ready" }
                    : { bg: "bg-[#1a3a2a]/5", text: "text-[#1a3a2a]/40", label: "Being Prepared" };

                  const progressLabel: Record<string, string> = {
                    PENDING: "Not started",
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
                      className="bg-white p-6 rounded-3xl border border-[#1a3a2a]/5 shadow-sm space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-1">
                          <h3 className="text-sm font-black text-[#1a3a2a] truncate">
                            {s.topic || s.subject}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black text-[#1a3a2a]/40 uppercase tracking-widest">
                              {s.subject}
                            </span>
                            <span className="text-[10px] font-black text-[#1a3a2a]/30 uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#1a3a2a]/5">
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
                          <p className="text-xs font-bold text-[#1a3a2a]/60">
                            {new Date(s.scheduled_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                            {s.scheduled_time && <span className="ml-1.5 text-[#1a3a2a]/40">· {s.scheduled_time} IST</span>}
                          </p>
                          <p className="text-[10px] font-medium text-[#1a3a2a]/30 uppercase tracking-widest">
                            {progressLabel[s.status] ?? s.status}
                          </p>
                        </div>

                        {isFailed && (
                          <button
                            onClick={() => handleReschedule(s.session_type, s.subject, s.topic)}
                            className="px-4 py-2 rounded-xl bg-[#1a3a2a]/5 text-[#1a3a2a] text-[10px] font-black uppercase tracking-widest hover:bg-[#1a3a2a]/10 transition-all"
                          >
                            Reschedule
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
