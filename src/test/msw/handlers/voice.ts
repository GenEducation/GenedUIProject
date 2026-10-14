import { http, HttpResponse } from "msw";
import type { VoiceCapabilities, VoiceLanguage } from "@/features/learning/voice/languages";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

const lang = (language: string, script: string, features: string[] = []): VoiceLanguage => ({
  language,
  script,
  features,
  assessed_tutoring: false,
  open_gaps: [],
});

/** What the realtime process answers in a pilot tier (SYNTHETIC gate state); a test swaps it with `voiceFixture.set`. */
export const makeCapabilities = (languages: VoiceLanguage[]): VoiceCapabilities => ({
  gates: "language_gates_v1",
  tier: "pilot",
  languages,
  platform_complete: false,
});

const defaults = () =>
  makeCapabilities([
    lang("en", "latin", ["spoken_answers"]),
    lang("hi", "devanagari", ["spoken_answers"]),
    lang("hi-Latn", "latin"),
    lang("mr", "devanagari"),
    lang("pa", "gurmukhi"),
    lang("ta", "tamil"),
    lang("te", "telugu"),
    lang("kn", "kannada"),
  ]);

let current: VoiceCapabilities | number = defaults();
export const voiceCapabilityRequests: string[] = [];

export const voiceFixture = {
  reset() {
    current = defaults();
    voiceCapabilityRequests.length = 0;
  },
  set: (caps: VoiceCapabilities) => void (current = caps),
  /** Make the endpoint answer with this status instead. */
  fail: (status: number) => void (current = status),
};

export const voiceHandlers = [
  http.get(`${BASE}/v1/voice/capabilities`, () => {
    voiceCapabilityRequests.push("GET");
    return typeof current === "number" ? HttpResponse.json({ error: "x" }, { status: current }) : HttpResponse.json(current);
  }),
];
