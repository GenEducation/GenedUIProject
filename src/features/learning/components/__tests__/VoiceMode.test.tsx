import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { LESSON_ID, NODE_1, lessonFixture } from "@/test/msw/handlers/lesson";
import { makeCapabilities, voiceFixture, voiceCapabilityRequests } from "@/test/msw/handlers/voice";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { useLessonStore } from "../../useLessonStore";
import { replyText } from "../../transcript";
import type { PipelineEvent, PipelineOptions } from "../../voice/loadPipeline";

/** A stand-in for the backend's audio client: records how it was opened and lets a test play the server's part. */
const fake = vi.hoisted(() => ({
  options: null as PipelineOptions | null,
  closed: 0,
  startError: null as (Error & { kind?: string }) | null,
  sent: [] as unknown[],
  track: { enabled: true },
  calls: [] as string[],
  throwOnRelease: false,
}));
vi.mock("../../voice/loadPipeline", () => ({
  loadPipeline: async () => ({
    VoicePipeline: class {
      constructor(options: PipelineOptions) { fake.options = options; }
      worker = { postMessage: (m: unknown) => fake.sent.push(m) };
      track = fake.track;
      setMode(mode: string) { fake.calls.push(`mode:${mode}`); }
      press() { fake.calls.push("press"); }
      release() {
        if (fake.throwOnRelease) throw new Error("worker gone");
        fake.calls.push("release");
      }
      async start() {
        if (fake.startError) throw fake.startError;
        return { aec: true, ns: true, agc: true, inRate: 48000 };
      }
      async close() { fake.closed += 1; }
    },
    MicError: class extends Error {},
  }),
}));

import { ChatPanel } from "../ChatPanel";
import { voiceSocketUrl } from "../../voice/useVoiceSession";
import { resetSpeechLanguage } from "../../dictation/useSpeechLanguage";

const emit = (e: PipelineEvent) => act(() => fake.options!.onEvent(e));
const server = (msg: object) => emit({ t: "server", msg } as PipelineEvent);
const store = () => useLessonStore.getState();

async function openVoice(subject?: string) {
  await store().load(LESSON_ID);
  store().setVoiceMode(true);
  render(<ChatPanel onShowFigure={vi.fn()} subject={subject} />);
  await waitFor(() => expect(fake.options).not.toBeNull());
}

const picker = () => screen.findByRole("combobox", { name: "Voice language" });
const chooseLanguage = async (label: string) => {
  fireEvent.click(await picker());
  fireEvent.click(screen.getByRole("option", { name: new RegExp(label) }));
};
const setPreference = (preferred_language: string | null) =>
  useStudentStore.setState({ studentProfile: { user_id: "u", role: "STUDENT", preferred_language } as never });

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_LESSON_VOICE", "true");
  fake.options = null;
  fake.closed = 0;
  fake.startError = null;
  fake.sent = [];
  fake.calls = [];
  fake.throwOnRelease = false;
  fake.track = { enabled: true };
  lessonFixture.reset();
  voiceFixture.reset();
  useStudentStore.setState({ studentProfile: null });
  store().reset();
  localStorage.removeItem("gened_dictation_language");
  resetSpeechLanguage();
  localStorage.setItem("gened_auth_token", "token-synthetic");
  lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] }]);
});
afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.removeItem("gened_voice_language");
  localStorage.removeItem("gened_voice_push_to_talk");
  localStorage.removeItem("gened_voice_interrupt");
  localStorage.removeItem("gened_voice_vad");
});

