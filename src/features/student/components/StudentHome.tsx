"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, Menu } from "lucide-react";
import Image from "next/image";
import { useStudentStore, sessionRoutePath, isVoiceSession, type AgentItem } from "../store/useStudentStore";
import { useSidebarStore } from "../store/useSidebarStore";
import { getStudentDisplayName } from "../utils/displayName";
import { STUDENT_COLORS } from "../theme/colors";
import { useOnboardingStore } from "@/features/onboarding/store/useOnboardingStore";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";
import { StudentHomeSidebar } from "./StudentHomeSidebar";
import { StreakStats } from "./StreakStats";
import { useDebouncedResize } from "@/hooks/useDebouncedResize";
import { OnboardingModal } from "@/features/onboarding/components/OnboardingModal";
import { NotificationBell } from "@/components/NotificationBell";
import { SessionStartingOverlay } from "./SessionStartingOverlay";
import { StudentAvatarIllustration } from "./StudentAvatarIllustration";
import { Button } from "@/components/ui/Button";

/* ═══ DESIGN TOKENS ═══ — sourced from STUDENT_COLORS (see theme/colors.ts) */
const C = {
  genPurple: STUDENT_COLORS.tutor,
  genBlue:   STUDENT_COLORS.tutorSoft,
  edGreen:   STUDENT_COLORS.subjectMath,
  sparkle:   STUDENT_COLORS.tutorLight,
  growth:    STUDENT_COLORS.growth,
  sun:       STUDENT_COLORS.warn,
  coral:     STUDENT_COLORS.danger,
  sky:       STUDENT_COLORS.sky,
  text:      STUDENT_COLORS.text,
  textMid:   STUDENT_COLORS.textMid,
  textMuted: STUDENT_COLORS.textMuted,
  textFaint: STUDENT_COLORS.textFaint,
  pageBg:    STUDENT_COLORS.pageBg,
  card:      STUDENT_COLORS.card,
  border:    STUDENT_COLORS.border,
};

// Raw hex, not var() — these get alpha-suffix concatenated below
// (`${vis.color}cc`, `vis.color + "14"`), which CSS custom properties can't
// support.
const SUBJECTS_VISUAL: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  English:        { color: STUDENT_COLORS.subjectEnglish, bg: "#EBF3FB", icon: "📖", label: "English" },
  Mathematics:    { color: "#2D6A4F", bg: "#E8F5EF", icon: "🧮", label: "Mathematics" },
  Science:        { color: "#D4820A", bg: "#FEF5E7", icon: "🔬", label: "Science" },
  "Social Science": { color: "#B0543F", bg: "#FBEFEB", icon: "🌍", label: "Social Science" },
  History:        { color: "#A6762D", bg: "#F6EFE4", icon: "📜", label: "History" },
  Geography:      { color: "#1E8FA6", bg: "#E7F5F7", icon: "🧭", label: "Geography" },
  "Social & Political Science": { color: "#8C4A6B", bg: "#F7EBF1", icon: "⚖️", label: "Social & Political Science" },
};

function subjectVisual(subject: string) {
  return SUBJECTS_VISUAL[subject] ?? {
    color: STUDENT_COLORS.tutor,
    bg: "#F1EEF8",
    icon: "📚",
    label: subject,
  };
}

