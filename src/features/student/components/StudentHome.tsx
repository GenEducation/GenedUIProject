"use client";

import { FEATURES } from "@/constants/features";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Menu, TrendingUp, Library, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { useStudentStore } from "../store/useStudentStore";
import { useSidebarStore } from "../store/useSidebarStore";
import { getStudentDisplayName } from "../utils/displayName";
import { selectImminentSession } from "../utils/sessionSelection";
import { asError } from "@/utils/errors";
import { learnerService } from "../learner/learnerService";
import { useLessonLaunch } from "../learner/useLessonLaunch";
import { useRecentChapters } from "../learner/useRecentChapters";
import { asLearnerChapter, chapterPercent, continueChapter, subjectName } from "../learner/recentChapters";
import type { RecentChapter } from "../learner/types";
import { RecentChapterRow } from "./chapters/RecentChapterRow";
import { useScheduleStore } from "../store/useScheduleStore";
import { UpcomingSessionPanel } from "./UpcomingSessionPanel";
import { ContinueLearningCard } from "./ContinueLearningCard";
import { useNow } from "@/utils/useNow";
import { StudentAvatar } from "./StudentAvatar";
import { STUDENT_COLORS } from "../theme/colors";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";
import { StudentHomeSidebar } from "./StudentHomeSidebar";
import { StreakStats } from "./StreakStats";
import { useTotalStudyMinutes } from "../hooks/useTotalStudyMinutes";
import { useDebouncedResize } from "@/hooks/useDebouncedResize";
import { NotificationBell } from "@/components/NotificationBell";
import { SessionStartingOverlay } from "./SessionStartingOverlay";
import { Select } from "@/components/ui/Select";
import { subjectMascot, SubjectIcon } from "@/features/subjects/subjectPresentation";
import { subjectsForGrade, useSubjectCatalog, useTaxonomySubjects } from "@/features/subjects/subjectCatalog";
import { GenEdLogo } from "@/components/shared/GenEdLogo";

/* Subject-card mascot: display size, and how far it bleeds above the card.
   The bleed is mirrored as paddingTop on the horizontal scroller, which would
   otherwise clip it — overflow-x:auto forces the vertical axis to auto too. */
const MASCOT_SIZE = "clamp(52px, 6.4vw, 92px)";
const MASCOT_BLEED = 34;

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

/** A home section's eyebrow: a small icon naming the section, then its label. */
function SectionHeading({ icon: Icon, className = "", children }: { icon: LucideIcon; className?: string; children: React.ReactNode }) {
  return (
    <h2
      className={`flex items-center gap-2 font-bold uppercase m-0 ${className}`}
      style={{ color: C.textMuted, letterSpacing: "1.5px", fontSize: "clamp(10px, 1vw, 12px)" }}
    >
      <Icon size={15} strokeWidth={2.2} aria-hidden style={{ color: STUDENT_COLORS.primary }} className="shrink-0" />
      {children}
    </h2>
  );
}

// Raw hex, not var() — these get alpha-suffix concatenated below
// (`${vis.color}cc`, `vis.color + "14"`), which CSS custom properties can't
// support.
// Colour/label only — the glyph comes from SubjectIcon (src/components/icons),
// which already has a drawn icon per subject and a BookOpen fallback.
const SUBJECTS_VISUAL: Record<string, { color: string; bg: string; label: string }> = {
  English:        { color: STUDENT_COLORS.subjectEnglish, bg: "#EBF3FB", label: "English" },
  Mathematics:    { color: "#2D6A4F", bg: "#E8F5EF", label: "Mathematics" },
  Science:        { color: "#D4820A", bg: "#FEF5E7", label: "Science" },
  "Social Science": { color: "#B0543F", bg: "#FBEFEB", label: "Social Science" },
  History:        { color: "#A6762D", bg: "#F6EFE4", label: "History" },
  Geography:      { color: "#1E8FA6", bg: "#E7F5F7", label: "Geography" },
  "Social & Political Science": { color: "#8C4A6B", bg: "#F7EBF1", label: "Social & Political Science" },
};

