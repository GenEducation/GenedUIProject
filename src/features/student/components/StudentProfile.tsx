"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, Pause, Check, ChevronDown, Pencil, Menu, Lock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useStudentStore, StudentProfile as StudentProfileType } from "../store/useStudentStore";
import { useSidebarStore } from "../store/useSidebarStore";
import { getStudentDisplayName, titleCase } from "../utils/displayName";
import { STUDENT_COLORS } from "../theme/colors";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";
import { StudentHomeSidebar } from "./StudentHomeSidebar";
import { StreakStats } from "./StreakStats";
import { useDebouncedResize } from "@/hooks/useDebouncedResize";
import { PartnerRequestModal } from "./PartnerRequestModal";
import { updateProfile, fetchProfile } from "@/features/auth/authService";
import { studentService } from "@/features/student/services/studentService";
import { fetchVoices } from "@/features/student/services/voiceCatalogService";
import { DEFAULT_GEMINI_VOICE, type GeminiVoice } from "@/constants/geminiVoices";
import { PttHotkeyConfig } from "./PttHotkeyConfig";
import { DevicePairingModal } from "./DevicePairingModal";
import { AvatarPickerModal } from "./AvatarPickerModal";
import { StudentAvatarIllustration } from "./StudentAvatarIllustration";
import { GeneralOnboardingWizard } from "@/features/onboarding/components/GeneralOnboarding/GeneralOnboardingWizard";
import { useOnboardingStore } from "@/features/onboarding/store/useOnboardingStore";
import { useTestStore } from "../store/useTestStore";

/* ─── Design Tokens ─── sourced from STUDENT_COLORS (see theme/colors.ts),
   now byte-for-byte identical to the home screen's palette. */
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
  pageBg:    STUDENT_COLORS.pageBg,
  card:      STUDENT_COLORS.card,
  border:    STUDENT_COLORS.border,
};

/* ─── "How {tutor} sees you" — derived from the profile API ─────────────────
 * The /students/{id}/profile endpoint returns a `general_onboarding` block
 * with the student's self-reported preferences. We turn each non-empty list
 * into a trait card instead of hardcoding generic learner archetypes. */
interface GeneralOnboarding {
  learning_preferences?: string[];
  interests?: string[];
  strengths?: string[];
  weaknesses?: string[];
  completed?: boolean;
}

const TRAIT_GROUPS: { key: keyof GeneralOnboarding; icon: string; title: string }[] = [
  { key: "learning_preferences", icon: "🎧", title: "Learning Style" },
  { key: "interests",            icon: "✨", title: "Interests"      },
  { key: "strengths",            icon: "💪", title: "Strengths"      },
  { key: "weaknesses",           icon: "🎯", title: "Growing On"     },
];

const sentenceCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function buildTraits(onboarding: GeneralOnboarding | null) {
  if (!onboarding) return [];
  return TRAIT_GROUPS.flatMap(({ key, icon, title }) => {
    const values = (onboarding[key] as string[] | undefined)?.filter(Boolean) ?? [];
    if (values.length === 0) return [];
    return [{ icon, title, description: values.map(sentenceCase).join(", ") }];
  });
}

/* ─── Badge computation ──────────────────────────────────────────────────────
 * Every badge is driven by real data — sessions, streak, and completed tests
 * (studentTests from useTestStore). "Quiz Champion" and "Shapes Master" used
 * to be hardcoded `earned: false` and could never unlock; both are now
 * derived from actual test submissions. */
function computeBadges(
  totalSessions: number,
  currentStreak: number,
  testsCompleted: number,
  bestScorePct: number | null
) {
  return [
    { icon: "🎯", label: "First Session",  earned: totalSessions  >= 1, color: C.genPurple, progress: `${Math.min(totalSessions, 1)}/1 sessions` },
    { icon: "🔥", label: "3-Day Streak",   earned: currentStreak  >= 3, color: C.sun,       progress: `${Math.min(currentStreak, 3)}/3 day streak` },
    { icon: "📖", label: "Explorer",       earned: totalSessions  >= 5, color: C.genBlue,   progress: `${Math.min(totalSessions, 5)}/5 sessions` },
    { icon: "🏆", label: "Quiz Champion",  earned: testsCompleted >= 3, color: C.edGreen,   progress: `${Math.min(testsCompleted, 3)}/3 tests taken` },
    { icon: "⭐", label: "High Scorer",    earned: (bestScorePct ?? 0) >= 80, color: C.sun,  progress: bestScorePct != null ? `Best score ${bestScorePct}%` : "Score 80%+ on a test" },
    { icon: "🚀", label: "7-Day Streak",   earned: currentStreak  >= 7, color: C.coral,     progress: `${Math.min(currentStreak, 7)}/7 day streak` },
  ];
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function SectionHeader({ icon, label, color = C.textMuted, marginBottom = 16 }: { icon: string; label: string; color?: string; marginBottom?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color, textTransform: "uppercase" as const, letterSpacing: 1.5, fontFamily: "var(--font-body)" }}>
        {label}
      </span>
    </div>
  );
}

