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

const CHOICE_KEY = "gened_voice_language";

export function readLanguageChoice(): string | null {
  try {
    return localStorage.getItem(CHOICE_KEY);
  } catch {
    return null;
  }
}

export function saveLanguageChoice(tag: string): void {
  try {
    localStorage.setItem(CHOICE_KEY, tag);
  } catch {
    /* a private window or blocked storage: the choice just isn't remembered */
  }
}

/** The learner's profile preference, else their last choice here, else English: whichever the server offers first; never one it doesn't. */
export function defaultLanguage(offered: VoiceLanguage[], preferred?: string | null): string | null {
  const open = offered.filter(voiceLanguageEnabled).map((l) => l.language);
  for (const tag of [readLanguageChoice(), preferred, "en"]) {
    if (tag && open.includes(tag)) return tag;
  }
  return open[0] ?? null;
}
