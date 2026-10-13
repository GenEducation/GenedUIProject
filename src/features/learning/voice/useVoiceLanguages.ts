"use client";

import { useCallback, useEffect, useState } from "react";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { defaultLanguage, fetchVoiceCapabilities, saveLanguageChoice, type VoiceLanguage } from "./languages";

export interface VoiceLanguages {
  /** What the server offers; empty until it has answered. */
  languages: VoiceLanguage[];
  /** The tag the session opens with, null until the offer is known (or when nothing may open). */
  language: string | null;
  setLanguage: (tag: string) => void;
  /** The offer couldn't be read, or nothing may open: voice stays off rather than guessing a language. */
  error: string | null;
}

/** The languages a voice session may open in, read from the backend while `enabled`, and the learner's choice among them. */
export function useVoiceLanguages(enabled: boolean): VoiceLanguages {
  const preferred = useStudentStore((s) => s.studentProfile?.preferred_language);
  const [languages, setLanguages] = useState<VoiceLanguage[]>([]);
  const [choice, setChoice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || languages.length) return;
    const abort = new AbortController();
    fetchVoiceCapabilities(abort.signal)
      .then((caps) => {
        setLanguages(caps.languages);
        if (!caps.languages.some((l) => l.may_open !== false)) setError("Voice isn't open for any language yet. You can keep going in the chat.");
      })
      .catch(() => {
        if (!abort.signal.aborted) setError("Voice languages couldn't be loaded. You can keep going in the chat.");
      });
    return () => abort.abort();
  }, [enabled, languages.length]);

  const setLanguage = useCallback((tag: string) => {
    saveLanguageChoice(tag);
    setChoice(tag);
  }, []);

  const offered = choice && languages.some((l) => l.language === choice && l.may_open !== false) ? choice : defaultLanguage(languages, preferred);
  return { languages, language: offered, setLanguage, error };
}
