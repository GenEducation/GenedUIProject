"use client";

import { useEffect, useState } from "react";
import { useSessionLanguage } from "../i18n";
import { fetchVoiceCapabilities, languageLabel, voiceLanguageEnabled, type VoiceLanguage } from "./languages";

export interface VoiceLanguages {
  /** What the server offers; empty until it has answered. */
  languages: VoiceLanguage[];
  /** The tag the session opens with: the lesson's one session language, null until the offer is known or when voice can't open in it. */
  language: string | null;
  /** The offer couldn't be read, or voice can't open in the session language: voice stays off rather than guessing a language. */
  error: string | null;
}

/**
 * The language a voice session opens in, while `enabled`. It is always the lesson's session language, the one the learner picks
 * in the lesson's language selector, so typed and spoken tutoring never disagree. Voice never chooses a language of its own: if
 * the server cannot open voice in that language, it says so and the chat carries on in it.
 */
export function useVoiceLanguages(enabled: boolean): VoiceLanguages {
  const session = useSessionLanguage();
  const [languages, setLanguages] = useState<VoiceLanguage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || languages.length) return;
    const abort = new AbortController();
    fetchVoiceCapabilities(abort.signal)
      .then((caps) => setLanguages(caps.languages))
      .catch(() => {
        if (!abort.signal.aborted) setLoadError("Voice languages couldn't be loaded. You can keep going in the chat.");
      });
    return () => abort.abort();
  }, [enabled, languages.length]);

  if (loadError) return { languages, language: null, error: loadError };
  if (!languages.length) return { languages, language: null, error: null };
  const offered = languages.find((l) => l.language === session);
  if (!offered || !voiceLanguageEnabled(offered)) {
    const why = offered?.reason ? ` (${offered.reason})` : "";
    return {
      languages,
      language: null,
      error: `Voice isn't available in ${languageLabel(session)} yet${why}. Pick another language, or keep going in the chat.`,
    };
  }
  return { languages, language: session, error: null };
}
