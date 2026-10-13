// Development knobs for the voice pipeline, read from this browser's localStorage so a tester can try a setting without a build.
// Unset (the normal case) means the defaults below. Nothing here is sent anywhere except as the pipeline's own `init` report.
//   gened_voice_interrupt   "echo_aware" (default): the learner may interrupt; the tutor's own echo never starts a turn
//                           "never": half duplex, the microphone is not listened to while the tutor speaks
//                           "allow": no echo check (headphones only)
//   gened_voice_vad         JSON object of VAD threshold overrides (public/voice/vad-worklet.js), e.g. {"confirm_ms":300}
//   gened_voice_processing  JSON object of browser processing to request, e.g. {"agc":false}

export type InterruptMode = "never" | "echo_aware" | "allow";

const MODES: readonly InterruptMode[] = ["never", "echo_aware", "allow"];

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // storage blocked: the defaults
  }
}

function readObject(key: string): Record<string, number | boolean> | undefined {
  const raw = read(key);
  if (!raw) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    const entries = Object.entries(value).filter(([, v]) => typeof v === "number" || typeof v === "boolean");
    return entries.length ? (Object.fromEntries(entries) as Record<string, number | boolean>) : undefined;
  } catch {
    return undefined;
  }
}

export function voiceTuning(): { interrupt: InterruptMode; vad?: Record<string, number | boolean>; processing?: { aec?: boolean; ns?: boolean; agc?: boolean } } {
  const mode = read("gened_voice_interrupt");
  return {
    interrupt: MODES.includes(mode as InterruptMode) ? (mode as InterruptMode) : "echo_aware",
    vad: readObject("gened_voice_vad"),
    processing: readObject("gened_voice_processing") as { aec?: boolean; ns?: boolean; agc?: boolean } | undefined,
  };
}
