import { authFetch } from "@/utils/authFetch";

/** One language of `GET /v1/voice/capabilities` (backend apps/realtime `capabilities`, ADR 0034). */
export interface VoiceLanguage {
  /** The wire tag a session opens with (`init.language`). */
  language: string;
  script: string;
  /** Optional capabilities on for this language in this tier, for example `spoken_answers`. */
  features: string[];
  assessed_tutoring: boolean;
  open_gaps: string[];
  /** Absent today (the endpoint lists only what may open); a client shows `may_open: false` greyed with `reason`. */
  may_open?: boolean;
  reason?: string | null;
}

export interface VoiceCapabilities {
  gates: string;
  tier: string;
  languages: VoiceLanguage[];
  platform_complete: boolean;
}

/**
 * How a language is written for its own speakers. This only labels tags the server returned: which languages exist, and
 * whether they may open, is the endpoint's call, never this table's. An unknown tag is shown as the tag itself.
 */
const NATIVE_LABELS: Record<string, string> = {
  en: "English",
  hi: "हिन्दी",
  "hi-Latn": "Hinglish",
  mr: "मराठी",
  pa: "ਪੰਜਾਬੀ",
  ta: "தமிழ்",
  te: "తెలుగు",
  kn: "ಕನ್ನಡ",
};

export const languageLabel = (tag: string): string => NATIVE_LABELS[tag] ?? tag;

export const voiceLanguageEnabled = (l: VoiceLanguage): boolean => l.may_open !== false;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export async function fetchVoiceCapabilities(signal?: AbortSignal): Promise<VoiceCapabilities> {
  // A 403 here is an answer (voice is not open to this account), not an expired session.
  const res = await authFetch(`${API_BASE_URL}/v1/voice/capabilities`, { signal, allow403: true });
  if (!res.ok) throw new Error(`voice capabilities: ${res.status}`);
  return (await res.json()) as VoiceCapabilities;
}

/** The eight session languages (backend `gened_language`): the only tags a turn or a session may carry. */
export const SESSION_LANGUAGES = ["en", "hi", "hi-Latn", "mr", "pa", "ta", "te", "kn"] as const;
export type SessionLanguage = (typeof SESSION_LANGUAGES)[number];

export const isSessionLanguage = (tag: unknown): tag is SessionLanguage =>
  typeof tag === "string" && (SESSION_LANGUAGES as readonly string[]).includes(tag);

/**
 * The language a learner chose on this browser is kept per learner. One key shared by every learner on a browser (the old
 * `gened_voice_language`) let one child's choice become the next child's tutor language on a shared computer, ahead of that
 * child's own profile; it is removed and never read.
 */
const SHARED_KEY = "gened_voice_language";
const choiceKey = (learnerId: string) => `gened_lesson_language:${learnerId}`;

function forgetSharedChoice(): void {
  try {
    localStorage.removeItem(SHARED_KEY);
  } catch {
    /* blocked storage: there is nothing to forget */
  }
}

/** This learner's own last choice on this browser, if it is one of the eight session languages. */
export function readLanguageChoice(learnerId: string | null | undefined): SessionLanguage | null {
  forgetSharedChoice();
  if (!learnerId) return null;
  try {
    const tag = localStorage.getItem(choiceKey(learnerId));
    return isSessionLanguage(tag) ? tag : null;
  } catch {
    return null;
  }
}

export function saveLanguageChoice(learnerId: string | null | undefined, tag: SessionLanguage): void {
  if (!learnerId) return;
  try {
    localStorage.setItem(choiceKey(learnerId), tag);
  } catch {
    /* a private window or blocked storage: the choice lasts for this page only */
  }
}

/**
 * The session language for typed turns, the voice session and the lesson screen's words: the language picked in this lesson,
 * else this learner's own last choice on this browser, else their profile preference, else English. Never another learner's.
 */
export function resolveSessionLanguage(
  picked: string | null | undefined,
  learnerId: string | null | undefined,
  preferred?: string | null,
): SessionLanguage {
  for (const tag of [picked, readLanguageChoice(learnerId), preferred]) if (isSessionLanguage(tag)) return tag;
  return "en";
}
