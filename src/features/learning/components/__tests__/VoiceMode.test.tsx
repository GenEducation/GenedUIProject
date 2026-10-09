import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { LESSON_ID, NODE_1, lessonFixture } from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../../useLessonStore";
import { replyText } from "../../transcript";
import type { PipelineEvent, PipelineOptions } from "../../voice/loadPipeline";

/** A stand-in for the backend's audio client: records how it was opened and lets a test play the server's part. */
const fake = vi.hoisted(() => ({
  options: null as PipelineOptions | null,
  closed: 0,
  startError: null as (Error & { kind?: string }) | null,
}));
vi.mock("../../voice/loadPipeline", () => ({
  loadPipeline: async () => ({
    VoicePipeline: class {
      constructor(options: PipelineOptions) { fake.options = options; }
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

const emit = (e: PipelineEvent) => act(() => fake.options!.onEvent(e));
const server = (msg: object) => emit({ t: "server", msg } as PipelineEvent);
const store = () => useLessonStore.getState();

async function openVoice() {
  await store().load(LESSON_ID);
  store().setVoiceMode(true);
  render(<ChatPanel onShowFigure={vi.fn()} />);
  await waitFor(() => expect(fake.options).not.toBeNull());
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_LESSON_VOICE", "true");
  fake.options = null;
  fake.closed = 0;
  fake.startError = null;
  lessonFixture.reset();
  store().reset();
  localStorage.setItem("gened_auth_token", "token-synthetic");
  lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] }]);
});
afterEach(() => vi.unstubAllEnvs());

describe("voice mode", () => {
  it("opens the gateway's voice socket for this lesson, with the token as a subprotocol", async () => {
    await openVoice();
    expect(fake.options!.url).toMatch(/^ws.*\/v1\/voice$/);
    expect(fake.options!.protocols).toEqual(["gened-companion-v1", "companion-token.token-synthetic"]);
    expect(fake.options!.init).toMatchObject({ language: "en", instance_id: LESSON_ID, instance_node_id: NODE_1 });
    expect(fake.options!.interrupt).toBe("never");
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