/* ═══ RELATIVE TIME ═══ */
function timeAgo(dateStr: string): string {
  if (!dateStr) return "Recently";
  // Try to parse — handle plain date strings like "5/20/2026" and ISO
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr; // fallback: return as-is if unparseable
  const now = Date.now();
  const diff = now - date.getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  <  1)  return "Just now";
  if (mins  <  60) return `${mins}m ago`;
  if (hours <  24) return `${hours}h ago`;
  if (days  ===  1) return "Yesterday";
  if (days  <  30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/* ═══ APRIL AVATAR ═══ */
type AprilState = "idle" | "thinking" | "explaining" | "celebrating";

function AprilAvatar({ state = "idle", size = 52 }: { state?: AprilState; size?: number }) {
  const col = { idle: C.genPurple, thinking: C.genBlue, explaining: C.edGreen, celebrating: C.sun }[state] ?? C.genPurple;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="38" fill={col} opacity="0.12" />
      <circle cx="40" cy="36" r="16" fill="#FFEAA7" />
      {state === "celebrating" ? (
        <>
          <path d="M30 33 Q33 30 36 33" stroke="#2d3436" fill="none" strokeWidth="2" strokeLinecap="round" />
          <path d="M44 33 Q47 30 50 33" stroke="#2d3436" fill="none" strokeWidth="2" strokeLinecap="round" />
          <path d="M32 39 Q40 48 48 39" stroke="#e17055" fill="#fab1a0" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="33" cy="34" rx="2.5" ry="3" fill="#2d3436" />
          <ellipse cx="47" cy="34" rx="2.5" ry="3" fill="#2d3436" />
          <circle cx="33" cy="33" r="1" fill="#fff" />
          <circle cx="47" cy="33" r="1" fill="#fff" />
          <path d="M34 40 Q40 44 46 40" stroke="#e17055" fill="none" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      <ellipse cx="28" cy="38" rx="3" ry="2" fill="#fab1a0" opacity="0.4" />
      <ellipse cx="52" cy="38" rx="3" ry="2" fill="#fab1a0" opacity="0.4" />
      <path d="M24 24 Q28 18 34 22" stroke={col} fill="none" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M56 24 Q52 18 46 22" stroke={col} fill="none" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="30" y="52" width="20" height="14" rx="4" fill={col} />
      {state === "celebrating" && (
        <>
          <line x1="16" y1="10" x2="14" y2="5" stroke={C.coral} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="64" y1="8" x2="68" y2="4" stroke={C.sparkle} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="20" cy="14" r="2" fill={C.sun} />
          <circle cx="62" cy="12" r="2" fill={C.coral} />
        </>
      )}
      {state === "thinking" && (
        <>
          <circle cx="60" cy="16" r="3" fill={col} opacity="0.5" />
          <circle cx="66" cy="10" r="4" fill={col} opacity="0.3" />
        </>
      )}
    </svg>
  );
}

/* ═══ PROGRESS RING ═══ */
function ProgressRing({ percent, size = 40, stroke = 3.5, color }: { percent: number; size?: number; stroke?: number; color: string }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ * (1 - percent / 100);
  // A round cap on a near-empty arc renders as a dot floating off the track
  // rather than "barely started" — square the cap below ~6% so a low value
  // still reads as a short flat sliver sitting on the track.
  const cap = percent > 0 && percent < 6 ? "butt" : "round";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color + "18"} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap={cap}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }} />
    </svg>
  );
}

/* ═══ CONFETTI ═══ */
function Confetti({ active, onDone }: { active: boolean; onDone?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    const cv = ref.current;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    cv.width  = cv.offsetWidth;
    cv.height = cv.offsetHeight;
    const cols = [C.genPurple, C.edGreen, C.sun, C.coral, C.sky, C.sparkle];
    const p = Array.from({ length: 60 }, () => ({
      x: Math.random() * cv.width, y: -10 - Math.random() * 80,
      w: 3 + Math.random() * 4,   h: 7 + Math.random() * 5,
      c: cols[Math.floor(Math.random() * cols.length)],
      vx: (Math.random() - 0.5) * 2.5, vy: 2 + Math.random() * 3.5,
      r: Math.random() * 360,          rv: (Math.random() - 0.5) * 10,
    }));
    let f = 0; const mx = 100;
    function draw() {
      ctx!.clearRect(0, 0, cv.width, cv.height);
      p.forEach(q => {
        q.x += q.vx; q.y += q.vy; q.vy += 0.07; q.r += q.rv;
        ctx!.save(); ctx!.translate(q.x, q.y); ctx!.rotate(q.r * Math.PI / 180);
        ctx!.fillStyle = q.c; ctx!.globalAlpha = Math.max(0, 1 - f / mx);
        ctx!.fillRect(-q.w/2, -q.h/2, q.w, q.h); ctx!.restore();
      });
      f++;
      if (f < mx) requestAnimationFrame(draw);
      else { ctx!.clearRect(0, 0, cv.width, cv.height); onDone?.(); }
    }
    draw();
  }, [active]);
  if (!active) return null;
  return <canvas ref={ref} className="absolute inset-0 z-50 pointer-events-none w-full h-full" />;
}

