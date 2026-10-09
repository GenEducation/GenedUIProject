import type { SequencedTurnEvent } from "../types";

/** What the vendored `public/voice/pipeline.js` reports through `onEvent` (only what the lesson reads). */
export type PipelineEvent =
  | { t: "status"; state: "open" | "closed" | "error" | "reconnecting" | "reconnected" | "gave_up" | "stalled" | "worker_error"; code?: number; message?: string }
  | { t: "server"; msg: VoiceServerMessage }
  | { t: "ui"; ev: "utterance_start" | "utterance_end" | "speaking" | "first_sample" | "drained" | "stopped" | string; on?: boolean }
  | { t: "capture"; rms: number; speaking?: boolean }
  | { t: "mic"; event: string; detail?: Record<string, unknown> }
  | { t: "playback_stats"; speaking?: boolean };

export type VoiceServerMessage =
  | { type: "ready"; session_id: string; degraded: string[] }
  | { type: "transcript"; utterance_no: number; kind: "partial" | "stable" | "final"; text: string }
  | { type: "response_started"; response_no: number; turn_id: string }
  | { type: "teacher_event"; response_no: number; event: SequencedTurnEvent }
  | { type: "response_ended"; response_no: number; reason: "completed" | "failed" | "interrupted" | "cancelled" }
  | { type: "state"; state: string }
  | { type: "error"; code: string; message: string; fatal?: boolean }
  | { type: "cancel" | "bye" | "timeline" | "clock_ping" | "pong" };

export interface PipelineOptions {
  url: string;
  protocols?: string[];
  init: { language: string; instance_id: string; instance_node_id: string; device?: string };
  interrupt?: "never" | "allow";
  onEvent: (event: PipelineEvent) => void;
}

export interface VoicePipelineInstance {
  start(): Promise<{ aec: boolean; ns: boolean; agc: boolean; inRate: number }>;
  close(): Promise<void>;
}

/** `MicError.kind` from the pipeline: why the microphone couldn't be opened. */
export type MicErrorKind = "denied" | "no_device" | "busy" | "unsupported" | "failed";

export interface PipelineModule {
  VoicePipeline: new (options: PipelineOptions) => VoicePipelineInstance;
  MicError: new (...args: never[]) => Error & { kind: MicErrorKind };
}

const PIPELINE_URL = "/voice/pipeline.js";

/**
 * Loads the backend's reference audio client from `public/voice/` at runtime.
 * It is served, not bundled: it loads its worklets and worker by URL relative
 * to itself. Browser-only.
 */
export function loadPipeline(url = PIPELINE_URL): Promise<PipelineModule> {
  // A runtime URL, not a module path: every bundler (webpack, Turbopack, Vite in tests) must leave it alone.
  return import(/* webpackIgnore: true */ /* turbopackIgnore: true */ /* @vite-ignore */ url) as Promise<PipelineModule>;
}