function Badge({ icon, label, earned, color, progress }: { icon: string; label: string; earned: boolean; color: string; progress: string }) {
  return (
    <div
      role="img"
      aria-label={earned ? `${label} — earned` : `${label} — locked, ${progress}`}
      title={earned ? label : `Locked: ${progress}`}
      style={{
        display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6,
        padding: "14px 8px", borderRadius: 18,
        background: earned ? `${color}08` : "#F8F9FA",
        border: `1.5px solid ${earned ? `${color}25` : C.border}`,
        transition: "all 0.25s",
      }}
    >
      <div style={{
        position: "relative", width: 40, height: 40, borderRadius: 13,
        background: earned ? `${color}15` : "#EDF2F7",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
      }}>
        <span style={{ opacity: earned ? 1 : 0.35 }}>{icon}</span>
        {!earned && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.55)", borderRadius: 13,
          }}>
            <Lock size={14} color={C.textMuted} strokeWidth={2} />
          </div>
        )}
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: earned ? color : C.textMuted, textAlign: "center" as const, lineHeight: 1.3, fontFamily: "var(--font-body)" }}>{label}</span>
      <span style={{ fontSize: 8.5, fontWeight: 600, color: C.textMuted, textAlign: "center" as const, lineHeight: 1.2 }}>
        {earned ? "Earned" : progress}
      </span>
    </div>
  );
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.card, borderRadius: 24, padding: "22px 24px",
      border: `1px solid ${C.border}`, marginBottom: 16,
      boxShadow: "0 1px 4px rgba(0,0,0,0.03)", ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── Voice picker ───────────────────────────────────────────────────────── */
