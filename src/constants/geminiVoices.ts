/**
 * Voices supported by the Gemini Live API. Each `id` is the value the
 * backend expects in the WS init payload (`voice` field). `sample` points
 * to a short audio clip served from /public/voice-samples/<id>.wav.
 */

export interface GeminiVoice {
  id: string;
  label: string;
  description: string;
  sample: string;
}

// Must stay in lockstep with MVP/core-service/src/core_service/live_ws.py
// `DEFAULT_VOICE` — that's what Gemini Live actually falls back to when the
// student has no `preferred_voice` saved yet. If you change one, change both.
export const DEFAULT_GEMINI_VOICE = "Kore";

export const GEMINI_VOICES: GeminiVoice[] = [
  { id: "Aoede",  label: "Aoede",  description: "Warm, friendly female",     sample: "/voice-samples/aoede.wav"  },
  { id: "Puck",   label: "Puck",   description: "Upbeat, playful male",      sample: "/voice-samples/puck.wav"   },
  { id: "Charon", label: "Charon", description: "Calm, deep male",           sample: "/voice-samples/charon.wav" },
  { id: "Kore",   label: "Kore",   description: "Clear, neutral female",     sample: "/voice-samples/kore.wav"   },
  { id: "Fenrir", label: "Fenrir", description: "Energetic, expressive male", sample: "/voice-samples/fenrir.wav" },
  { id: "Leda",   label: "Leda",   description: "Bright, youthful female",   sample: "/voice-samples/leda.wav"   },
  { id: "Orus",   label: "Orus",   description: "Steady, mature male",       sample: "/voice-samples/orus.wav"   },
  { id: "Zephyr", label: "Zephyr", description: "Soft, breezy female",       sample: "/voice-samples/zephyr.wav" },
];

export function getVoiceById(id?: string | null): GeminiVoice {
  if (!id) return GEMINI_VOICES.find(v => v.id === DEFAULT_GEMINI_VOICE)!;
  return GEMINI_VOICES.find(v => v.id === id) ?? GEMINI_VOICES.find(v => v.id === DEFAULT_GEMINI_VOICE)!;
}
