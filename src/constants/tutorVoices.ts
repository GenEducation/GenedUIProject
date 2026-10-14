/**
 * Type-only contract for the tutor voice picker.
 *
 * The catalog lives on the backend (`gened_identity`'s tutor voice catalog, ADR 0036) and the FE fetches it at runtime
 * via `fetchVoices()`. Ids are the backend's app voice ids (`voice_a`, …), not provider or Gemini voice names, and the
 * student's pick is saved as `tutor_voice` on the profile. Adding or changing a voice is a backend-only change.
 *
 * `sample_url` comes back relative (e.g. `/voices/sample/voice_a?language=en&v=…`); the fetch service makes it absolute
 * before handing it off. Exactly one voice has `is_default: true`: the voice a student who never picked hears.
 */

export interface TutorVoice {
  id: string;
  label: string;
  description: string;
  sample_url: string;
  is_default: boolean;
}
