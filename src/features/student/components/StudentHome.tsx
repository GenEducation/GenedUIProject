"use client";

import { FEATURES } from "@/constants/features";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PanelLeftOpen, Library, type LucideIcon } from "lucide-react";
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
import { useChaptersCompleted } from "../hooks/useChaptersCompleted";
import { useDebouncedResize } from "@/hooks/useDebouncedResize";
import { NotificationBell } from "@/components/NotificationBell";
import { SessionStartingOverlay } from "./SessionStartingOverlay";
import { GuardianInvitePopup } from "./guardian/GuardianInvitePopup";
import { subjectArt } from "@/features/subjects/subjectPresentation";
import { SubjectCard, SUBJECT_ART_OVERHANG } from "./SubjectCard";
import { EMPTY_RECENT_ART } from "../theme/progressArt";
import { ERROR_ART, NO_SUBJECTS_ART, WELCOME_ABOARD_ART } from "../theme/momentArt";
import { MomentArt } from "@/components/shared/MomentArt";
import { Button } from "@/components/ui/Button";
import { StreakCelebration } from "./StreakCelebration";
import { subjectsForGrade, useSubjectCatalog, useTaxonomySubjects } from "@/features/subjects/subjectCatalog";
import { ZooviLogo } from "@/components/shared/ZooviLogo";


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
// Colour/label only — the subject cards show the subject's paper diorama
// (subjectArt, SubjectCard), not a glyph.
/** Each subject's mark on the dashboard, in the logo's own colours (theme/colors.ts). */
const SUBJECTS_VISUAL: Record<string, { color: string; label: string }> = {
  English:        { color: STUDENT_COLORS.logoDark, label: "English" },
  Mathematics:    { color: STUDENT_COLORS.accentDeep, label: "Mathematics" },
  Science:        { color: STUDENT_COLORS.logoGoldInk, label: "Science" },
  "Social Science": { color: STUDENT_COLORS.growth, label: "Social Science" },
  History:        { color: STUDENT_COLORS.logoDeep, label: "History" },
  Geography:      { color: STUDENT_COLORS.tutorSoft, label: "Geography" },
  "Social & Political Science": { color: STUDENT_COLORS.tutorLight, label: "Social & Political Science" },
};

function subjectVisual(subject: string) {
  return SUBJECTS_VISUAL[subject] ?? { color: STUDENT_COLORS.tutor, label: subject };
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

/* ═══ WELCOME ABOARD ═══ */
/** After a new student's first tour: a paper kite lifting off, then it fades away (or on a tap). */
function WelcomeAboard({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const fade = setTimeout(() => setLeaving(true), 2800);
    const done = setTimeout(onDone, 3200);
    return () => { clearTimeout(fade); clearTimeout(done); };
  }, [onDone]);
  return (
    <div
      role="status"
      onClick={() => { setLeaving(true); setTimeout(onDone, 400); }}
      className="absolute inset-0 z-50 flex items-center justify-center p-6 transition-opacity duration-400"
      style={{ opacity: leaving ? 0 : 1, background: "rgba(247,244,234,0.55)", backdropFilter: "blur(2px)" }}
    >
      <div
        className="lesson-rise flex flex-col items-center rounded-[28px] px-8 pb-7 pt-5 text-center shadow-[0_18px_50px_rgba(29,99,21,0.16)]"
        style={{ background: C.card, border: `1px solid ${C.border}` }}
      >
        <MomentArt art={WELCOME_ABOARD_ART} width={170} float />
        <p className="m-0 mt-1 text-[22px] font-extrabold" style={{ color: C.text, fontFamily: "var(--font-display)" }}>
          You&apos;re all set!
        </p>
        <p className="m-0 mt-1 text-[14px]" style={{ color: C.textMid }}>Let&apos;s start learning.</p>
      </div>
    </div>
  );
}

