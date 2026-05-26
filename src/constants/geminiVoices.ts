/**
 * Type-only contract for the tutor voice picker.
 *
 * The actual catalog lives on the backend (MVP/core-service/voice_catalog.py)
 * and the FE fetches it at runtime via `fetchVoices()`. This module no longer
 * hardcodes a list — adding a new voice is a BE-only change.
 *
 * `sample_url` may come back as a relative path (e.g. `/voices/sample/Aoede`);
 * the fetch service normalizes it to an absolute URL before handing it off.
 */

export interface GeminiVoice {
  id: string;
  label: string;
  description: string;
  sample_url: string;
}

// Used only as a fallback when the student has no `preferred_voice` saved AND
// the catalog hasn't loaded yet. Must stay in lockstep with
// MVP/core-service/voice_catalog.py::DEFAULT_VOICE.
export const DEFAULT_GEMINI_VOICE = "Kore";