/* ═══ CUSTOM DROPDOWN ═══ */
function FilterDropdown({ value, options, onChange, activeColor, defaultColor }: { value: string, options: string[], onChange: (v: string) => void, activeColor: string, defaultColor: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);
  
  const isActive = value !== options[0];
  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-full px-4 py-1.5 text-sm font-medium outline-none cursor-pointer hover:bg-gray-50 focus:border-[var(--tutor)] focus:ring-1 focus:ring-[var(--tutor)] transition-all"
        style={{ color: isActive ? activeColor : defaultColor }}
      >
        {value}
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 left-0 min-w-full bg-white rounded-[16px] border border-[var(--primary-ink)]/10 shadow-xl overflow-hidden py-1"
          >
            {options.map(opt => (
              <div 
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors whitespace-nowrap"
                style={{ color: opt === value ? activeColor : "#1a2332", fontWeight: opt === value ? 600 : 500 }}
              >
                {opt}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════ MAIN ═══════════════ */
export function StudentHome() {
  const router = useRouter();
  const {
    studentProfile, recentChats, availableAgents,
    fetchSessions, fetchAvailableAgents, fetchStudentStats, fetchOnboardingStatus,
    openNewChat, openExistingChat, openNewSession, startNewChatSession,
    studentStats, isAgentsLoading, isSessionsLoading, isStatsLoading,
    avatarId,
  } = useStudentStore();
  const { checkDNAStatus } = useOnboardingStore();
  const { hasEnded, hasDismissedCelebration, dismissCelebration } = useTutorialStore();

  const { sidebarOpen, setSidebarOpen, applyResponsive } = useSidebarStore();
  const [showConfetti,   setShowConfetti]   = useState(false);
  const [aprilState,     setAprilState]     = useState<AprilState>("idle");
  const [hoveredAgent,   setHoveredAgent]   = useState<string | null>(null);
  // Starts true (not false→effect→true) — content used to render at
  // opacity:0 until a mount effect fired, so any hydration stall extended
  // the blank screen indefinitely. The stagger transition above still plays
  // on genuine visibility changes; it just no longer gates first paint.
  const [mounted,        setMounted]        = useState(true);
  const [onboardingModal,setOnboardingModal]= useState<{ originalSubject: string; grade: number } | null>(null);
  const [showAllSessions,setShowAllSessions]= useState(false);
  const subjectsScrollRef = useRef<HTMLDivElement>(null);
  const scrollSubjects = (dir: "left" | "right") => {
    const el = subjectsScrollRef.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    if (!cards.length) return;
    // Align to the next/previous card edge so a full subject card lands in view.
    const current = el.scrollLeft;
    const tolerance = 2;
    const target = dir === "right"
      ? cards.find((c) => c.offsetLeft > current + tolerance)
      : [...cards].reverse().find((c) => c.offsetLeft < current - tolerance);
    const left = target
      ? target.offsetLeft
      : dir === "right" ? el.scrollWidth : 0;
    el.scrollTo({ left, behavior: "smooth" });
  };

  // Filters
  const [filterDate, setFilterDate] = useState<string>("All Time");
  const [filterType, setFilterType] = useState<string>("All");
  const [filterSubject, setFilterSubject] = useState<string>("All");

  /* responsive sidebar */
  useDebouncedResize(() => applyResponsive(window.innerWidth >= 1024));

  /* data fetch */
  useEffect(() => {
    let cancelled = false;
    if (studentProfile && !cancelled) {
      fetchSessions();
      fetchAvailableAgents();
      fetchStudentStats();
      fetchOnboardingStatus();
      checkDNAStatus(studentProfile.user_id);
    }
    return () => { cancelled = true; };
  }, [studentProfile]);

  /* Mount */
  useEffect(() => { setMounted(true); }, []);

  /* One-shot confetti — only fires once, right after the student closes the tutorial video */
  useEffect(() => {
    if (!hasEnded || hasDismissedCelebration) return;
    setAprilState("celebrating");
    setShowConfetti(true);
    const t = setTimeout(() => setAprilState("idle"), 3000);
    // Mark as seen so it never fires again (persisted in localStorage via Zustand)
    dismissCelebration();
    return () => clearTimeout(t);
  }, [hasEnded, hasDismissedCelebration, dismissCelebration]);

  const agents = availableAgents.map((agent: AgentItem) => {
    return { ...agent, vis: subjectVisual(agent.subject) };
  });

  /* All sessions mapped with relative time */
  const allSessionsRaw = recentChats.map(chat => {
    return {
      ...chat,
      vis: subjectVisual(chat.subject ?? ""),
      mastery: typeof chat.chapter_completion_percentage === "number"
        ? Math.round(chat.chapter_completion_percentage)
        : 0,
    };
  });

  const allSessions = allSessionsRaw.filter(sess => {
    if (filterSubject !== "All" && sess.vis.label !== filterSubject) return false;
    
    if (filterType !== "All") {
      const isVoice = isVoiceSession(sess);
      if (filterType === "Voice" && !isVoice) return false;
      if (filterType === "Chat" && isVoice) return false;
    }

    if (filterDate !== "All Time") {
      const now = new Date();
      // Handle the timestamp fields available
      const dateVal = sess.lastActive || (sess as any).created_at || (sess as any).session_date;
      if (dateVal) {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          const diffDays = (now.getTime() - d.getTime()) / 86400000;
          if (filterDate === "Today" && d.toDateString() !== now.toDateString()) return false;
          if (filterDate === "This Week" && diffDays > 7) return false;
          if (filterDate === "This Month" && diffDays > 30) return false;
        }
      }
    }
    
    return true;
  });

  /* Continue learning = most recent session (index 0) */
  const continueSession = allSessions[0] ?? null;

  /* Session list shown below = index 1..3 (next 3) by default, expand to all */
  const previewSessions = allSessions.slice(1, 4);
  const displayedSessions = showAllSessions ? allSessions.slice(1) : previewSessions;
  const hasMoreSessions = allSessions.length > 4;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 5  && h < 12) return "Morning";
    if (h >= 12 && h < 17) return "Afternoon";
    if (h >= 17 && h < 21) return "Evening";
    return "Hey";
  };

  const username = (studentProfile?.name || studentProfile?.username)
    ? getStudentDisplayName(studentProfile)
    : "Scholar";

  const handleAgentChatClick = (agent: typeof agents[0]) => {
    if (agent.is_onboarding_complete === false) {
      setOnboardingModal({
        originalSubject: agent.subject,
        grade:           agent.grade,
      });
    } else {
      // Hold navigation until the backend assigns the real session_id, then
      // jump straight to /student/chat/{id} so the greeting streams with the
      // normal typing effect (no mid-stream URL swap / remount).
      startNewChatSession(agent, (sessionId) => {
        router.push(`/student/chat/${sessionId}`);
      });
    }
  };

  const handleAgentVoiceClick = (agent: typeof agents[0]) => {
    if (agent.is_onboarding_complete === false) {
      setOnboardingModal({
        originalSubject: agent.subject,
        grade:           agent.grade,
      });
    } else {
      openNewSession(agent, "voice");
      router.push(`/student/voice?agent=${agent.agent_id}`);
    }
  };

  const handleSessionClick = (session: typeof allSessions[0]) => {
    openExistingChat(session);
    // Voice sessions reopen in the voice UI; chat sessions in the chat UI.
    // router.push (not window.location.href) — the full reload used to
    // discard the SPA cache and re-fetch every script on each session open.
    router.push(sessionRoutePath(session));
  };

  const fade = (d = 0) => ({
    opacity:   mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(14px)",
    // Scoped to opacity/transform (was `all`, which tweens every layout
    // property on mount) and shortened — see the `mounted` init below for
    // why this can no longer gate initial paint.
    transition: `opacity 0.35s cubic-bezier(0.22,1,0.36,1) ${d}s, transform 0.35s cubic-bezier(0.22,1,0.36,1) ${d}s`,
  });


  return (
    <div className="flex h-screen overflow-hidden relative" style={{ fontFamily: "var(--font-body)", background: C.pageBg }}>

      <SessionStartingOverlay />

      {/* ── SIDEBAR ── */}
      <StudentHomeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />

      {/* ── MAIN ── */}
      <main className="flex-1 overflow-hidden flex flex-col relative min-w-0">
        <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
        {showConfetti && (
          <motion.img
            src="/loaders/journey/char-trophy.svg"
            alt=""
            aria-hidden="true"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 16 }}
            className="absolute inset-0 m-auto z-50 w-28 h-28 object-contain pointer-events-none drop-shadow-xl"
          />
        )}

        {/* Mobile / collapsed topbar */}
        {!sidebarOpen && (
          <div
            className="flex md:hidden items-center flex-shrink-0 border-b relative z-20"
            style={{ padding: "12px 16px", borderColor: C.border, background: C.card }}
          >
            {/* hamburger on left */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center rounded-[10px] cursor-pointer text-base transition-all flex-shrink-0"
              style={{ width: 38, height: 38, background: C.pageBg, border: `1px solid ${C.border}`, color: C.textMid }}
              title="Open sidebar"
            >
              <Menu size={16} strokeWidth={1.75} />
            </button>

            {/* Logo centered */}
            <div className="flex-1 flex justify-center">
              <Image src="/Logo.svg" alt="GenEd" width={90} height={32} style={{ height: 32, width: "auto" }} priority />
            </div>

            {/* Notification bell + profile on right, balancing the hamburger */}
            <div className="flex-shrink-0 flex items-center gap-2">
              {studentProfile?.user_id && (
                <NotificationBell userId={studentProfile.user_id} align="right" />
              )}
              <div
                className="cursor-pointer"
                onClick={() => router.push("/student/profile")}
                style={{
                  width: 38, height: 38, borderRadius: "50%", overflow: "hidden",
                  border: "2px solid white", boxShadow: `0 2px 8px ${C.sun}30`,
                }}
              >
                {avatarId === "graduate-girl" ? (
                  <img
                    src="/avatars/girl-graduate.png"
                    alt="Student avatar"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <StudentAvatarIllustration bg={C.sun} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── SCROLLABLE CONTENT ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* bg decoration */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${C.genPurple}06 0%, transparent 70%)` }} />

          {/* Content container — wider on large screens, proper padding */}
          <div className="w-full mx-auto" style={{ maxWidth: 860, padding: sidebarOpen ? "36px 40px 48px" : "24px 16px 40px" }}>

            {/* ── GREETING HEADER ── */}
            <div className="flex items-start justify-between mb-8 relative z-20" style={fade(0.06)}>
              <div>
                <h1 className="font-extrabold leading-tight m-0"
                  style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: "clamp(22px, 3vw, 34px)" }}>
                  {getGreeting()}, {username}!
                </h1>
                <p className="mt-2 font-medium leading-relaxed" style={{ color: C.textMid, fontSize: "clamp(13px, 1.4vw, 15px)" }}>
                  What would you like to learn today?
                </p>
              </div>
              <div className={`flex-shrink-0 items-center gap-3 ml-4 ${sidebarOpen ? "flex" : "hidden md:flex"}`}>
                {studentProfile?.user_id && (
                  <NotificationBell userId={studentProfile.user_id} align="right" />
                )}
                <div
                  className="cursor-pointer"
                  onClick={() => router.push("/student/profile")}
                  style={{
                    width: 56, height: 56, borderRadius: "50%", overflow: "hidden",
                    border: "3px solid white", boxShadow: `0 8px 24px ${C.sun}30`,
                  }}
                >
                  {avatarId === "graduate-girl" ? (
                    <img
                      src="/avatars/girl-graduate.png"
                      alt="Student avatar"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <StudentAvatarIllustration bg={C.sun} />
                  )}
                </div>
              </div>
            </div>

            {/* ── STAT STRIP ── */}
            <div className="mb-8" style={{ ...fade(0.14) }}>
              <StreakStats data={studentStats} isLoading={isStatsLoading} variant="card" />
            </div>

            {/* ── CONTINUE LEARNING ── */}
            {isSessionsLoading && !continueSession && (
              <div className="rounded-[20px] mb-8 animate-pulse"
                style={{ background: C.card, border: `1px solid ${C.border}`, padding: "clamp(16px, 2vw, 24px)" }}>
                <div className="flex items-center pl-3" style={{ gap: "clamp(12px, 2vw, 20px)" }}>
                  <div className="rounded-full flex-shrink-0" style={{ width: 60, height: 60, background: C.border + "50" }} />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="rounded" style={{ height: 10, width: 100, background: C.border + "40" }} />
                    <div className="rounded" style={{ height: 16, width: "70%", background: C.border + "60" }} />
                    <div className="rounded" style={{ height: 10, width: 120, background: C.border + "30" }} />
                  </div>
                  <div className="rounded-xl flex-shrink-0" style={{ width: 40, height: 40, background: C.border + "40" }} />
                </div>
              </div>
            )}
            {continueSession && (
              <div
                className="rounded-[20px] relative overflow-hidden cursor-pointer mb-8"
                style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  padding: "clamp(16px, 2vw, 24px)",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                  ...fade(0.22),
                  transition: `all 0.55s cubic-bezier(0.22,1,0.36,1) 0.22s, box-shadow 0.2s, transform 0.2s`,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 24px rgba(91,77,199,0.12)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 10px rgba(0,0,0,0.05)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
                onClick={() => handleSessionClick(continueSession)}
              >
                <div className="absolute top-0 left-0 w-1 h-full"
                  style={{ background: `linear-gradient(to bottom, ${C.genPurple}, ${C.genBlue})`, borderRadius: "20px 0 0 20px" }} />
                <div className="flex items-center pl-3" style={{ gap: "clamp(12px, 2vw, 20px)" }}>
                  <div className="relative flex-shrink-0">
                    <ProgressRing percent={continueSession.mastery} size={60} stroke={5} color={C.genPurple} />
                    <div className="absolute inset-0 flex items-center justify-center font-extrabold"
                      style={{ color: C.genPurple, fontFamily: "var(--font-display)", fontSize: "clamp(11px, 1.2vw, 14px)" }}>
                      {continueSession.mastery}%
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold uppercase mb-1"
                      style={{ color: C.genPurple, letterSpacing: "1.2px", fontSize: "clamp(9px, 0.9vw, 11px)" }}>
                      Continue learning
                    </div>
                    <div className="font-bold truncate"
                      style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: "clamp(14px, 1.6vw, 18px)" }}>
                      <span title={isVoiceSession(continueSession) ? "Voice session" : "Chat session"} style={{ marginRight: 5 }}>
                        {isVoiceSession(continueSession) ? "🎤" : "💬"}
                      </span>
                      {continueSession.title} — {continueSession.vis.label}
                    </div>
                    <div className="mt-1" style={{ color: C.textMuted, fontSize: "clamp(11px, 1vw, 13px)" }}>
                      Last studied {timeAgo(continueSession.lastActive)}
                    </div>
                  </div>
                  <div className="rounded-xl flex-shrink-0 flex items-center justify-center text-white font-semibold"
                    style={{
                      background: `linear-gradient(135deg, ${C.genPurple}, ${C.genBlue})`,
                      width: "clamp(36px, 3.5vw, 46px)", height: "clamp(36px, 3.5vw, 46px)",
                      fontSize: "clamp(14px, 1.4vw, 18px)",
                    }}>
                    →
                  </div>
                </div>
              </div>
            )}

            {/* ── MY SUBJECTS ── */}
            <div className="mb-8" style={fade(0.30)}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold uppercase m-0" style={{ color: C.textMuted, letterSpacing: "1.5px", fontSize: "clamp(10px, 1vw, 12px)" }}>
                  My subjects
                </h2>
              </div>

              {isAgentsLoading ? (
                <div className="flex flex-row overflow-x-auto" style={{ gap: "clamp(10px, 1.5vw, 16px)" }}>
                  {[1, 2].map((n) => (
                    <div key={n} className="rounded-[18px] animate-pulse flex-shrink-0"
                      style={{ background: C.card, border: `1px solid ${C.border}`, padding: "clamp(16px, 2vw, 22px)", width: "clamp(280px, calc(50% - 8px), 460px)" }}>
                      <div className="flex items-center mb-4" style={{ gap: "clamp(10px, 1.2vw, 14px)" }}>
                        <div className="rounded-[14px]" style={{ background: C.border + "50", width: "clamp(40px, 4vw, 48px)", height: "clamp(40px, 4vw, 48px)" }} />
                        <div className="flex flex-col gap-2">
                          <div className="rounded" style={{ background: C.border + "60", height: 14, width: 100 }} />
                          <div className="rounded" style={{ background: C.border + "40", height: 10, width: 130 }} />
                        </div>
                      </div>
                      <div className="flex items-center mb-4" style={{ gap: 10 }}>
                        <div className="flex-1 rounded-full" style={{ height: 7, background: C.border + "30" }} />
                        <div className="rounded" style={{ height: 12, width: 28, background: C.border + "40" }} />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 rounded-[11px]" style={{ height: 34, background: C.border + "30" }} />
                        <div className="flex-1 rounded-[11px]" style={{ height: 34, background: C.border + "50" }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : agents.length > 0 ? (
                <div className="relative">
                  {agents.length > 2 && (
                    <>
                      <button
                        onClick={() => scrollSubjects("left")}
                        aria-label="Scroll subjects left"
                        className="hidden md:flex items-center justify-center absolute z-10 rounded-full cursor-pointer"
                        style={{
                          left: -16, top: "50%", transform: "translateY(-50%)",
                          width: 34, height: 34, background: C.card, border: `1px solid ${C.border}`,
                          color: C.textMid, boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        }}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={() => scrollSubjects("right")}
                        aria-label="Scroll subjects right"
                        className="hidden md:flex items-center justify-center absolute z-10 rounded-full cursor-pointer"
                        style={{
                          right: -16, top: "50%", transform: "translateY(-50%)",
                          width: 34, height: 34, background: C.card, border: `1px solid ${C.border}`,
                          color: C.textMid, boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        }}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}
                  <div ref={subjectsScrollRef} className="flex flex-row overflow-x-auto" style={{ gap: "clamp(10px, 1.5vw, 16px)", scrollSnapType: "x mandatory" }}>
                    {agents.map((agent) => {
                    const vis = agent.vis;
                    const hov = hoveredAgent === agent.agent_id;
                    const mastery = typeof agent.subject_coverage_percentage === "number"
                      ? Math.round(agent.subject_coverage_percentage)
                      : 0;
                    return (
                      <div key={agent.agent_id}
                        onMouseEnter={() => setHoveredAgent(agent.agent_id)}
                        onMouseLeave={() => setHoveredAgent(null)}
                        className="rounded-[18px] cursor-pointer flex-shrink-0"
                        style={{
                          background: C.card,
                          border: `1px solid ${hov ? vis.color + "60" : C.border}`,
                          padding: "clamp(16px, 2vw, 22px)",
                          width: "clamp(280px, calc(50% - 8px), 460px)",
                          transform: hov ? "translateY(-3px)" : "none",
                          boxShadow: hov ? `0 10px 30px ${vis.color}18` : "0 1px 5px rgba(0,0,0,0.04)",
                          transition: "all 0.25s ease",
                          scrollSnapAlign: "start",
                        }}>
                        <div className="flex items-center mb-4" style={{ gap: "clamp(10px, 1.2vw, 14px)" }}>
                          <div className="rounded-[14px] flex items-center justify-center flex-shrink-0"
                            style={{ background: vis.bg, width: "clamp(40px, 4vw, 48px)", height: "clamp(40px, 4vw, 48px)", fontSize: "clamp(18px, 2vw, 24px)" }}>
                            {vis.icon}
                          </div>
                          <div>
                            <div className="font-bold" style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: "clamp(14px, 1.5vw, 17px)" }}>
                              {vis.label}
                            </div>
                            <div className="font-medium mt-0.5" style={{ color: C.textMuted, fontSize: "clamp(10px, 1vw, 12px)" }}>
                              Grade {agent.grade} · {agent.document_titles?.length ?? 0} chapters
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center mb-4" style={{ gap: 10 }}>
                          <div className="flex-1 rounded-full overflow-hidden" style={{ height: 7, background: vis.color + "14" }}>
                            <div className="h-full rounded-full transition-all duration-1000"
                              style={{ width: `${mastery}%`, background: `linear-gradient(90deg, ${vis.color}cc, ${vis.color})` }} />
                          </div>
                          <span className="font-bold flex-shrink-0" style={{ color: vis.color, fontSize: "clamp(12px, 1.2vw, 14px)" }}>{mastery}%</span>
                        </div>
                        <div className="flex gap-2 w-full mt-2">
                          <Button
                            variant="secondary"
                            fullWidth
                            onClick={() => handleAgentChatClick(agent)}
                            style={{
                              border: `1.5px solid ${vis.color}40`,
                              background: hov ? `${vis.color}10` : "transparent",
                              color: vis.color,
                              fontSize: "clamp(11px, 1.1vw, 13px)",
                            }}
                          >
                            Chat
                          </Button>
                          <Button
                            variant="primary"
                            fullWidth
                            onClick={() => handleAgentVoiceClick(agent)}
                            style={{
                              fontSize: "clamp(11px, 1.1vw, 13px)",
                              boxShadow: hov ? `0 4px 12px ${STUDENT_COLORS.primary}30` : "none",
                            }}
                          >
                            Voice
                          </Button>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed p-10 text-center" style={{ borderColor: C.border }}>
                  <p className="text-sm font-semibold" style={{ color: C.textMid }}>No subjects available yet</p>
                  <p className="text-xs mt-1" style={{ color: C.textMuted }}>
                    Connect to a school from your{" "}
                    <button onClick={() => router.push("/student/profile")} className="underline bg-transparent border-none cursor-pointer" style={{ color: C.genPurple }}>
                      Profile
                    </button>{" "}
                    to see subjects.
                  </p>
                </div>
              )}
            </div>

            {/* ── RECENT SESSIONS ── */}
            <div style={fade(0.38)}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold uppercase m-0 flex items-center gap-2" style={{ color: C.textMuted, letterSpacing: "1.5px", fontSize: "clamp(10px, 1vw, 12px)" }}>
                  Recent sessions
                </h2>
              </div>

              {/* Filters UI */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Date Filter */}
                  <FilterDropdown
                    value={filterDate}
                    options={["All Time", "Today", "This Week", "This Month"]}
                    onChange={setFilterDate}
                    activeColor={C.genPurple}
                    defaultColor={C.textMid}
                  />

                  {/* Type Filter */}
                  <FilterDropdown
                    value={filterType === "All" ? "All Types" : filterType === "Voice" ? "Voice Sessions" : "Chat Sessions"}
                    options={["All Types", "Voice Sessions", "Chat Sessions"]}
                    onChange={v => {
                      if (v === "All Types") setFilterType("All");
                      else if (v === "Voice Sessions") setFilterType("Voice");
                      else if (v === "Chat Sessions") setFilterType("Chat");
                    }}
                    activeColor={C.genPurple}
                    defaultColor={C.textMid}
                  />

                  {/* Subject Filter */}
                  <FilterDropdown
                    value={filterSubject === "All" ? "All Subjects" : filterSubject}
                    options={[
                      "All Subjects",
                      ...Array.from(new Set(availableAgents.map((agent) => agent.subject))),
                    ]}
                    onChange={v => {
                      if (v === "All Subjects") setFilterSubject("All");
                      else setFilterSubject(v);
                    }}
                    activeColor={C.genPurple}
                    defaultColor={C.textMid}
                  />

                  {(filterDate !== "All Time" || filterType !== "All" || filterSubject !== "All") && (
                    <button
                      onClick={() => {
                        setFilterDate("All Time");
                        setFilterType("All");
                        setFilterSubject("All");
                      }}
                      className="text-xs font-semibold text-gray-400 hover:text-red-500 bg-transparent border-none cursor-pointer transition-colors"
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                {hasMoreSessions && (
                  <button
                    onClick={() => setShowAllSessions(v => !v)}
                    className="font-semibold cursor-pointer bg-transparent border-none flex-shrink-0"
                    style={{ color: C.genPurple, fontSize: "clamp(11px, 1vw, 13px)" }}>
                    {showAllSessions ? "Show less ↑" : "See all →"}
                  </button>
                )}
              </div>

              {isSessionsLoading ? (
                <div className="flex flex-col" style={{ gap: "clamp(6px, 0.8vw, 10px)" }}>
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="rounded-[14px] flex items-center animate-pulse"
                      style={{
                        background: C.card, border: `1px solid ${C.border}`,
                        padding: "clamp(12px, 1.4vw, 16px) clamp(14px, 1.8vw, 20px)",
                        gap: "clamp(10px, 1.4vw, 16px)",
                      }}>
                      <div className="rounded-full flex-shrink-0" style={{ width: 38, height: 38, background: C.border + "50" }} />
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="rounded" style={{ height: 13, width: "60%", background: C.border + "60" }} />
                        <div className="rounded" style={{ height: 10, width: "35%", background: C.border + "35" }} />
                      </div>
                      <div className="rounded" style={{ height: 10, width: 50, background: C.border + "30" }} />
                    </div>
                  ))}
                </div>
              ) : displayedSessions.length > 0 ? (
                <div className="flex flex-col" style={{ gap: "clamp(6px, 0.8vw, 10px)" }}>
                  {displayedSessions.map(sess => {
                    const vis = sess.vis;
                    return (
                      <div key={sess.id}
                        className="rounded-[14px] flex items-center cursor-pointer"
                        style={{
                          background: C.card, border: `1px solid ${C.border}`,
                          padding: "clamp(12px, 1.4vw, 16px) clamp(14px, 1.8vw, 20px)",
                          gap: "clamp(10px, 1.4vw, 16px)",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                          transition: "box-shadow 0.2s",
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.03)"}
                        onClick={() => handleSessionClick(sess)}
                      >
                        <div className="rounded-[11px] flex items-center justify-center flex-shrink-0"
                          style={{ background: vis.bg, width: "clamp(34px, 3.2vw, 42px)", height: "clamp(34px, 3.2vw, 42px)", fontSize: "clamp(14px, 1.6vw, 18px)" }}>
                          {vis.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate" style={{ color: C.text, fontSize: "clamp(13px, 1.3vw, 15px)" }}>
                            <span title={isVoiceSession(sess) ? "Voice session" : "Chat session"} style={{ marginRight: 5 }}>
                              {isVoiceSession(sess) ? "🎤" : "💬"}
                            </span>
                            {sess.title}
                          </div>
                          <div className="mt-0.5" style={{ color: C.textMuted, fontSize: "clamp(10px, 1vw, 12px)" }}>
                            {vis.label} · {timeAgo(sess.lastActive)}
                          </div>
                        </div>
                        <div className="flex items-center flex-shrink-0" style={{ gap: 8 }}>
                          <div className="relative">
                            <ProgressRing percent={sess.mastery} size={38} stroke={3.5} color={vis.color} />
                            <div className="absolute inset-0 flex items-center justify-center font-bold"
                              style={{ color: vis.color, fontSize: "clamp(9px, 0.9vw, 11px)" }}>
                              {sess.mastery}%
                            </div>
                          </div>
                          <div style={{ color: C.textFaint, fontSize: 18 }}>›</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : allSessions.length <= 1 ? (
                <div className="rounded-2xl p-8 text-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <p style={{ color: C.textMuted, fontSize: 14 }}>No other sessions yet. Keep learning!</p>
                </div>
              ) : null}
            </div>

          </div>
        </div>
      </main>

      {/* ── ONBOARDING MODAL ── */}
      <AnimatePresence>
        {onboardingModal && (
          <OnboardingModal
            subject={onboardingModal.originalSubject}
            grade={onboardingModal.grade}
            onClose={() => setOnboardingModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
