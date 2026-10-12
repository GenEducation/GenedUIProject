"use client";

import { useEffect, useRef, useState } from "react";
import { Keyboard, Languages, Loader2, Mic, Pause, Play, Radio, Settings } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { updateProfile } from "@/features/auth/authService";
import { studentService } from "@/features/student/services/studentService";
import { fetchVoices } from "@/features/student/services/voiceCatalogService";
import { DEFAULT_GEMINI_VOICE, type GeminiVoice } from "@/constants/geminiVoices";
import { useStudentStore, type StudentProfile } from "../../store/useStudentStore";
import { PttHotkeyConfig } from "../PttHotkeyConfig";
import { CardIcon, ProfileCard } from "./ProfileCard";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi (हिन्दी)" },
  { value: "hi-Latn", label: "Hinglish" },
  { value: "mr", label: "Marathi (मराठी)" },
  { value: "pa", label: "Punjabi (ਪੰਜਾਬੀ)" },
  { value: "ta", label: "Tamil (தமிழ்)" },
  { value: "te", label: "Telugu (తెలుగు)" },
  { value: "kn", label: "Kannada (ಕನ್ನಡ)" },
];
const languageName = (code: string) =>
  LANGUAGE_OPTIONS.find((o) => o.value === code)?.label.split(" (")[0] ?? code;

/** Persist a profile patch to the store and the cached localStorage copy. */
function persistProfile(next: StudentProfile, accessToken?: string) {
  useStudentStore.getState().setStudentProfile(next);
  try {
    const stored = JSON.parse(localStorage.getItem("gened_user_profile") || "{}");
    localStorage.setItem("gened_user_profile", JSON.stringify({ ...stored, ...next }));
    if (accessToken) localStorage.setItem("gened_auth_token", accessToken);
  } catch {
    /* a corrupt cache is healed by the next profile fetch */
  }
}

function Row({
  icon,
  title,
  description,
  control,
  footnote,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  control: React.ReactNode;
  footnote?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <CardIcon size={44}>{icon}</CardIcon>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-[15px] font-extrabold text-[var(--ink)]">{title}</h3>
          <p className="mt-1 text-[13px] leading-snug text-[var(--text-mid)]">{description}</p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 pl-[60px] sm:w-[240px] sm:flex-none sm:pl-0">
        {control}
        {footnote && <p className="text-[12px] text-[var(--text-muted)]">{footnote}</p>}
      </div>
    </div>
  );
}

/* ─── Tutor voice ─────────────────────────────────────────────────────────── */
function VoiceControl() {
  const profile = useStudentStore((s) => s.studentProfile);
  const [voices, setVoices] = useState<GeminiVoice[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [audioState, setAudioState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchVoices()
      .then((list) => { if (!cancelled) setVoices(list); })
      .catch((err: unknown) => { if (!cancelled) setLoadError(err instanceof Error ? err.message : "Network error"); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; audioRef.current?.pause(); };
  }, []);

  // A saved voice the catalog no longer offers falls back to the default.
  const saved = profile?.preferred_voice;
  const current = saved && (!loaded || voices.some((v) => v.id === saved)) ? saved : DEFAULT_GEMINI_VOICE;
  const currentVoice = voices.find((v) => v.id === current);

  const stop = () => {
    audioRef.current?.pause();
    setAudioState("idle");
  };

  const togglePreview = () => {
    if (audioState !== "idle") return stop();
    if (!currentVoice) return;
    audioRef.current?.pause();
    const audio = new Audio(currentVoice.sample_url);
    audioRef.current = audio;
    setAudioState("loading");
    audio.oncanplay = () => setAudioState("playing");
    audio.onended = () => setAudioState("idle");
    audio.onerror = () => setAudioState("idle");
    audio.play().catch(() => setAudioState("idle"));
  };

  const handleChange = async (id: string) => {
    if (!profile || id === current) return;
    stop();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await updateProfile({ user_id: profile.user_id, preferred_voice: id });
      persistProfile({ ...profile, preferred_voice: res.preferred_voice ?? id }, res.access_token);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save voice. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const options = voices.length
    ? voices.map((v) => ({
        value: v.id,
        label: v.id === DEFAULT_GEMINI_VOICE ? `${v.label} (Default)` : v.label,
        hint: v.description,
      }))
    : [{ value: current, label: current === DEFAULT_GEMINI_VOICE ? `${current} (Default)` : current }];

  return (
    <>
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <Select
            aria-label="Tutor voice"
            value={current}
            onChange={handleChange}
            disabled={!loaded || saving || !!loadError}
            options={options}
            panelWidth={300}
          />
        </div>
        {/* eslint-disable-next-line no-restricted-syntax -- round icon-only play control beside the voice select. */}
        <button
          type="button"
          onClick={togglePreview}
          disabled={!currentVoice}
          aria-label={audioState === "idle" ? `Play a sample of ${current}` : "Stop sample"}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_6px_14px_-8px_rgb(184_214_63/0.9)] transition hover:bg-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-ring)] disabled:opacity-40"
        >
          {audioState === "loading" ? (
            <Loader2 size={17} className="animate-spin" />
          ) : audioState === "playing" ? (
            <Pause size={17} fill="currentColor" />
          ) : (
            <Play size={17} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>
      {(saving || saveError || loadError) && (
        <p className={`text-[12px] ${saveError || loadError ? "text-[var(--danger-ink)]" : "text-[var(--text-muted)]"}`}>
          {saving ? "Saving…" : saveError ?? `Couldn't load voices: ${loadError}`}
        </p>
      )}
    </>
  );
}

/* ─── Learning language ───────────────────────────────────────────────────── */
function useLanguagePrefs() {
  const profile = useStudentStore((s) => s.studentProfile);
  const [state, setState] = useState<{
    preferred: string;
    secondary: string[];
    enabled: boolean;
    loading: boolean;
    saving: boolean;
  }>({ preferred: "en", secondary: [], enabled: false, loading: true, saving: false });

  const userId = profile?.user_id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    studentService
      .fetchLanguagePreferences(userId)
      .then((d) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          preferred: d.preferred_language || "en",
          secondary: d.secondary_languages || [],
          enabled: !!d.multilingual_enabled,
        }));
      })
      .catch((err) => console.warn("[Profile] Failed to fetch language preferences:", err))
      .finally(() => { if (!cancelled) setState((s) => ({ ...s, loading: false })); });
    return () => { cancelled = true; };
  }, [userId]);

  const change = async (code: string) => {
    if (!profile) return;
    setState((s) => ({ ...s, saving: true }));
    try {
      const d = await studentService.updateLanguagePreferences(profile.user_id, { preferred_language: code });
      const preferred = d.preferred_language || code;
      setState((s) => ({ ...s, preferred }));
      persistProfile({ ...profile, preferred_language: preferred });
    } catch (err) {
      console.error("[Profile] Failed to update language preference:", err);
    } finally {
      setState((s) => ({ ...s, saving: false }));
    }
  };

  return { ...state, change };
}