function subjectVisual(subject: string) {
  return SUBJECTS_VISUAL[subject] ?? {
    color: STUDENT_COLORS.tutor,
    bg: "#F1EEF8",
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

/* ═══ FILTER DROPDOWN ═══ */
/**
 * Thin adapter over the shared <Select>. This used to be a bespoke
 * button+panel implementation with its own radius, shadow and hover colors —
 * one of several such copies across the app. The call-site API (plain string
 * options, active/default color) is kept so the three usages below read the
 * same as before.
 */
function FilterDropdown({ value, options, onChange, activeColor, defaultColor }: { value: string, options: string[], onChange: (v: string) => void, activeColor: string, defaultColor: string }) {
  const isActive = value !== options[0];
  return (
    <Select
      variant="filter"
      size="sm"
      aria-label={options[0]}
      value={value}
      onChange={onChange}
      options={options.map((o) => ({ value: o, label: o }))}
      accentColor={activeColor}
      panelWidth={180}
      className="w-auto"
      buttonClassName="!w-auto"
      buttonStyle={{
        color: isActive ? activeColor : defaultColor,
        padding: "6px 16px",
        fontSize: 14,
      }}
    />
  );
}

/* ═══════════════ MAIN ═══════════════ */
export function StudentHome() {
  const router = useRouter();
  const {
    studentProfile,
    fetchStudentStats,
    openNewChat,
    studentStats, isStatsLoading,
    avatarId,
  } = useStudentStore();
  const { sessions: scheduledSessions, loadScheduledSessions } = useScheduleStore();
  const taxonomy = useTaxonomySubjects(studentProfile?.school_board);
  const catalogLoaded = useSubjectCatalog((s) => s.isLoaded);
  const catalogError = useSubjectCatalog((s) => s.error);
  const { hasEnded, hasDismissedCelebration, dismissCelebration } = useTutorialStore();

  const { sidebarOpen, setSidebarOpen, applyResponsive } = useSidebarStore();
  // `undefined` while loading still shows the card, with 0 until it arrives;
  // `null` (failed) shows "—".
  const totalMinutes = useTotalStudyMinutes(studentProfile?.user_id) ?? (studentProfile?.user_id ? 0 : null);
  const [showConfetti,   setShowConfetti]   = useState(false);
  const [aprilState,     setAprilState]     = useState<AprilState>("idle");
  const [hoveredAgent,   setHoveredAgent]   = useState<string | null>(null);
  // Starts true (not false→effect→true) — content used to render at
  // opacity:0 until a mount effect fired, so any hydration stall extended
  // the blank screen indefinitely. The stagger transition above still plays
  // on genuine visibility changes; it just no longer gates first paint.
  const [mounted,        setMounted]        = useState(true);
  const [showAllRecent,  setShowAllRecent]  = useState(false);
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
  const [filterSubject, setFilterSubject] = useState<string>("All");

  /* responsive sidebar */
  useDebouncedResize(() => applyResponsive(window.innerWidth >= 1024));

  /* data fetch */
  useEffect(() => {
    let cancelled = false;
    if (studentProfile && !cancelled) {
      fetchStudentStats();
      if (FEATURES.schedule) loadScheduledSessions(studentProfile.user_id);
    }
    return () => { cancelled = true; };
  }, [studentProfile]);

  /* Mount */
  useEffect(() => { setMounted(true); }, []);

  /* One-shot confetti — only after a new student's first tour (a replay from Profile doesn't arm it) */
  useEffect(() => {
    if (!hasEnded || hasDismissedCelebration) return;
    setAprilState("celebrating");
    setShowConfetti(true);
    const t = setTimeout(() => setAprilState("idle"), 3000);
    // Mark as seen so it never fires again (persisted in localStorage via Zustand)
    dismissCelebration();
    return () => clearTimeout(t);
  }, [hasEnded, hasDismissedCelebration, dismissCelebration]);

  // Subjects come from the taxonomy for the student's grade: the new backend
  // has no per-student agent list. Each card opens the subject's chapter page
  // (`/student/subjects/{subject}`), which lists what the student's school has
  // published (GET /v1/learner/chapters).
  const studentGrade = studentProfile?.grade;
  const subjectGroups = subjectsForGrade(studentGrade, taxonomy).map((subject) => ({
    key: subject,
    subject,
    grade: studentGrade as number,
    vis: subjectVisual(subject),
  }));
  const isSubjectsLoading = !catalogLoaded && !catalogError;

  /* Recent chapters (GET /v1/learner/recent-chapters): the chapters the student last worked on, newest first.
     The API names subjects by code ("social_science"); match them to the student's own subject names. */
  const recent = useRecentChapters(!!studentProfile);
  const subjectNames = subjectGroups.map((group) => group.subject);
  const recentRows = recent.chapters.map((chapter) => {
    const subject = subjectName(chapter.subject, subjectNames);
    return { chapter, subject, vis: subjectVisual(subject), percent: chapterPercent(chapter) };
  });

  /* Continue learning: the most recently active chapter still in progress, whatever the list's filters. */
  const continueTarget = continueChapter(recent.chapters);
  const continueRow = continueTarget ? recentRows.find((row) => row.chapter === continueTarget) ?? null : null;

  const filteredRecent = recentRows.filter((row) => {
    if (filterSubject !== "All" && row.subject !== filterSubject) return false;
    if (filterDate !== "All Time") {
      const now = new Date();
      const d = new Date(row.chapter.last_active_at);
      if (!isNaN(d.getTime())) {
        const diffDays = (now.getTime() - d.getTime()) / 86400000;
        if (filterDate === "Today" && d.toDateString() !== now.toDateString()) return false;
        if (filterDate === "This Week" && diffDays > 7) return false;
        if (filterDate === "This Month" && diffDays > 30) return false;
      }
    }
    return true;
  });

  // `useNow` (5s) is enough to decide *whether* a countdown belongs in the hero
  // slot; the clock inside the panel runs its own 1s tick. Before mount it
  // returns 0, so the server renders Continue Learning and the panel swaps in
  // on the client — never a hydration mismatch.
  const now = useNow();
  const imminentSession = now === 0 || !FEATURES.schedule
    ? null
    : selectImminentSession(scheduledSessions, now);

  /* The recent list keeps finished chapters and leaves out only the one in the Continue card above. */
  const recentList = filteredRecent.filter((row) => row.chapter.instance_id !== continueRow?.chapter.instance_id);
  const displayedRecent = showAllRecent ? recentList : recentList.slice(0, 3);
  const hasMoreRecent = recentList.length > 3;

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

  const openSubject = (subject: string) => {
    router.push(`/student/subjects/${encodeURIComponent(subject)}`);
  };

  /* Open a recent chapter: its own lesson when in progress or finished (to review); a fresh one if abandoned. */
  const launchLesson = useLessonLaunch((st) => st.launch);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const openRecent = async (chapter: RecentChapter, subject: string) => {
    if (openingId) return;
    setOpenError(null);
    setOpeningId(chapter.instance_id);
    try {
      const instanceId = chapter.state === "abandoned"
        ? (await learnerService.openChapter(chapter.chapter_id)).id
        : chapter.instance_id;
      launchLesson(instanceId, asLearnerChapter(chapter), subject);
      router.push(`/student/lesson/${encodeURIComponent(instanceId)}`);
    } catch (e) {
      setOpenError(asError(e).message || "That chapter couldn't open. Try again.");
      setOpeningId(null);
    }
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

        {/* Mobile / collapsed topbar */}
        {!sidebarOpen && (
          <div
            className="flex md:hidden items-center flex-shrink-0 border-b relative z-20"
            style={{ padding: "12px 16px", borderColor: C.border, background: C.card }}
          >
            {/* hamburger on left */}
            <button aria-label="Open sidebar"
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center rounded-[10px] cursor-pointer text-base transition-all flex-shrink-0"
              style={{ width: 38, height: 38, background: C.pageBg, border: `1px solid ${C.border}`, color: C.textMid }}
              title="Open sidebar"
            >
              <Menu size={16} strokeWidth={1.75} />
            </button>

            {/* Logo centered */}
            <div className="flex-1 flex justify-center">
              <GenEdLogo height={38} priority />
            </div>

            {/* Notification bell on right, balancing the hamburger. The
                sidebar's Profile nav item is the only profile entry point. */}
            <div className="flex-shrink-0 flex items-center justify-end" style={{ minWidth: 38 }}>
              {studentProfile?.user_id && (
                <NotificationBell userId={studentProfile.user_id} align="right" />
              )}
            </div>
          </div>
        )}

        {/* ── SCROLLABLE CONTENT ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* bg decoration */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${C.genPurple}06 0%, transparent 70%)` }} />

          {/* Content container — wider on large screens, proper padding */}
          <div className="w-full mx-auto" style={{ maxWidth: 1360, padding: sidebarOpen ? "32px clamp(20px, 3vw, 40px) 48px" : "24px clamp(16px, 3vw, 40px) 40px" }}>

            {/* ── GREETING HEADER ── */}
            <div className="flex items-start justify-between mb-8 relative z-20" style={fade(0.06)}>
              <div className="flex items-center gap-4">
                {/* Hidden on small screens: the greeting already clamps down to
                    22px there and an avatar beside it crowds the line. Sized to
                    the greeting block beside it (heading + subtitle, both of
                    which scale with the viewport), so the two read as one unit
                    rather than a small circle next to a taller block of text. */}
                <div className="hidden md:flex flex-shrink-0 rounded-full overflow-hidden"
                  style={{ width: "clamp(52px, calc(6vw + 8px), 72px)", aspectRatio: "1", border: "2px solid white", boxShadow: `0 0 0 3px ${STUDENT_COLORS.softSurface}, 0 6px 16px rgb(7 94 99 / 0.18)` }}>
                  <StudentAvatar id={avatarId} size={72} />
                </div>
                <div>
                  <h1 className="font-extrabold leading-tight m-0"
                    style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: "clamp(22px, 3vw, 34px)" }}>
                    {getGreeting()}, <span className="citron-mark">{username}</span>!
                  </h1>
                  <p className="mt-2 font-medium leading-relaxed" style={{ color: C.textMid, fontSize: "clamp(13px, 1.4vw, 15px)" }}>
                    What would you like to learn today?
                  </p>
                </div>
              </div>
              <div className={`flex-shrink-0 items-center gap-3 ml-4 ${sidebarOpen ? "flex" : "hidden md:flex"}`}>
                {studentProfile?.user_id && (
                  <NotificationBell userId={studentProfile.user_id} align="right" />
                )}
              </div>
            </div>

            {/* ── CONTINUE LEARNING ── */}
            {imminentSession && (
              <UpcomingSessionPanel session={imminentSession} style={fade(0.14)} />
            )}

            {!imminentSession && recent.loading && !continueRow && (
              <div className="rounded-[22px] mb-8 animate-pulse"
                style={{ background: C.card, border: `1px solid ${C.border}`, padding: "clamp(18px, 2.4vw, 28px)" }}>
                <div className="flex flex-col gap-3" style={{ maxWidth: "min(66%, 800px)" }}>
                  <div className="rounded" style={{ height: 10, width: 150, background: C.border + "40" }} />
                  <div className="rounded" style={{ height: 26, width: "70%", background: C.border + "60" }} />
                  <div className="rounded" style={{ height: 12, width: 220, background: C.border + "30" }} />
                  <div className="rounded-full mt-3" style={{ height: 8, width: "100%", background: C.border + "40" }} />
                  <div className="rounded-full mt-3" style={{ height: 44, width: 200, background: C.border + "50" }} />
                </div>
              </div>
            )}
            {!imminentSession && continueRow && (
              <ContinueLearningCard
                session={{ title: continueRow.chapter.chapter_title, mastery: continueRow.percent, vis: continueRow.vis }}
                gradeLabel={
                  studentProfile?.grade
                    ? `Grade ${studentProfile.grade}${studentProfile.school_board ? ` ${studentProfile.school_board}` : ""}`
                    : undefined
                }
                lastStudied={timeAgo(continueRow.chapter.last_active_at)}
                onStart={() => void openRecent(continueRow.chapter, continueRow.subject)}
                style={fade(0.14)}
              />
            )}

            {/* ── STAT STRIP ── */}
            <div className="mb-8" style={{ ...fade(0.22) }}>
              <SectionHeading icon={TrendingUp} className="mb-4">Your progress</SectionHeading>
              <StreakStats data={studentStats} isLoading={isStatsLoading} variant="card" totalMinutes={totalMinutes} />
            </div>

            {/* ── MY SUBJECTS ── */}
            <div className="mb-8" style={fade(0.30)}>
              <div className="flex items-center justify-between mb-4">
                <SectionHeading icon={Library}>My subjects</SectionHeading>
              </div>

              {isSubjectsLoading ? (
                <div className="flex flex-row overflow-x-auto" style={{ gap: "clamp(10px, 1.5vw, 16px)" }}>
                  {[1, 2].map((n) => (
                    <div key={n} className="rounded-[18px] animate-pulse flex-shrink-0"
                      style={{ background: C.card, border: `1px solid ${C.border}`, padding: "clamp(16px, 2vw, 22px)", width: "clamp(240px, calc(25% - 12px), 300px)" }}>
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
              ) : subjectGroups.length > 0 ? (
                <div className="relative">
                  {subjectGroups.length > 4 && (
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
                  <div ref={subjectsScrollRef} className="citron-scroll flex flex-row overflow-x-auto" style={{ gap: "clamp(10px, 1.5vw, 16px)", scrollSnapType: "x mandatory", paddingTop: MASCOT_BLEED }}>
                    {subjectGroups.map((group) => {
                    const vis = group.vis;
                    const hov = hoveredAgent === group.key;
                    return (
                      // A card-sized hit target, not a CTA: the shared <Button> would impose its sizing.
                      // eslint-disable-next-line no-restricted-syntax
                      <button key={group.key}
                        type="button"
                        onClick={() => openSubject(group.subject)}
                        onMouseEnter={() => setHoveredAgent(group.key)}
                        onMouseLeave={() => setHoveredAgent(null)}
                        onFocus={() => setHoveredAgent(group.key)}
                        onBlur={() => setHoveredAgent(null)}
                        aria-label={`${vis.label}: see chapters`}
                        className="rounded-[18px] cursor-pointer flex-shrink-0 relative text-left outline-none focus-visible:ring-2"
                        style={{
                          background: C.card,
                          border: `1px solid ${hov ? vis.color + "60" : C.border}`,
                          padding: "clamp(16px, 2vw, 22px)",
                          width: "clamp(240px, calc(25% - 12px), 300px)",
                          transform: hov ? "translateY(-3px)" : "none",
                          boxShadow: hov ? `0 10px 30px ${vis.color}18` : "0 1px 5px rgba(0,0,0,0.04)",
                          transition: "all 0.25s ease",
                          scrollSnapAlign: "start",
                        }}>
                        <Image
                          src={subjectMascot(group.subject)}
                          alt=""
                          aria-hidden="true"
                          width={300}
                          height={300}
                          // Already a hand-sized 300px WebP (~24KB); the Next
                          // optimizer only accepts widths from its device/image
                          // size arrays and 400s on 300, so serve it directly.
                          unoptimized
                          className="absolute pointer-events-none select-none"
                          style={{
                            width: MASCOT_SIZE,
                            height: MASCOT_SIZE,
                            objectFit: "contain",
                            top: `calc(-1 * ${MASCOT_BLEED}px)`,
                            right: 8,
                            transform: hov ? "translateY(-4px) scale(1.04)" : "none",
                            transition: "transform 0.25s ease",
                            filter: "drop-shadow(0 6px 14px rgba(16,20,32,0.12))",
                          }}
                        />
                        <div className="flex items-center mb-4" style={{ gap: "clamp(10px, 1.2vw, 14px)", paddingRight: "calc(" + MASCOT_SIZE + " - 26px)" }}>
                          <div className="rounded-[14px] flex items-center justify-center flex-shrink-0"
                            style={{ background: vis.bg, width: "clamp(40px, 4vw, 48px)", height: "clamp(40px, 4vw, 48px)", color: vis.color }}>
                            <SubjectIcon subject={group.subject} size={22} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold truncate" title={vis.label} style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: "clamp(14px, 1.5vw, 17px)" }}>
                              {vis.label}
                            </div>
                            <div className="font-medium mt-0.5 truncate" style={{ color: C.textMuted, fontSize: "clamp(10px, 1vw, 12px)" }}>
                              Grade {group.grade}
                            </div>
                          </div>
                        </div>
                        <div
                          className="flex items-center justify-between rounded-[10px] font-bold"
                          style={{
                            padding: "9px 12px",
                            background: hov ? `${vis.color}14` : `${vis.color}0A`,
                            color: vis.color,
                            fontSize: "clamp(11px, 1.1vw, 13px)",
                            transition: "background 0.25s ease",
                          }}
                        >
                          See chapters
                          <ChevronRight size={16} strokeWidth={2.5} style={{ transform: hov ? "translateX(3px)" : "none", transition: "transform 0.25s ease" }} />
                        </div>
                      </button>
                    );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed p-10 text-center" style={{ borderColor: C.border }}>
                  <p className="text-sm font-semibold" style={{ color: C.textMid }}>
                    {catalogError ? "We couldn't load your subjects" : "No subjects available yet"}
                  </p>
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

            {/* ── RECENT CHAPTERS ── */}
            <div style={fade(0.38)}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="citron-eyebrow font-bold uppercase m-0" style={{ color: C.textMuted, letterSpacing: "1.5px", fontSize: "clamp(10px, 1vw, 12px)" }}>
                  Recent chapters
                </h2>
              </div>

              {/* Filters UI */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <FilterDropdown
                    value={filterDate}
                    options={["All Time", "Today", "This Week", "This Month"]}
                    onChange={setFilterDate}
                    activeColor={C.genPurple}
                    defaultColor={C.textMid}
                  />
                  <FilterDropdown
                    value={filterSubject === "All" ? "All Subjects" : filterSubject}
                    options={["All Subjects", ...subjectNames]}
                    onChange={(v) => setFilterSubject(v === "All Subjects" ? "All" : v)}
                    activeColor={C.genPurple}
                    defaultColor={C.textMid}
                  />
                  {(filterDate !== "All Time" || filterSubject !== "All") && (
                    <button
                      onClick={() => {
                        setFilterDate("All Time");
                        setFilterSubject("All");
                      }}
                      className="text-xs font-semibold text-gray-400 hover:text-red-500 bg-transparent border-none cursor-pointer transition-colors"
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                {hasMoreRecent && (
                  <button
                    onClick={() => setShowAllRecent((v) => !v)}
                    className="font-semibold cursor-pointer bg-transparent border-none flex-shrink-0"
                    style={{ color: C.genPurple, fontSize: "clamp(11px, 1vw, 13px)" }}>
                    {showAllRecent ? "Show less ↑" : "See all →"}
                  </button>
                )}
              </div>

              {openError && (
                <p role="alert" className="mb-3 text-[13px]" style={{ color: C.coral }}>{openError}</p>
              )}

              {recent.loading && recent.chapters.length === 0 ? (
                <div className="flex flex-col" style={{ gap: "clamp(6px, 0.8vw, 10px)" }} aria-busy="true">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="rounded-[14px] flex items-center animate-pulse"
                      style={{
                        background: C.card, border: `1px solid ${C.border}`,
                        padding: "clamp(10px, 1.2vw, 14px) clamp(12px, 1.6vw, 18px)",
                        gap: "clamp(10px, 1.4vw, 16px)",
                      }}>
                      <div className="rounded-[10px] flex-shrink-0" style={{ width: 72, aspectRatio: "16 / 10", background: C.border + "50" }} />
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="rounded" style={{ height: 13, width: "60%", background: C.border + "60" }} />
                        <div className="rounded" style={{ height: 10, width: "35%", background: C.border + "35" }} />
                      </div>
                      <div className="rounded-full" style={{ height: 38, width: 38, background: C.border + "30" }} />
                    </div>
                  ))}
                </div>
              ) : recent.error && recent.chapters.length === 0 ? (
                <div className="rounded-2xl p-6 text-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <p style={{ color: C.textMuted, fontSize: 14 }}>Your recent chapters couldn&apos;t load.</p>
                  <button
                    onClick={() => void recent.refresh()}
                    className="mt-2 font-semibold bg-transparent border-none cursor-pointer"
                    style={{ color: C.genPurple, fontSize: 13 }}
                  >
                    Try again
                  </button>
                </div>
              ) : displayedRecent.length > 0 ? (
                <div className="flex flex-col" style={{ gap: "clamp(6px, 0.8vw, 10px)" }}>
                  {displayedRecent.map((row) => (
                    <RecentChapterRow
                      key={row.chapter.instance_id}
                      chapter={row.chapter}
                      subjectLabel={row.vis.label}
                      color={row.vis.color}
                      when={timeAgo(row.chapter.last_active_at)}
                      opening={openingId === row.chapter.instance_id}
                      disabled={!!openingId}
                      onOpen={(chapter) => void openRecent(chapter, row.subject)}
                      onCardExpired={() => void recent.refresh()}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl p-8 text-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <p style={{ color: C.textMuted, fontSize: 14 }}>
                    {recentRows.length === 0
                      ? "No chapters yet. Pick a subject above to start your first one!"
                      : recentList.length === 0 && filteredRecent.length > 0
                        ? "No other chapters yet. Keep learning!"
                        : "No chapters match these filters."}
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