function VoicePicker({
  voices,
  loading,
  loadError,
  currentVoice,
  onSelect,
  saving,
  savedVoice,
}: {
  voices: GeminiVoice[];
  loading: boolean;
  loadError: string | null;
  currentVoice: string;
  onSelect: (id: string) => void;
  saving: boolean;
  savedVoice: string;
}) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  // Tracks which voice's sample is being fetched-and-rendered for the first
  // time — that round-trip is ~5s on a cache miss, so we surface a spinner
  // instead of leaving the play button frozen.
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = () => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setPlayingId(null);
    setLoadingSampleId(null);
  };

  const play = (id: string, src: string) => {
    if (playingId === id || loadingSampleId === id) { stop(); return; }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(src);
    audioRef.current = audio;
    setLoadingSampleId(id);
    audio.oncanplay = () => {
      setLoadingSampleId(p => (p === id ? null : p));
      setPlayingId(id);
    };
    audio.onended = () => setPlayingId(p => (p === id ? null : p));
    audio.onerror = () => {
      setLoadingSampleId(p => (p === id ? null : p));
      setPlayingId(p => (p === id ? null : p));
    };
    audio.play().catch(() => {
      setLoadingSampleId(null);
      setPlayingId(null);
    });
  };

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", borderRadius: 14,
            background: C.pageBg, border: `1.5px solid ${C.border}`,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#EDF2F7" }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: "30%", height: 12, borderRadius: 6, background: "#EDF2F7", marginBottom: 6 }} />
              <div style={{ width: "55%", height: 10, borderRadius: 5, background: "#F1F5F9" }} />
            </div>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#EDF2F7" }} />
          </div>
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{
        padding: "14px 16px", borderRadius: 14,
        background: `${C.coral}08`, border: `1.5px solid ${C.coral}30`,
        fontSize: 12, color: C.coral, fontWeight: 600,
      }}>
        Couldn't load voices: {loadError}
      </div>
    );
  }

  if (voices.length === 0) {
    return (
      <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center" as const, padding: "8px 0" }}>
        No voices available right now.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
      {voices.map(v => {
        const isSelected = currentVoice === v.id;
        const isPlaying  = playingId === v.id;
        const isLoadingSample = loadingSampleId === v.id;
        const isSaved    = savedVoice === v.id;
        return (
          <div
            key={v.id}
            onClick={() => onSelect(v.id)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", borderRadius: 14, cursor: "pointer",
              background: isSelected ? `${C.genPurple}08` : C.pageBg,
              border: `1.5px solid ${isSelected ? `${C.genPurple}40` : C.border}`,
              transition: "all 0.18s",
            }}
          >
            {/* Play / pause sample */}
            <button
              onClick={(e) => { e.stopPropagation(); play(v.id, v.sample_url); }}
              aria-label={isPlaying ? `Pause ${v.label} sample` : `Play ${v.label} sample`}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                border: "none", cursor: "pointer", flexShrink: 0,
                background: isPlaying ? C.genPurple : `${C.genPurple}15`,
                color: isPlaying ? "white" : C.genPurple,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.18s",
              }}
            >
              {isLoadingSample
                ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                : isPlaying
                  ? <Pause size={14} fill="currentColor" />
                  : <Play size={14} fill="currentColor" style={{ marginLeft: 1 }} />}
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "var(--font-body)" }}>
                {v.label}
                {isSaved && (
                  <span style={{
                    marginLeft: 8, fontSize: 9, fontWeight: 800, color: C.growth,
                    background: `${C.growth}15`, padding: "2px 6px", borderRadius: 6,
                    textTransform: "uppercase" as const, letterSpacing: 0.5,
                  }}>Current</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: C.textMid, marginTop: 2 }}>{v.description}</div>
            </div>

            {/* Selected indicator */}
            <div style={{
              width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
              border: `2px solid ${isSelected ? C.genPurple : C.border}`,
              background: isSelected ? C.genPurple : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.18s",
            }}>
              {isSelected && <Check size={12} color="white" strokeWidth={3} />}
            </div>
          </div>
        );
      })}
      {saving && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.textMuted, fontSize: 11, fontWeight: 600, marginTop: 4 }}>
          <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Saving voice…
        </div>
      )}
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export function StudentProfile() {
  const router = useRouter();
  const {
    studentProfile, logoutStudent,
    availablePartners, fetchAvailablePartners,
    sendPartnerRequest, partnerRequestStatus,
    enrolledPartners, fetchEnrolledPartners, isEnrolledPartnersLoading,
    linkParent, studentStats, fetchStudentStats,
    setStudentProfile,
    voicePrefs, setListenMode,
    avatarId, setAvatarId,
  } = useStudentStore();
  const { completeAction } = useTutorialStore();
  const { studentTests, loadStudentTests } = useTestStore();

  const { sidebarOpen, setSidebarOpen, applyResponsive } = useSidebarStore();
  const avatarColor = C.sun;
  const [soundEnabled,     setSoundEnabled]      = useState(true);
  const [parentInput,      setParentInput]       = useState("");
  const [selectedPartner,  setSelectedPartner]   = useState("");
  // Starts true — content used to render at opacity:0 until a mount effect
  // fired alongside three network fetches, so a hydration or fetch stall
  // extended the blank screen indefinitely. See StudentHome.tsx for the
  // same fix.
  const [mounted,          setMounted]           = useState(true);
  const [pendingVoice,     setPendingVoice]      = useState<string>(studentProfile?.preferred_voice || DEFAULT_GEMINI_VOICE);
  const [savingVoice,      setSavingVoice]       = useState(false);
  const [voiceError,       setVoiceError]        = useState<string | null>(null);
  const [voices,           setVoices]            = useState<GeminiVoice[]>([]);
  // `voicesLoading` starts false so we don't show a spinner until the user
  // actually expands the section and triggers the fetch.
  const [voicesLoading,    setVoicesLoading]     = useState(false);
  const [voicesLoadError,  setVoicesLoadError]   = useState<string | null>(null);
  const [voicesFetched,    setVoicesFetched]     = useState(false);
  const [voiceExpanded,    setVoiceExpanded]     = useState(false);
  const [onboarding,       setOnboarding]         = useState<GeneralOnboarding | null>(null);
  const [onboardingLoading,setOnboardingLoading]  = useState(true);
  const [preferredLanguage, setPreferredLanguage] = useState<string | null>(null);
  const [secondaryLanguages, setSecondaryLanguages] = useState<string[] | null>(null);
  const [multilingualEnabled, setMultilingualEnabled] = useState<boolean>(false);
  const [isLanguageLoading, setIsLanguageLoading] = useState<boolean>(false);
  const [isLanguageSaving, setIsLanguageSaving] = useState<boolean>(false);
  const [pairingModalOpen, setPairingModalOpen] = useState<boolean>(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState<boolean>(false);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState<boolean>(false);
  const checkDNAStatus = useOnboardingStore((s) => s.checkDNAStatus);

  /* responsive sidebar */
  useDebouncedResize(() => applyResponsive(window.innerWidth >= 1024));

  useEffect(() => {
    setMounted(true);
    fetchAvailablePartners();
    fetchEnrolledPartners();
    fetchStudentStats();
    if (studentProfile?.user_id) loadStudentTests(studentProfile.user_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAvailablePartners, fetchEnrolledPartners, fetchStudentStats, studentProfile?.user_id]);

  /**
   * Heal a stale localStorage profile by pulling the latest from auth-service
   * once on mount. Needed because pre-feature logins persisted a profile that
   * had no `preferred_voice` field at all — without this refresh, the picker
   * shows the default voice as "Current" even when the DB has a real choice
   * saved.
   */
  useEffect(() => {
    if (!studentProfile?.user_id) return;
    let cancelled = false;
    (async () => {
      try {
        const fresh = await fetchProfile(studentProfile.user_id);
        if (cancelled) return;
        const merged: StudentProfileType = {
          ...studentProfile,
          name: fresh.name ?? studentProfile.name,
          age: fresh.age ?? studentProfile.age,
          grade: fresh.grade ?? studentProfile.grade,
          school_board: fresh.school_board ?? studentProfile.school_board,
          ai_name: fresh.ai_name ?? studentProfile.ai_name,
          preferred_voice: fresh.preferred_voice ?? studentProfile.preferred_voice,
          plan: fresh.plan ?? studentProfile.plan,
          plan_expires_at: fresh.plan_expires_at ?? studentProfile.plan_expires_at,
        };
        setStudentProfile(merged);
        localStorage.setItem("gened_user_profile", JSON.stringify({ ...fresh }));
        if (fresh.access_token) {
          localStorage.setItem("gened_auth_token", fresh.access_token);
        }
      } catch (err) {
        // Non-fatal: the picker just falls back to whatever's in localStorage.
        console.warn("[StudentProfile] Failed to refresh profile:", err);
      }
    })();
    return () => { cancelled = true; };
    // Intentionally only on user_id change (i.e. once per logged-in user).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentProfile?.user_id]);

  /* Pull the student's onboarding profile so "How {tutor} sees you" reflects
   * their actual self-reported preferences rather than hardcoded archetypes.
   * Also re-run after the wizard completes so traits appear without a reload. */
  const loadDashboardProfile = useCallback(async () => {
    if (!studentProfile?.user_id) return;
    setOnboardingLoading(true);
    try {
      const data = await studentService.fetchDashboardProfile(studentProfile.user_id);
      setOnboarding(data?.general_onboarding ?? null);
    } catch (err) {
      console.warn("[StudentProfile] Failed to load onboarding profile:", err);
      setOnboarding(null);
    } finally {
      setOnboardingLoading(false);
    }
  }, [studentProfile?.user_id]);

  useEffect(() => {
    loadDashboardProfile();
  }, [loadDashboardProfile]);

  // Load language preferences on mount
  useEffect(() => {
    if (!studentProfile?.user_id) return;
    let cancelled = false;
    setIsLanguageLoading(true);
    (async () => {
      try {
        const data = await studentService.fetchLanguagePreferences(studentProfile.user_id);
        if (cancelled) return;
        setPreferredLanguage(data.preferred_language || "en");
        setSecondaryLanguages(data.secondary_languages || []);
        setMultilingualEnabled(data.multilingual_enabled || false);
      } catch (err) {
        console.warn("[StudentProfile] Failed to fetch language preferences:", err);
      } finally {
        if (!cancelled) setIsLanguageLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentProfile?.user_id]);

  const handleLanguageChange = async (langCode: string) => {
    if (!studentProfile?.user_id) return;
    setIsLanguageSaving(true);
    try {
      const data = await studentService.updateLanguagePreferences(studentProfile.user_id, {
        preferred_language: langCode
      });
      setPreferredLanguage(data.preferred_language || "en");
      const updatedProfile = {
        ...studentProfile,
        preferred_language: data.preferred_language || langCode
      };
      setStudentProfile(updatedProfile);
      const stored = localStorage.getItem("gened_user_profile");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.preferred_language = data.preferred_language || langCode;
          localStorage.setItem("gened_user_profile", JSON.stringify(parsed));
        } catch {}
      }
    } catch (err) {
      console.error("[StudentProfile] Failed to update language preference:", err);
    } finally {
      setIsLanguageSaving(false);
    }
  };

  // Keep pending voice in sync if profile loads/changes after mount
  useEffect(() => {
    if (studentProfile?.preferred_voice) {
      setPendingVoice(studentProfile.preferred_voice);
    }
  }, [studentProfile?.preferred_voice]);

  /**
   * Lazy-load the voice catalog the first time the user opens the section.
   *
   * Most students never touch this — keeping the network + audio assets out
   * of the profile-page critical path saves them a needless round-trip.
   * Once fetched, the result is kept in component state for the rest of the
   * session, so re-opening the panel is instant.
   *
   * Guard pattern: a ref (not state) tracks "fetch in flight" so the effect
   * doesn't re-run when we flip `voicesLoading`, which would otherwise
   * trigger our own cleanup and cancel the in-flight request.
   */
  const voicesInFlightRef = useRef(false);
  useEffect(() => {
    if (!voiceExpanded || voicesFetched || voicesInFlightRef.current) return;
    voicesInFlightRef.current = true;
    let cancelled = false;
    setVoicesLoading(true);
    setVoicesLoadError(null);
    (async () => {
      try {
        const list = await fetchVoices();
        if (cancelled) return;
        setVoices(list);
        setVoicesFetched(true);
      } catch (err: any) {
        if (cancelled) return;
        setVoicesLoadError(err?.message || "Network error");
      } finally {
        voicesInFlightRef.current = false;
        if (!cancelled) setVoicesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [voiceExpanded, voicesFetched]);

  const savedVoice = studentProfile?.preferred_voice || DEFAULT_GEMINI_VOICE;

  const handleSelectVoice = async (voiceId: string) => {
    if (!studentProfile || voiceId === savedVoice || savingVoice) {
      setPendingVoice(voiceId);
      return;
    }
    setPendingVoice(voiceId);
    setSavingVoice(true);
    setVoiceError(null);
    try {
      const response = await updateProfile({ user_id: studentProfile.user_id, preferred_voice: voiceId });
      const updated: StudentProfileType = { ...studentProfile, preferred_voice: response.preferred_voice ?? voiceId };
      setStudentProfile(updated);
      localStorage.setItem("gened_user_profile", JSON.stringify({ ...response, preferred_voice: updated.preferred_voice }));
      if (response.access_token) {
        localStorage.setItem("gened_auth_token", response.access_token);
      }
    } catch (err: any) {
      setPendingVoice(savedVoice);
      setVoiceError(err?.message || "Couldn't save voice. Please try again.");
    } finally {
      setSavingVoice(false);
    }
  };

  const isLoading = partnerRequestStatus === "loading";

  const username      = studentProfile?.username      ?? "Student";
  const displayName   = getStudentDisplayName(studentProfile);
  const grade         = studentProfile?.grade         ? `Grade ${studentProfile.grade}` : "—";
  const board         = studentProfile?.school_board  ?? "CBSE";
  const aiTutorName   = titleCase(studentProfile?.ai_name || "Nia");
  const streakCount   = studentStats?.currentStreak ?? 0;
  const totalSessions = studentStats?.totalSessions  ?? 0;

  const completedTests = studentTests.filter((t) => t.submission_id != null);
  const testsCompleted = completedTests.length;
  const bestScorePct = completedTests.length
    ? Math.round(Math.max(...completedTests.map((t) => t.overall_score ?? 0)) * 100)
    : null;
  const badges = computeBadges(totalSessions, streakCount, testsCompleted, bestScorePct);

  const learningTraits = buildTraits(onboarding);

  const handleLinkParent = async () => {
    if (parentInput.trim()) {
      await linkParent(parentInput.trim());
      setParentInput("");
    }
  };

  const fade = (d = 0): React.CSSProperties => ({
    opacity:   mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.5s ease ${d}s, transform 0.5s ease ${d}s`,
  });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "var(--font-body)", background: C.pageBg }}>

      {/* Sidebar */}
      <StudentHomeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />

      {/* Main content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Mobile topbar */}
        {!sidebarOpen && (
          <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${C.border}`, background: C.card, flexShrink: 0, gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.border}`, background: C.pageBg, color: C.textMid, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}
            ><Menu size={16} strokeWidth={1.75} /></button>
            <span style={{ flex: 1, textAlign: "center", fontWeight: 800, fontSize: 15, color: C.text, fontFamily: "var(--font-display)" }}>My Profile</span>
            <div style={{ width: 38, flexShrink: 0 }} />
          </div>
        )}

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", position: "relative" }}>

          {/* Bg decoration */}
          <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, borderRadius: "50%", background: `radial-gradient(circle, ${C.genPurple}06, transparent 70%)`, pointerEvents: "none" }} />

          <div style={{ maxWidth: 960, margin: "0 auto", padding: sidebarOpen ? "32px 40px 60px" : "24px 16px 60px" }}>

            {/* Back button + title row (desktop) */}
            {sidebarOpen && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, ...fade(0.05) }}>
                <button
                  onClick={() => router.push("/student")}
                  style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, color: C.textMid, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}
                >←</button>
              </div>
            )}

            {/* ── HERO CARD ── */}
            <div style={{
              background: C.card, borderRadius: 24, padding: "32px 24px", border: `1px solid ${C.border}`,
              display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
              marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.03)", ...fade(0.08),
            }}>
              {/* Avatar — circular illustration, chosen by the student via the edit badge */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{
                  width: 88, height: 88, borderRadius: "50%",
                  boxShadow: `0 8px 24px ${avatarColor}30`, border: "3px solid white",
                  overflow: "hidden",
                }}>
                  {avatarId === "graduate-girl" ? (
                    <img
                      src="/avatars/girl-graduate.png"
                      alt="Girl graduate avatar"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <StudentAvatarIllustration bg={avatarColor} />
                  )}
                </div>
                <button
                  onClick={() => setAvatarPickerOpen(true)}
                  aria-label="Change avatar"
                  style={{
                    position: "absolute", bottom: -2, right: -2,
                    width: 28, height: 28, borderRadius: "50%",
                    background: C.card, border: `2px solid ${C.card}`,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: C.textMid,
                  }}
                >
                  <Pencil size={13} />
                </button>
              </div>

              <h1 style={{ fontSize: "clamp(22px,4vw,28px)", fontWeight: 800, color: C.text, marginTop: 14, fontFamily: "var(--font-display)" }}>{displayName}</h1>
              <p style={{ fontSize: 13, color: C.textMid, fontWeight: 600, marginTop: 4 }}>{grade} · {board}</p>
              <p style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginTop: 4 }}>AI Tutor: {aiTutorName}</p>

              {/* Stat strip */}
              <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${C.border}`, width: "100%" }}>
                <StreakStats data={studentStats} variant="strip" />
              </div>
            </div>

            {/* ── HOW APRIL SEES YOU ── */}
            <div style={{ background: `linear-gradient(135deg, ${C.genPurple}06, ${C.genBlue}06)`, borderRadius: 24, padding: "22px 24px", border: `1px solid ${C.genPurple}12`, marginBottom: 16, ...fade(0.14) }}>
              <SectionHeader icon="🧠" label={`How ${aiTutorName} Sees You`} color={C.genPurple} marginBottom={14} />
              {onboardingLoading ? (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "white", borderRadius: 14, border: `1px solid ${C.border}` }}>
                      <div style={{ width: 22, height: 22, borderRadius: 7, background: "#EDF2F7", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ width: "35%", height: 11, borderRadius: 6, background: "#EDF2F7", marginBottom: 6 }} />
                        <div style={{ width: "65%", height: 9, borderRadius: 5, background: "#F1F5F9" }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : learningTraits.length > 0 ? (
                <>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                    {learningTraits.map((t, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", background: "white", borderRadius: 14, border: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{t.icon}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "var(--font-body)" }}>{t.title}</div>
                          <div style={{ fontSize: 11, color: C.textMid, marginTop: 2, lineHeight: 1.5 }}>{t.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 10, color: C.textMuted, marginTop: 12, fontStyle: "italic", textAlign: "center" as const }}>Based on your onboarding and learning patterns</p>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 12, padding: "8px 0" }}>
                  <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center" as const, margin: 0 }}>
                    Complete onboarding to see how {aiTutorName} understands your learning style.
                  </p>
                  <button
                    onClick={() => setShowOnboardingWizard(true)}
                    style={{
                      padding: "10px 20px", borderRadius: 12, border: "none",
                      background: C.genPurple, color: "white", fontSize: 13, fontWeight: 700,
                      fontFamily: "var(--font-display)", cursor: "pointer",
                      boxShadow: `0 4px 14px ${C.genPurple}40`,
                    }}
                  >
                    ✨ Start Questionnaire
                  </button>
                </div>
              )}
            </div>

            {/* ── TUTOR VOICE (collapsible — lazy-loads catalog on first open) ── */}
            <Card style={{ ...fade(0.17), padding: voiceExpanded ? "22px 24px" : "18px 24px", transition: "padding 0.22s ease" }}>
              <button
                onClick={() => setVoiceExpanded(v => !v)}
                aria-expanded={voiceExpanded}
                aria-controls="voice-picker-panel"
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: 0, background: "transparent", border: "none", cursor: "pointer",
                  textAlign: "left", color: "inherit", fontFamily: "inherit",
                }}
              >
                <span style={{ fontSize: 17 }}>🎙️</span>
                <span style={{
                  flex: 1,
                  fontSize: 13, fontWeight: 800, color: C.textMuted,
                  textTransform: "uppercase" as const, letterSpacing: 1.4,
                  fontFamily: "var(--font-body)",
                }}>
                  Tutor Voice
                </span>
                {savedVoice && (
                  <span style={{
                    fontSize: 14, fontWeight: 700, color: C.genPurple,
                    fontFamily: "var(--font-body)",
                  }}>
                    {savedVoice}
                  </span>
                )}
                <ChevronDown
                  size={16}
                  style={{
                    color: C.textMuted,
                    transition: "transform 0.22s ease",
                    transform: voiceExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>

              <div
                id="voice-picker-panel"
                style={{
                  overflow: "hidden",
                  transition: "grid-template-rows 0.28s ease, margin-top 0.22s ease, opacity 0.22s ease",
                  display: "grid",
                  gridTemplateRows: voiceExpanded ? "1fr" : "0fr",
                  marginTop: voiceExpanded ? 16 : 0,
                  opacity: voiceExpanded ? 1 : 0,
                }}
              >
                <div style={{ minHeight: 0 }}>
                  <p style={{ fontSize: 11, color: C.textMid, marginTop: 0, marginBottom: 14, lineHeight: 1.5 }}>
                    Tap any voice to preview it. The voice you pick applies to every AI tutor across all your subjects.
                  </p>
                  <VoicePicker
                    voices={voices}
                    loading={voicesLoading}
                    loadError={voicesLoadError}
                    currentVoice={pendingVoice}
                    onSelect={handleSelectVoice}
                    saving={savingVoice}
                    savedVoice={savedVoice}
                  />
                  {voiceError && (
                    <p style={{ marginTop: 10, fontSize: 11, color: C.coral, fontWeight: 600 }}>{voiceError}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* ── BADGES ── */}
            <Card style={{ ...fade(0.20) }}>
              <SectionHeader icon="🏅" label="My Badges" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {badges.map((b, i) => <Badge key={i} {...b} />)}
              </div>
            </Card>

            {/* ── MY SCHOOL ── */}
            <Card style={{ ...fade(0.26) }}>
              <SectionHeader icon="🏫" label="My School" />
              {isEnrolledPartnersLoading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                  <Loader2 size={18} style={{ color: C.textMuted, animation: "spin 1s linear infinite" }} />
                </div>
              ) : enrolledPartners.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                  {enrolledPartners.map((partner, i) => (
                    <div key={partner.partner_id ?? partner.id ?? `ep-${i}`} style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                      background: `${C.edGreen}06`, borderRadius: 16, border: `1px solid ${C.edGreen}15`,
                    }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: `${C.edGreen}12`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: C.edGreen, fontFamily: "var(--font-display)", flexShrink: 0 }}>
                        {(partner.organization ?? "PT").substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{partner.organization}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.growth }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: C.growth }}>Connected</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center" as const, padding: "8px 0" }}>No school connected yet.</p>
              )}

              {/* Partner request */}
              <div style={{ marginTop: 14 }}>
                <div style={{ position: "relative" as const }}>
                  <select
                    value={selectedPartner}
                    onChange={e => setSelectedPartner(e.target.value)}
                    disabled={isLoading}
                    style={{
                      width: "100%", padding: "10px 38px 10px 14px", borderRadius: 12,
                      border: `1.5px solid ${C.border}`, background: C.pageBg,
                      fontSize: 12, fontWeight: 600, color: C.textMid,
                      outline: "none", cursor: "pointer", appearance: "none" as const,
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    <option value="" disabled>Connect to a school...</option>
                    {availablePartners.map((p, i) => (
                      <option key={p.partner_id ?? p.id ?? `avp-${i}`} value={p.partner_id ?? p.id}>{p.organization}</option>
                    ))}
                  </select>
                  <div style={{ position: "absolute" as const, right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.textMuted, fontSize: 12 }}>▾</div>
                </div>
                <button
                  onClick={async () => {
                    if (!selectedPartner) return;
                    await sendPartnerRequest(selectedPartner);
                    completeAction("send_admin_request");
                    setSelectedPartner("");
                  }}
                  disabled={!selectedPartner || isLoading}
                  style={{
                    marginTop: 10, width: "100%", padding: "11px", borderRadius: 12,
                    background: selectedPartner && !isLoading ? C.genPurple : C.border,
                    color: "white", border: "none", fontWeight: 700, fontSize: 13,
                    cursor: selectedPartner && !isLoading ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    transition: "background 0.2s",
                  }}
                >
                  {isLoading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Sending...</> : "Send Request"}
                </button>
              </div>
            </Card>

            {/* ── MY FAMILY ── */}
            <Card style={{ ...fade(0.32) }}>
              <SectionHeader icon="👨‍👩‍👧" label="My Family" />
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Guardian's email or phone"
                  value={parentInput}
                  onChange={e => setParentInput(e.target.value)}
                  disabled={isLoading}
                  style={{
                    flex: 1, minWidth: 0, padding: "10px 14px", borderRadius: 12,
                    border: `1.5px solid ${C.border}`, fontSize: 12, fontWeight: 500,
                    outline: "none", fontFamily: "var(--font-body)", background: C.pageBg,
                  }}
                />
                <Button
                  variant="primary"
                  onClick={handleLinkParent}
                  disabled={!parentInput.trim() || isLoading}
                  className="flex-shrink-0"
                >
                  {isLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Add"}
                </Button>
              </div>
            </Card>

            {/* ── MY DESKBOT ── */}
            <Card style={{ ...fade(0.35) }}>
              <SectionHeader icon="🤖" label="My Deskbot" />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Pair a physical device</div>
                  <div style={{ fontSize: 12, color: C.textMid, marginTop: 2 }}>Link a Deskbot to your account for hands-free learning.</div>
                </div>
                <button
                  onClick={() => setPairingModalOpen(true)}
                  style={{
                    padding: "10px 18px", borderRadius: 12, background: `${C.genPurple}15`, color: C.genPurple,
                    border: `1.5px solid ${C.genPurple}30`, fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0,
                  }}
                >
                  Pair Device
                </button>
              </div>
            </Card>

            {/* ── SETTINGS ── */}
            <Card style={{ ...fade(0.38) }}>
              <SectionHeader icon="⚙️" label="Settings" />
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                {/* Sound toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 14, background: C.pageBg, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{soundEnabled ? "🔊" : "🔇"}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Sound Effects</span>
                  </div>
                  <button
                    onClick={() => setSoundEnabled(v => !v)}
                    style={{ width: 44, height: 26, borderRadius: 13, cursor: "pointer", border: "none", background: soundEnabled ? C.growth : C.border, position: "relative" as const, transition: "background 0.2s" }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "white", position: "absolute" as const, top: 3, left: soundEnabled ? 21 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
                  </button>
                </div>

                {/* Voice Settings */}
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10, borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 4 }}>
                  <SectionHeader icon="🎙️" label="Voice Settings" />
                  
                  {/* Mode Selector */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 14, background: C.pageBg, border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16 }}>🎙️</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "var(--font-body)" }}>Voice Activation</span>
                    </div>
                    
                    <div className="inline-flex p-1 rounded-lg bg-white border border-[#E2E8F0] shadow-sm">
                      <button
                        onClick={() => setListenMode("continuous")}
                        className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                          voicePrefs.listenMode === "continuous"
                            ? "bg-[var(--tutor)] text-white shadow"
                            : "text-[#94A3B8] hover:text-[var(--primary-ink)]"
                        }`}
                      >
                        Continuous
                      </button>
                      <button
                        onClick={() => setListenMode("ptt")}
                        className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                          voicePrefs.listenMode === "ptt"
                            ? "bg-[var(--tutor)] text-white shadow"
                            : "text-[#94A3B8] hover:text-[var(--primary-ink)]"
                        }`}
                      >
                        Push to talk
                      </button>
                    </div>
                  </div>

                  {/* Hotkey Capture (only if PTT mode) */}
                  {voicePrefs.listenMode === "ptt" && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 14, background: C.pageBg, border: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 16 }}>⌨️</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "var(--font-body)" }}>PTT Hotkey</span>
                      </div>
                      <PttHotkeyConfig compact={true} />
                    </div>
                  )}
                </div>

                {/* Language Preference Section */}
                {multilingualEnabled && (
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 10, borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 4 }}>
                    <SectionHeader icon="🌐" label="Language of Instruction" />
                    
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 14, background: C.pageBg, border: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 16 }}>🗣️</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "var(--font-body)" }}>Preferred Language</span>
                      </div>

                      {isLanguageLoading ? (
                        <span style={{ fontSize: 12, color: C.textMuted }}>Loading...</span>
                      ) : (
                        <div style={{ position: "relative" as const }}>
                          <select
                            value={preferredLanguage || "en"}
                            disabled={isLanguageSaving}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            style={{
                              padding: "6px 32px 6px 12px",
                              borderRadius: 10,
                              background: "white",
                              border: `1.5px solid ${C.border}`,
                              color: C.text,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              outline: "none",
                              appearance: "none",
                              fontFamily: "var(--font-body)"
                            }}
                          >
                            <option value="en">English (English)</option>
                            <option value="hi">Hindi (हिन्दी)</option>
                            <option value="hi-Latn">Hinglish (Hinglish)</option>
                            <option value="mr">Marathi (मराठी)</option>
                            <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
                            <option value="ta">Tamil (தமிழ்)</option>
                            <option value="te">Telugu (తెలుగు)</option>
                            <option value="kn">Kannada (ಕನ್ನಡ)</option>
                          </select>
                          <ChevronDown
                            size={14}
                            style={{
                              position: "absolute" as const,
                              right: 10,
                              top: "50%",
                              transform: "translateY(-50%)",
                              pointerEvents: "none",
                              color: C.textMuted
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Logout — same red as the sidebar's logout affordance */}
                <Button variant="destructive" size="lg" fullWidth onClick={logoutStudent} leadingIcon={<LogOut size={15} />}>
                  Logout
                </Button>
              </div>
            </Card>

          </div>
        </div>
      </main>

      <PartnerRequestModal />
      <DevicePairingModal isOpen={pairingModalOpen} onClose={() => setPairingModalOpen(false)} />
      <AvatarPickerModal
        isOpen={avatarPickerOpen}
        onClose={() => setAvatarPickerOpen(false)}
        selectedId={avatarId}
        onSelect={setAvatarId}
      />

      {/* General onboarding questionnaire — launched from the "How AI sees you" empty state */}
      {showOnboardingWizard && studentProfile && (
        <GeneralOnboardingWizard
          studentProfile={studentProfile}
          onComplete={() => {
            setShowOnboardingWizard(false);
            checkDNAStatus(studentProfile.user_id);
            loadDashboardProfile();
          }}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 5px }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px }
      `}</style>
    </div>
  );
}