/* ─── Voice activation ────────────────────────────────────────────────────── */
function ListenModeToggle() {
  const { voicePrefs, setListenMode } = useStudentStore();
  const modes = [
    { key: "continuous", label: "Continuous" },
    { key: "ptt", label: "Push to talk" },
  ] as const;
  return (
    <div role="radiogroup" aria-label="Voice activation" className="grid grid-cols-2 rounded-xl bg-[var(--canvas)] p-1 ring-1 ring-[var(--surface-border)]">
      {modes.map((m) => {
        const on = voicePrefs.listenMode === m.key;
        return (
          // eslint-disable-next-line no-restricted-syntax -- segment inside a radiogroup, not a standalone action.
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setListenMode(m.key)}
            className={`rounded-lg px-3 py-2 text-[13px] font-bold transition ${
              on ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--text-mid)] hover:text-[var(--ink)]"
            }`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

export function LearningPreferencesCard({ index }: { index: number }) {
  const lang = useLanguagePrefs();
  const listenMode = useStudentStore((s) => s.voicePrefs.listenMode);
  const others = lang.secondary.filter((c) => c !== lang.preferred).map(languageName);

  return (
    <ProfileCard index={index}>
      <div className="flex items-center gap-4">
        <CardIcon>
          <Settings size={24} strokeWidth={1.9} />
        </CardIcon>
        <h2 className="text-[18px] font-extrabold text-[var(--ink)]">Learning preferences</h2>
      </div>

      <div className="mt-6 divide-y divide-[var(--surface-border)]">
        <Row
          icon={<Mic size={20} strokeWidth={2} />}
          title="Tutor voice"
          description="Choose the voice for your AI tutor."
          control={<VoiceControl />}
        />

        {lang.enabled && (
          <Row
            icon={<Languages size={20} strokeWidth={2} />}
            title="Learning language"
            description="Choose the language for your lessons and content."
            control={
              <Select
                aria-label="Learning language"
                value={lang.preferred}
                onChange={lang.change}
                disabled={lang.loading || lang.saving}
                options={LANGUAGE_OPTIONS}
              />
            }
            footnote={others.length ? `${others.join(", ")} ${others.length > 1 ? "are" : "is"} also available` : undefined}
          />
        )}

        <Row
          icon={<Radio size={20} strokeWidth={2} />}
          title="Voice activation"
          description="Talk freely, or hold a key while you speak."
          control={<ListenModeToggle />}
        />

        {listenMode === "ptt" && (
          <Row
            icon={<Keyboard size={20} strokeWidth={2} />}
            title="Push-to-talk key"
            description="The key you hold down to talk to your tutor."
            control={<div className="flex sm:justify-end"><PttHotkeyConfig compact /></div>}
          />
        )}
      </div>
    </ProfileCard>
  );
}