describe("voice mode", () => {
  it("takes a tester's duplex and VAD overrides from this browser's storage, and ignores ones it cannot use", async () => {
    localStorage.setItem("gened_voice_interrupt", "never");
    localStorage.setItem("gened_voice_vad", JSON.stringify({ confirm_ms: 300, label: "not a number" }));
    await openVoice();
    expect(fake.options!.interrupt).toBe("never");
    expect(fake.options!.vad).toEqual({ confirm_ms: 300 });
  });

  it("opens the gateway's voice socket for this lesson, with the token as a subprotocol", async () => {
    await openVoice();
    expect(fake.options!.url).toMatch(/^ws.*\/v1\/voice$/);
    expect(fake.options!.protocols).toEqual(["gened-companion-v1", "companion-token.token-synthetic"]);
    expect(fake.options!.init).toMatchObject({ language: "en", instance_id: LESSON_ID, instance_node_id: NODE_1 });
    // Echo-aware: the learner may interrupt without headphones; the tutor's own echo never starts a turn.
    expect(fake.options!.interrupt).toBe("echo_aware");
    expect(fake.options!.vad).toBeUndefined();
    // The text input is replaced, not stacked.
    expect(screen.queryByRole("textbox", { name: "Message your tutor" })).toBeNull();
    expect(screen.getByText("Connecting…")).toBeInTheDocument();
  });

  it("a spoken exchange lands in the chat like a typed one", async () => {
    await openVoice();
    await server({ type: "ready", session_id: "s", degraded: [] });
    expect(screen.getByText("Listening…")).toBeInTheDocument();
    await emit({ t: "ui", ev: "utterance_start" });
    expect(screen.getByText("Hearing you")).toBeInTheDocument();
    await server({ type: "transcript", utterance_no: 1, kind: "partial", text: "SYNTHETIC what is" });
    expect(screen.getByText("“SYNTHETIC what is”")).toBeInTheDocument();
    await server({ type: "transcript", utterance_no: 1, kind: "final", text: "SYNTHETIC what is this" });

    const turn_id = "aaaaaaaa-0000-4000-8000-000000000001";
    await server({ type: "response_started", response_no: 1, turn_id });
    await server({ type: "teacher_event", response_no: 1, event: { v: 3, turn_id, seq: 1, type: "turn_started", kind: "learner_message", instance_node_id: NODE_1, instance_revision: 4, protocol: "teacher_turn_stream_v3" } });
    await server({ type: "teacher_event", response_no: 1, event: { v: 3, turn_id, seq: 2, type: "text_delta", text: "SYNTHETIC spoken answer." } });
    await server({ type: "teacher_event", response_no: 1, event: { v: 3, turn_id, seq: 3, type: "turn_completed", status: "completed", finish_reason: "stop" } });
    await server({ type: "response_ended", response_no: 1, reason: "completed" });

    expect(screen.getByText("SYNTHETIC what is this")).toBeInTheDocument();
    expect(screen.getByText("SYNTHETIC spoken answer.")).toBeInTheDocument();
    expect(store().turns.at(-1)).toMatchObject({ learnerText: "SYNTHETIC what is this", status: "completed" });
  });

  it("a cancelled reply that never closed is settled as interrupted", async () => {
    await openVoice();
    const turn_id = "aaaaaaaa-0000-4000-8000-000000000002";
    await server({ type: "response_started", response_no: 2, turn_id });
    await server({ type: "teacher_event", response_no: 2, event: { v: 3, turn_id, seq: 1, type: "text_delta", text: "SYNTHETIC half" } });
    await server({ type: "response_ended", response_no: 2, reason: "cancelled" });
    const last = store().turns.at(-1)!;
    expect(last.status).toBe("interrupted");
    expect(replyText(last)).toBe("SYNTHETIC half");
  });

  it("the mic mutes: tells the server, stops the track, and unmutes the same way", async () => {
    await openVoice();
    await server({ type: "ready", session_id: "s", degraded: [] });
    const mic = await screen.findByRole("button", { name: "Mute microphone" });
    fireEvent.click(mic);
    expect(fake.sent).toEqual([{ t: "send", msg: { type: "mute", muted: true } }]);
    expect(fake.track.enabled).toBe(false);
    expect(screen.getByRole("button", { name: "Unmute microphone" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Muted")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Unmute microphone" }));
    expect(fake.sent.at(-1)).toEqual({ t: "send", msg: { type: "mute", muted: false } });
    expect(fake.track.enabled).toBe(true);
    expect(screen.getByText("Listening…")).toBeInTheDocument();
  });

  it("muting does not touch the tutor's playback: only the mute frame and the track change", async () => {
    await openVoice();
    await server({ type: "ready", session_id: "s", degraded: [] });
    await emit({ t: "ui", ev: "speaking", on: true });
    fireEvent.click(await screen.findByRole("button", { name: "Mute microphone" }));
    expect(fake.sent).toEqual([{ t: "send", msg: { type: "mute", muted: true } }]);
    expect(fake.calls).toEqual([]);
  });

  describe("push to talk", () => {
    const toggle = () => screen.findByRole("button", { name: "Push to talk" });
    const ready = async () => {
      await openVoice();
      await server({ type: "ready", session_id: "s", degraded: [] });
    };

    it("is off by default (automatic), with no hold button", async () => {
      await ready();
      expect(await toggle()).toHaveAttribute("aria-pressed", "false");
      expect(screen.queryByRole("button", { name: /hold to speak/i })).toBeNull();
      expect(fake.calls).toEqual([]);
    });

    it("switches the pipeline live, remembers the choice and applies it to the next session", async () => {
      await ready();
      fireEvent.click(await toggle());
      expect(fake.calls).toEqual(["mode:hold"]);
      expect(localStorage.getItem("gened_voice_push_to_talk")).toBe("1");
      expect(screen.getByRole("button", { name: "Push to talk" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Tap or hold to speak" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Push to talk" }));
      expect(fake.calls.at(-1)).toBe("mode:auto");
      expect(localStorage.getItem("gened_voice_push_to_talk")).toBe("0");
    });

    it("starts in hold mode when it was left on", async () => {
      localStorage.setItem("gened_voice_push_to_talk", "1");
      await ready();
      expect(fake.calls).toEqual(["mode:hold"]);
      expect(await toggle()).toHaveAttribute("aria-pressed", "true");
    });

    it("a press held longer than a tap sends on release, showing that it is listening while held", async () => {
      const clock = vi.spyOn(performance, "now");
      await ready();
      fireEvent.click(await toggle());
      const hold = screen.getByRole("button", { name: "Tap or hold to speak" });
      clock.mockReturnValue(1000);
      fireEvent.pointerDown(hold);
      fireEvent.pointerDown(hold); // a double press is one press
      expect(fake.calls.filter((c) => c === "press")).toHaveLength(1);
      expect(screen.getByRole("button", { name: "Listening… release to send" })).toHaveAttribute("aria-pressed", "true");
      clock.mockReturnValue(2500);
      fireEvent.pointerUp(screen.getByRole("button", { name: "Listening… release to send" }));
      expect(fake.calls.at(-1)).toBe("release");
      expect(screen.getByRole("button", { name: "Tap or hold to speak" })).toBeInTheDocument();
      fireEvent.pointerDown(hold);
      fireEvent.pointerCancel(hold);
      expect(fake.calls.filter((c) => c === "release")).toHaveLength(2);
      clock.mockRestore();
    });

    it("a tap starts listening until the next tap, which sends (the flow a learner expects from a button)", async () => {
      const clock = vi.spyOn(performance, "now");
      await ready();
      fireEvent.click(await toggle());
      const button = screen.getByRole("button", { name: "Tap or hold to speak" });
      clock.mockReturnValue(1000);
      fireEvent.pointerDown(button);
      clock.mockReturnValue(1120);
      fireEvent.pointerUp(button);
      expect(fake.calls).not.toContain("release");
      expect(screen.getByRole("button", { name: "Listening… tap to send" })).toHaveAttribute("aria-pressed", "true");
      clock.mockReturnValue(6000);
      fireEvent.pointerDown(button);
      fireEvent.pointerUp(button);
      expect(fake.calls.filter((c) => c === "press")).toHaveLength(1);
      expect(fake.calls.at(-1)).toBe("release");
      expect(screen.getByRole("button", { name: "Tap or hold to speak" })).toBeInTheDocument();
      clock.mockRestore();
    });

    it("holds with the Space bar, taps with it too, except while typing in a field", async () => {
      const clock = vi.spyOn(performance, "now");
      await ready();
      fireEvent.click(await toggle());
      const field = document.createElement("input");
      document.body.appendChild(field);
      fireEvent.keyDown(field, { code: "Space" });
      expect(fake.calls).not.toContain("press");
      field.remove();
      clock.mockReturnValue(1000);
      fireEvent.keyDown(document.body, { code: "Space" });
      fireEvent.keyDown(document.body, { code: "Space", repeat: true });
      expect(fake.calls.filter((c) => c === "press")).toHaveLength(1);
      clock.mockReturnValue(3000);
      fireEvent.keyUp(document.body, { code: "Space" });
      expect(fake.calls.at(-1)).toBe("release");
      clock.mockReturnValue(4000);
      fireEvent.keyDown(document.body, { code: "Space" });
      clock.mockReturnValue(4100);
      fireEvent.keyUp(document.body, { code: "Space" });
      expect(fake.calls.at(-1)).toBe("press");
      fireEvent.keyDown(document.body, { code: "Space" });
      expect(fake.calls.at(-1)).toBe("release");
      clock.mockRestore();
    });

    it("releases when the window loses focus", async () => {
      await ready();
      fireEvent.click(await toggle());
      fireEvent.keyDown(document.body, { code: "Space" });
      fireEvent.blur(window);
      expect(fake.calls.at(-1)).toBe("release");
    });

    it("has one control in push to talk: no mute toggle, and turning it on while muted unmutes", async () => {
      await ready();
      fireEvent.click(screen.getByRole("button", { name: "Mute microphone" }));
      fireEvent.click(await toggle());
      expect(screen.queryByRole("button", { name: "Mute microphone" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Unmute microphone" })).toBeNull();
      expect(screen.getByRole("button", { name: "Tap or hold to speak" })).toBeEnabled();
      fireEvent.click(screen.getByRole("button", { name: "Push to talk" }));
      expect(screen.getByRole("button", { name: "Mute microphone" })).toBeInTheDocument();
    });

    it("Space still talks when the last click left a button focused, and does not click that button", async () => {
      const clock = vi.spyOn(performance, "now");
      await ready();
      const ptt = await toggle();
      fireEvent.click(ptt);
      ptt.focus();
      clock.mockReturnValue(1000);
      fireEvent.keyDown(ptt, { code: "Space" });
      expect(fake.calls.at(-1)).toBe("press");
      clock.mockReturnValue(3000);
      const up = new KeyboardEvent("keyup", { code: "Space", bubbles: true, cancelable: true });
      ptt.dispatchEvent(up);
      expect(up.defaultPrevented).toBe(true);
      expect(fake.calls.at(-1)).toBe("release");
      expect(ptt).toHaveAttribute("aria-pressed", "true"); // still on: Space did not toggle it off
      clock.mockRestore();
    });

    it("lets the learner press while the tutor speaks: that is how they interrupt it", async () => {
      await ready();
      fireEvent.click(await toggle());
      await emit({ t: "ui", ev: "speaking", on: true });
      expect(screen.getByRole("button", { name: "Tap or hold to speak" })).toBeEnabled();
      fireEvent.keyDown(document.body, { code: "Space" });
      expect(fake.calls).toContain("press");
    });

    it("a release after the session ended, or with a dead worker, does not throw", async () => {
      await ready();
      fireEvent.click(await toggle());
      const hold = screen.getByRole("button", { name: "Tap or hold to speak" });
      fireEvent.pointerDown(hold);
      fake.throwOnRelease = true;
      expect(() => fireEvent.pointerUp(hold)).not.toThrow();
      fireEvent.pointerDown(hold);
      fireEvent.click(screen.getByRole("button", { name: /End/ }));
      expect(() => fireEvent.keyUp(document.body, { code: "Space" })).not.toThrow();
    });
  });

  it("End closes the session and brings the text input back", async () => {
    await openVoice();
    fireEvent.click(screen.getByRole("button", { name: "End" }));
    expect(store().voiceMode).toBe(false);
    await waitFor(() => expect(fake.closed).toBe(1));
    expect(screen.getByRole("textbox", { name: "Message your tutor" })).toBeInTheDocument();
  });

  it("a blocked microphone says so and offers the way back to typing", async () => {
    fake.startError = Object.assign(new Error("denied"), { kind: "denied" });
    await openVoice();
    expect(await screen.findByRole("alert")).toHaveTextContent("Microphone access was blocked.");
    fireEvent.click(screen.getByRole("button", { name: "Back to typing" }));
    expect(store().voiceMode).toBe(false);
  });

  it("giving up on reconnecting leaves the lesson in text", async () => {
    await openVoice();
    await emit({ t: "status", state: "gave_up", code: 1011 });
    expect(screen.getByRole("alert")).toHaveTextContent("Voice disconnected. You can keep going in the chat.");
  });
});

describe("voiceSocketUrl", () => {
  it("swaps http(s) for ws(s) on the API base", () => {
    expect(voiceSocketUrl("https://api.example.test/")).toBe("wss://api.example.test/v1/voice");
    expect(voiceSocketUrl("http://localhost:8102")).toBe("ws://localhost:8102/v1/voice");
  });
});

describe("voice language", () => {
  it("lists exactly the languages the capabilities endpoint returns, in native script", async () => {
    await openVoice();
    expect(voiceCapabilityRequests.length).toBe(1);
    fireEvent.click(await picker());
    const labels = screen.getAllByRole("option").map((o) => o.textContent);
    expect(labels).toEqual(["English", "हिन्दी", "Hinglish", "मराठी", "ਪੰਜਾਬੀ", "தமிழ்", "తెలుగు", "ಕನ್ನಡ"]);
  });

  it("shows nothing the endpoint did not return: a smaller offer is a smaller list", async () => {
    voiceFixture.set(makeCapabilities([{ language: "en", script: "latin", features: [], assessed_tutoring: false, open_gaps: [] }, { language: "ta", script: "tamil", features: [], assessed_tutoring: false, open_gaps: [] }]));
    await openVoice();
    fireEvent.click(await picker());
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["English", "தமிழ்"]);
  });

  it("shows a language the endpoint marks closed greyed, with its reason, and cannot be chosen", async () => {
    voiceFixture.set(makeCapabilities([
      { language: "en", script: "latin", features: [], assessed_tutoring: false, open_gaps: [] },
      { language: "kn", script: "kannada", features: [], assessed_tutoring: false, open_gaps: [], may_open: false, reason: "capability:stt" },
    ]));
    await openVoice();
    fireEvent.click(await picker());
    const kn = screen.getByRole("option", { name: /ಕನ್ನಡ/ });
    expect(kn).toHaveAttribute("aria-disabled", "true");
    expect(kn).toHaveTextContent("capability:stt");
  });

  it("opens in English with no preference, and sends the tag in init", async () => {
    await openVoice();
    expect(fake.options!.init.language).toBe("en");
    expect(await picker()).toHaveTextContent("English");
  });

  it("defaults to the learner's profile preference", async () => {
    setPreference("mr");
    await openVoice();
    expect(fake.options!.init.language).toBe("mr");
    expect(await picker()).toHaveTextContent("मराठी");
  });

  it("falls back to the last choice, then ignores a preference the server does not offer", async () => {
    localStorage.setItem("gened_voice_language", "ta");
    setPreference("gu");
    await openVoice();
    expect(fake.options!.init.language).toBe("ta");
  });

  it("changing the language ends the session and opens a new one in it, remembering the choice", async () => {
    await openVoice();
    const first = fake.options!;
    await server({ type: "ready", session_id: "s", degraded: [] });
    await chooseLanguage("हिन्दी");
    await waitFor(() => expect(fake.options).not.toBe(first));
    expect(fake.closed).toBe(1);
    expect(fake.options!.init.language).toBe("hi");
    expect(await picker()).toHaveTextContent("हिन्दी");
    expect(localStorage.getItem("gened_voice_language")).toBe("hi");
    expect(screen.getByText("जुड़ रहे हैं…")).toBeInTheDocument(); // a fresh session, not the old one carried over; its words are Hindi now
  });

  it("a refused language says which one, does not fall back, and can be changed", async () => {
    await openVoice();
    await chooseLanguage("తెలుగు");
    await waitFor(() => expect(fake.options!.init.language).toBe("te"));
    await server({ type: "error", code: "language_not_enabled", message: "te: capability:stt", fatal: true });
    expect(screen.getByRole("alert")).toHaveTextContent("Voice isn't available in తెలుగు (te)");
    await emit({ t: "status", state: "gave_up", code: 1008 });
    expect(screen.getByRole("alert")).toHaveTextContent("తెలుగు"); // the generic message does not replace it
    expect(fake.options!.init.language).toBe("te");
    await chooseLanguage("English");
    await waitFor(() => expect(fake.options!.init.language).toBe("en"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does not start voice, or guess a language, when the capabilities cannot be read", async () => {
    voiceFixture.fail(500);
    await store().load(LESSON_ID);
    store().setVoiceMode(true);
    render(<ChatPanel onShowFigure={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Voice languages couldn't be loaded.");
    expect(fake.options).toBeNull();
  });

  it("renders the transcript with a font stack that covers the Indic scripts", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const stack = css.match(/\.font-indic\s*\{([^}]*)\}/)?.[1] ?? "";
    for (const script of ["Devanagari", "Gurmukhi", "Tamil", "Telugu", "Kannada"]) expect(stack).toContain(`Noto Sans ${script}`);
  });

  it("component code holds no language list: it comes from the capabilities response", () => {
    const root = join(process.cwd(), "src/features/learning");
    const files = ["components/VoiceWaveform.tsx", "components/ChatPanel.tsx", "voice/useVoiceSession.ts", "voice/useVoiceLanguages.ts"];
    for (const f of files) {
      const code = readFileSync(join(root, f), "utf8");
      expect(code, f).not.toMatch(/["'](hi|mr|pa|ta|te|kn|hi-Latn)["']/);
    }
    // The only table is the labels in languages.ts, and it is applied to what the server returned, never iterated to build the list.
    const lang = readFileSync(join(root, "voice/languages.ts"), "utf8");
    expect(lang).not.toMatch(/Object\.(keys|entries|values)\(NATIVE_LABELS\)/);
  });
});
