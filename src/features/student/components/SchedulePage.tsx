"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useScheduleStore } from "@/features/student/store/useScheduleStore";
import { useTestStore } from "@/features/student/store/useTestStore";
import {
  CalendarClock,
  ArrowLeft,
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
import { SessionType } from "../types/schedule";

function tomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function SchedulePage() {
  const router = useRouter();
  const { studentProfile, availableAgents, isAgentsLoading, fetchAvailableAgents } = useStudentStore();
  const { sessions, isLoading, isBooking, bookError, loadScheduledSessions, bookSession } = useScheduleStore();
  const { loadTest } = useTestStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessionType, setSessionType] = useState<SessionType>("TEST");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [scheduledDate, setScheduledDate] = useState(tomorrowDateString());
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [bookedConfirmation, setBookedConfirmation] = useState(false);

  useEffect(() => {
    const handle = () => setSidebarOpen(window.innerWidth >= 1024);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

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
    if (!studentProfile?.user_id || !subject || !scheduledDate) return;
    if (sessionType === "TEST" && !topic) return;

    setBookedConfirmation(false);
    const result = await bookSession({
      user_id: studentProfile.user_id,
      session_type: sessionType,
      subject,
      topic: topic || undefined,
      scheduled_date: scheduledDate,
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

  const handleReschedule = (sessionTypeForRow: SessionType, subjectForRow: string, topicForRow: string | null) => {
    setSessionType(sessionTypeForRow);
    setSubject(subjectForRow);
    if (topicForRow) setTopic(topicForRow);
    setScheduledDate(tomorrowDateString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sortedSessions = [...sessions].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  return (
    <div className="flex h-screen overflow-hidden">
      <StudentHomeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-30 flex items-center justify-center rounded-[10px] cursor-pointer text-base transition-all"
          style={{ width: 38, height: 38, background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#042E5C" }}
          title="Open sidebar"
        >
          ☰
        </button>
      )}
      <div className="flex-1 min-w-0 flex flex-col h-full bg-[#F4F3EE]/30 overflow-hidden font-sans">
        {/* Header */}
        <header className="px-8 py-6 flex items-center gap-6 bg-white border-b border-[#042E5C]/5 sticky top-0 z-20">
          <button
            onClick={() => window.location.href = '/student'}
            className="w-10 h-10 rounded-full bg-[#042E5C]/5 text-[#042E5C] flex items-center justify-center hover:bg-[#042E5C]/10 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#042E5C]/5 flex items-center justify-center text-[#042E5C]">
                <CalendarClock size={16} />
              </div>
              <h1 className="text-xl font-black text-[#042E5C] tracking-tight">Schedule</h1>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-12">
            {/* Booking Form */}
            <div className="bg-white p-8 rounded-[40px] border border-[#042E5C]/5 shadow-sm space-y-6">
              <h2 className="text-sm font-black text-[#042E5C] uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={14} />
                Book a Session
              </h2>

              {/* Session Type Toggle */}
              <div className="flex gap-3">
                {(["TEST", "LEARNING"] as SessionType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSessionType(type)}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all border ${
                      sessionType === type
                        ? "bg-[#042E5C] text-white border-[#042E5C] shadow-lg shadow-[#042E5C]/10"
                        : "bg-[#F4F3EE]/50 text-[#042E5C]/40 border-[#042E5C]/5 hover:text-[#042E5C]"
                    }`}
                  >
                    {type === "TEST" ? <GraduationCap size={16} /> : <BookOpen size={16} />}
                    {type === "TEST" ? "Test" : "Learning Session"}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Subject */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#042E5C]/40 uppercase tracking-widest">Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-[#F4F3EE]/50 border border-[#042E5C]/5 rounded-2xl py-3.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#042E5C]/10 focus:bg-white transition-all"
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
                  <label className="text-[10px] font-black text-[#042E5C]/40 uppercase tracking-widest">
                    Chapter {sessionType === "LEARNING" && "(optional)"}
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={isAgentsLoading}
                    className="w-full bg-[#F4F3EE]/50 border border-[#042E5C]/5 rounded-2xl py-3.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#042E5C]/10 focus:bg-white transition-all disabled:opacity-50"
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
                  <label className="text-[10px] font-black text-[#042E5C]/40 uppercase tracking-widest">Date</label>
                  <DatePicker
                    value={scheduledDate}
                    min={tomorrowDateString()}
                    onChange={setScheduledDate}
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
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#042E5C] text-white rounded-3xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-[#042E5C]/10 hover:bg-[#064282] hover:shadow-[#042E5C]/20 disabled:opacity-50 transition-all"
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
              <h2 className="text-sm font-black text-[#042E5C] uppercase tracking-widest flex items-center gap-2">
                <CalendarClock size={14} />
                Upcoming Sessions
              </h2>

              {isLoading ? (
                <div className="flex items-center gap-3 py-6 text-[#042E5C]/40">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm font-bold uppercase tracking-widest">Loading sessions...</span>
                </div>
              ) : sortedSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4 bg-white/40 rounded-[40px] border border-dashed border-[#042E5C]/10">
                  <div className="w-16 h-16 rounded-full bg-[#042E5C]/5 flex items-center justify-center text-[#042E5C]/20">
                    <CalendarClock size={32} />
                  </div>
                  <p className="text-sm font-medium text-[#042E5C]/40">No sessions scheduled yet.</p>
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
                        : { bg: "bg-[#042E5C]/5", text: "text-[#042E5C]/40", label: "Being Prepared" };

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
                          className="bg-white p-6 rounded-3xl border border-[#042E5C]/5 shadow-sm space-y-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 space-y-1">
                              <h3 className="text-sm font-black text-[#042E5C] truncate">
                                {s.topic || s.subject}
                              </h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black text-[#042E5C]/40 uppercase tracking-widest">
                                  {s.subject}
                                </span>
                                <span className="text-[10px] font-black text-[#042E5C]/30 uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#042E5C]/5">
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
                              <p className="text-xs font-bold text-[#042E5C]/60">
                                {new Date(s.scheduled_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                              </p>
                              <p className="text-[10px] font-medium text-[#042E5C]/30 uppercase tracking-widest">
                                {progressLabel[s.status] ?? s.status}
                              </p>
                            </div>

                            {isFailed ? (
                              <button
                                onClick={() => handleReschedule(s.session_type, s.subject, s.topic)}
                                className="px-4 py-2 rounded-xl bg-[#042E5C]/5 text-[#042E5C] text-[10px] font-black uppercase tracking-widest hover:bg-[#042E5C]/10 transition-all"
                              >
                                Reschedule
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStartSession(s.session_type, s.session_id!)}
                                disabled={!isReady || isStartingSession}
                                className="px-4 py-2 rounded-xl bg-[#042E5C] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#064282] disabled:opacity-30 transition-all"
                              >
                                {s.session_type === "TEST" ? "Start Test" : "Open Session"}
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
      </div>
    </div>
  );
}