/* ═══ FILTER DROPDOWN ═══ */
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
  const chapters = useChaptersCompleted(studentProfile?.user_id) ?? null;
  const [showConfetti,   setShowConfetti]   = useState(false);
  const [aprilState,     setAprilState]     = useState<AprilState>("idle");
  // Starts true (not false→effect→true) — content used to render at
  // opacity:0 until a mount effect fired, so any hydration stall extended
  // the blank screen indefinitely. The stagger transition above still plays
  // on genuine visibility changes; it just no longer gates first paint.
  const [mounted,        setMounted]        = useState(true);

  // Filters

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

  const hideCelebration = useCallback(() => setShowConfetti(false), []);

  /* One-shot "welcome aboard" — only after a new student's first tour (a replay from Profile doesn't arm it) */
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

  // `useNow` (5s) is enough to decide *whether* a countdown belongs in the hero
  // slot; the clock inside the panel runs its own 1s tick. Before mount it
  // returns 0, so the server renders Continue Learning and the panel swaps in
  // on the client — never a hydration mismatch.
  const now = useNow();
  const imminentSession = now === 0 || !FEATURES.schedule
    ? null
    : selectImminentSession(scheduledSessions, now);

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
  const offerRevisit = useLessonLaunch((st) => st.offerRevisit);
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
      offerRevisit(instanceId);
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
      {/* After onboarding: tells a student whose verified parent email has no account yet how they connect. */}
      <GuardianInvitePopup />

      {/* ── SIDEBAR ── */}
      <StudentHomeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />

      {/* ── MAIN ── */}
      <main className="flex-1 overflow-hidden flex flex-col relative min-w-0">
        {showConfetti && <WelcomeAboard onDone={hideCelebration} />}
        <StreakCelebration userId={studentProfile?.user_id} stats={studentStats} held={showConfetti} />

        {/* Mobile / collapsed topbar */}
        {!sidebarOpen && (
          <div
            className="flex md:hidden items-center flex-shrink-0 border-b relative z-20"
            style={{ padding: "12px 16px", borderColor: C.border, background: C.card }}
          >
            {/* hamburger on left */}
            <button aria-label="Open sidebar"
              onClick={() => setSidebarOpen(true)}
              className="sidebar-toggle flex items-center justify-center rounded-[10px] border-none cursor-pointer flex-shrink-0"
              style={{ width: 38, height: 38 }}
              title="Open sidebar"
            >
              <PanelLeftOpen size={18} strokeWidth={1.75} />
            </button>

            {/* Logo centered */}
            <div className="flex-1 flex justify-center">
              <ZooviLogo height={38} priority />
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

            {/* ── GREETING ── one quiet line: the avatar and the student's name (the hero below says what to do) */}
            <div className="flex items-center justify-between mb-6 relative z-20" style={fade(0.06)}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="hidden md:flex flex-shrink-0 rounded-full overflow-hidden"
                  style={{ width: 44, aspectRatio: "1", border: "2px solid white", boxShadow: `0 0 0 2px ${STUDENT_COLORS.softSurface}, 0 4px 10px rgb(7 94 99 / 0.14)` }}>
                  <StudentAvatar id={avatarId} size={44} />
                </div>
                <h1 className="font-extrabold leading-tight m-0 truncate"
                  style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: "clamp(20px, 2vw, 24px)" }}>
                  {getGreeting()}, <span className="citron-mark">{username}</span>!
                </h1>
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
                chapterNumber={continueRow.chapter.chapter_number}
                steps={{ done: continueRow.chapter.nodes_done, total: continueRow.chapter.nodes_total }}
                revisiting={continueRow.chapter.revisiting === true}
                subject={continueRow.subject}
                onStart={() => void openRecent(continueRow.chapter, continueRow.subject)}
                style={fade(0.14)}
              />
            )}
            {!imminentSession && !continueRow && !recent.loading && (
              recent.error && recent.chapters.length === 0 ? (
                // Couldn't load the chapter to continue: the house of cards (the same as the subjects' error), in
                // the hero's own place and size, with a retry.
                <div
                  className="rounded-[26px] mb-8 flex flex-col sm:flex-row items-center text-center sm:text-left"
                  style={{ background: C.card, border: `1px solid ${C.border}`, minHeight: "clamp(220px, 20vw, 300px)", padding: "18px clamp(18px, 3vw, 44px)", gap: "clamp(10px, 2.4vw, 36px)", ...fade(0.14) }}
                >
                  <MomentArt art={ERROR_ART} width={220} float className="shrink-0" />
                  <div>
                    <p className="m-0 font-bold" style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: "clamp(19px, 1.9vw, 24px)" }}>
                      We couldn&apos;t load your chapter
                    </p>
                    <p className="m-0 mt-1.5 max-w-[380px]" style={{ color: C.textMid, fontSize: 14, lineHeight: 1.55 }}>
                      Your recent chapters couldn&apos;t load. Something went wrong on our side; try again in a moment.
                    </p>
                    <Button variant="secondary" size="md" className="mt-4" onClick={() => void recent.refresh()}>
                      Try again
                    </Button>
                  </div>
                </div>
              ) : recentRows.length === 0 ? (
                // Nothing opened yet: a garden gate swung open, stepping stones leading through.
                <div
                  className="rounded-[22px] mb-8 flex flex-col sm:flex-row items-center text-center sm:text-left"
                  style={{ border: `1.5px dashed ${C.border}`, padding: "10px clamp(16px, 2vw, 24px) 16px 10px", gap: "clamp(8px, 1.6vw, 18px)", ...fade(0.14) }}
                >
                  <div aria-hidden="true" className="relative shrink-0" style={{ width: 210, height: 140 }}>
                    <Image src={EMPTY_RECENT_ART.base} alt="" width={900} height={600} unoptimized className="absolute inset-0 h-full w-full object-contain" />
                    <Image src={EMPTY_RECENT_ART.accent} alt="" width={900} height={600} unoptimized className="absolute inset-0 h-full w-full object-contain" />
                  </div>
                  <div>
                    <p className="m-0 font-bold" style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: "clamp(17px, 1.6vw, 20px)" }}>
                      Your desk is ready
                    </p>
                    <p className="m-0 mt-1" style={{ color: C.textMuted, fontSize: 14 }}>
                      No chapters yet. Pick a subject below to start your first one!
                    </p>
                  </div>
                </div>
              ) : null
            )}
            {openError && (
              <p role="alert" className="-mt-4 mb-6 text-[13px]" style={{ color: C.coral }}>{openError}</p>
            )}

            {/* ── PROGRESS ── under the hero, where it stays however many subjects there are. No heading: the camp
                cards name themselves (streak, chapters, time), and with the hero they read as one "where you are". */}
            <div className="mb-8" style={{ ...fade(0.22) }}>
              <StreakStats data={studentStats} isLoading={isStatsLoading} variant="camp" totalMinutes={totalMinutes} chapters={chapters} />
            </div>

            {/* ── YOUR SUBJECTS ── */}
            <div className="mb-8" style={fade(0.30)}>
              <div className="flex items-center justify-between mb-4">
                <SectionHeading icon={Library}>Your subjects</SectionHeading>
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
                  {/* Every subject on the page, in rows of three (no slider): room above each row for the dioramas
                      rising out of their cards. */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ columnGap: "clamp(10px, 1.5vw, 16px)", rowGap: SUBJECT_ART_OVERHANG + 18, paddingTop: SUBJECT_ART_OVERHANG + 6, paddingBottom: 8 }}>
                    {subjectGroups.map((group) => {
                      const last = recentRows.find((r) => r.subject === group.subject);
                      return (
                        <SubjectCard
                          key={group.key}
                          label={group.vis.label}
                          color={group.vis.color}
                          line={last ? `Last: ${last.chapter.chapter_title}` : "Start exploring"}
                          art={subjectArt(group.subject)}
                          onOpen={() => openSubject(group.subject)}
                          resume={last ? {
                            chapter: last.chapter.chapter_title,
                            onResume: () => void openRecent(last.chapter, last.subject),
                            busy: openingId === last.chapter.instance_id,
                          } : undefined}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl px-6 py-8 text-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  {/* No subjects: a signpost, one lime arm pointing ahead. Couldn't load: the house of cards. */}
                  <MomentArt art={catalogError ? ERROR_ART : NO_SUBJECTS_ART} width={catalogError ? 190 : 150} float className="mx-auto mb-2" />
                  <p className="m-0 text-[19px] font-bold" style={{ color: C.text, fontFamily: "var(--font-display)" }}>
                    {catalogError ? "We couldn't load your subjects" : "No subjects available yet"}
                  </p>
                  <p className="mx-auto mt-1.5 mb-4 max-w-[340px] text-[13.5px] leading-relaxed" style={{ color: C.textMid }}>
                    {catalogError
                      ? "Something went wrong on our side. Try again in a moment."
                      : "Connect to a school from your Profile to see your subjects here."}
                  </p>
                  {!catalogError && (
                    <Button variant="secondary" size="md" onClick={() => router.push("/student/profile")}>
                      Go to Profile
                    </Button>
                  )}
                </div>
              )}
            </div>


          </div>
        </div>
      </main>
    </div>
  );
}
