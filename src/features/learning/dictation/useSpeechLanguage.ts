"use client";

import { create } from "zustand";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import type { VoiceLanguage } from "../types";
import { defaultDictationLanguage, saveDictationLanguage, savedDictationLanguage } from "./languages";

/**
 * The language the learner speaks to the tutor in, shared by dictation and voice mode: picking one in either
 * place applies to both, and it's remembered on this device.
 */
const usePickedLanguage = create<{ picked: VoiceLanguage | null; pick: (code: VoiceLanguage) => void }>((set) => ({
  picked: typeof window === "undefined" ? null : savedDictationLanguage(),
  pick: (code) => {
    saveDictationLanguage(code);
    set({ picked: code });
  },
}));

/** The learner's pick, else Hindi in a Hindi lesson, else their profile's language, else English. */
export function useSpeechLanguage(subject?: string | null): { language: VoiceLanguage; pick: (code: VoiceLanguage) => void } {
  const picked = usePickedLanguage((s) => s.picked);
  const pick = usePickedLanguage((s) => s.pick);
  const preferred = useStudentStore((s) => s.studentProfile?.preferred_language);
  return { language: defaultDictationLanguage({ saved: picked, subject, preferred }), pick };
}

/** Tests: forget the pick (the store outlives a render). */
export function resetSpeechLanguage(): void {
  usePickedLanguage.setState({ picked: savedDictationLanguage() });
}
