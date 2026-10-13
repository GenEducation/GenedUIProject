import type { VoiceLanguage } from "../types";

/**
 * The languages a learner can dictate in: the app's own language set (the same codes as voice mode and the
 * profile's language preference), each with the BCP-47 tag the browser's speech recogniser expects.
 */
export interface DictationLanguage {
  code: VoiceLanguage;
  /** In its own script, for the picker. */
  name: string;
  /** In English, for screen readers and messages. */
  english: string;
  /** What `SpeechRecognition.lang` is set to. */
  recognition: string;
}

export const DICTATION_LANGUAGES: DictationLanguage[] = [
  { code: "en", name: "English", english: "English", recognition: "en-IN" },
  { code: "hi", name: "हिन्दी", english: "Hindi", recognition: "hi-IN" },
  // Hinglish is typed in Latin script: Indian English recognition keeps it that way (hi-IN would write Devanagari).
  { code: "hi-Latn", name: "Hinglish", english: "Hinglish", recognition: "en-IN" },
  { code: "mr", name: "मराठी", english: "Marathi", recognition: "mr-IN" },
  { code: "pa", name: "ਪੰਜਾਬੀ", english: "Punjabi", recognition: "pa-Guru-IN" },
  { code: "ta", name: "தமிழ்", english: "Tamil", recognition: "ta-IN" },
  { code: "te", name: "తెలుగు", english: "Telugu", recognition: "te-IN" },
  { code: "kn", name: "ಕನ್ನಡ", english: "Kannada", recognition: "kn-IN" },
];

export function dictationLanguage(code: string | null | undefined): DictationLanguage | null {
  return DICTATION_LANGUAGES.find((l) => l.code === code) ?? null;
}

const STORAGE_KEY = "gened_dictation_language";

/** The learner's last pick on this device, if it's still one we offer. */
export function savedDictationLanguage(): VoiceLanguage | null {
  try {
    return dictationLanguage(localStorage.getItem(STORAGE_KEY))?.code ?? null;
  } catch {
    return null;
  }
}

export function saveDictationLanguage(code: VoiceLanguage): void {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Blocked storage: the pick lasts for this lesson only.
  }
}

/**
 * Which language dictation starts in: the learner's last pick on this device, else Hindi in a Hindi lesson, else
 * the language their profile prefers, else English.
 */
export function defaultDictationLanguage({
  saved,
  subject,
  preferred,
}: {
  saved: string | null;
  subject?: string | null;
  preferred?: string | null;
}): VoiceLanguage {
  return (
    dictationLanguage(saved)?.code ??
    (subject && /hindi/i.test(subject) ? "hi" : null) ??
    dictationLanguage(preferred)?.code ??
    "en"
  );
}
