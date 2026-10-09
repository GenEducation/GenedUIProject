"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthToken } from "@/utils/authFetch";
import { useLessonStore } from "../useLessonStore";
import { loadPipeline, type MicErrorKind, type PipelineEvent, type VoicePipelineInstance } from "./loadPipeline";

export type VoicePhase =
  | "connecting" // opening the microphone and the socket
  | "listening" // ready, waiting for the learner
  | "hearing" // the learner is speaking
  | "thinking" // the learner stopped; the tutor is preparing a reply
  | "speaking" // the tutor's audio is playing
  | "reconnecting"
  | "offline"; // voice ended for good; the lesson carries on in text

export interface VoiceSession {
  phase: VoicePhase;
  /** What the server is hearing right now (partial transcript), cleared once final. */
  heard: string;
  /** Microphone level, 0..1, for the waveform. */
  level: number;
  /** Why voice stopped, in words for the learner. */
  error: string | null;
  /** The learner muted the microphone: nothing is sent, and the server ignores what it would have heard. */
  muted: boolean;
  /** Mute or unmute (absent when there's no live session). Muting while the tutor speaks stops its reply. */
  setMuted?: (muted: boolean) => void;
}

const MIC_ERRORS: Record<MicErrorKind, string> = {
  denied: "Microphone access was blocked. Allow it in your browser to talk.",
  no_device: "No microphone was found.",
  busy: "Another app is using the microphone.",
  unsupported: "This browser can't use the microphone here.",
  failed: "The microphone couldn't start.",
};

const STARTING: VoiceSession = { phase: "connecting", heard: "", level: 0, error: null, muted: false };

/** The capture worklet's RMS is in int16 units; ordinary speech sits around 1–3k. */
const RMS_FULL_SCALE = 2600;

/** The gateway's voice socket, from the API base URL. */
export function voiceSocketUrl(apiBase = process.env.NEXT_PUBLIC_API_URL ?? ""): string {
  return `${apiBase.replace(/\/$/, "").replace(/^http/, "ws")}/v1/voice`;
}

/**
 * The live voice session for the lesson (backend `voice_wire_v1` over the
 * gateway's `/v1/voice`), while `active`. The audio path itself is the
 * backend's reference client (`public/voice/`); this maps what it reports onto
 * the lesson: spoken replies become turns in the same store as typed ones.
 */
export function useVoiceSession(active: boolean): VoiceSession {
  const instanceId = useLessonStore((s) => s.instanceId);
  // Only whether there is a node: the socket follows the lesson once open, so moving to a new node must not reconnect it.
  const hasNode = useLessonStore((s) => Boolean(s.instance?.active_node));
  const [session, setSession] = useState<VoiceSession>(STARTING);
  const pipelineRef = useRef<VoicePipelineInstance | null>(null);

  const setMuted = useCallback((muted: boolean) => {
    const pipeline = pipelineRef.current;
    if (!pipeline) return;
    // Tell the server (voice_wire_v1 `mute`), and stop the track so no audio leaves the page while muted.
    pipeline.worker?.postMessage({ t: "send", msg: { type: "mute", muted } });
    if (pipeline.track) pipeline.track.enabled = !muted;
    setSession((s) => ({ ...s, muted, level: muted ? 0 : s.level }));
  }, []);

  useEffect(() => {
    const store = useLessonStore.getState();
    const startNode = store.instance?.active_node?.instance_node_id;
    if (!active || !instanceId || !startNode) return;
    let pipeline: VoicePipelineInstance | null = null;
    let closed = false;
    /** The learner's last final words, waiting for the reply they start. */
    let pendingLearnerText: string | null = null;
    const turnByResponse = new Map<number, string>();
    const update = (patch: Partial<VoiceSession>) => !closed && setSession((s) => ({ ...s, ...patch }));
    const goOffline = (error: string) => update({ phase: "offline", error, level: 0 });

    const onEvent = (e: PipelineEvent) => {
      switch (e.t) {
        case "capture":
          update({ level: Math.min(1, e.rms / RMS_FULL_SCALE) });
          break;
        case "ui":
          if (e.ev === "utterance_start") update({ phase: "hearing" });
          else if (e.ev === "utterance_end") update({ phase: "thinking" });
          else if (e.ev === "speaking") update({ phase: e.on ? "speaking" : "listening" });
          else if (e.ev === "drained" || e.ev === "stopped") update({ phase: "listening" });
          break;
        case "status":
          if (e.state === "reconnecting") update({ phase: "reconnecting" });
          else if (e.state === "reconnected") update({ phase: "listening" });
          else if (e.state === "gave_up" || e.state === "worker_error") goOffline("Voice disconnected. You can keep going in the chat.");
          break;
        case "mic":
          if (e.event === "track_ended") goOffline("The microphone stopped.");
          break;
        case "server": {
          const m = e.msg;
          if (m.type === "ready") update({ phase: "listening", error: null });
          else if (m.type === "transcript") {
            if (m.kind === "final") {
              pendingLearnerText = m.text.trim() || null;
              update({ heard: "" });
            } else update({ heard: m.text });
          } else if (m.type === "response_started") {
            turnByResponse.set(m.response_no, m.turn_id);
            store.voiceTurnStarted(m.turn_id, pendingLearnerText);
            pendingLearnerText = null;
          } else if (m.type === "teacher_event") store.voiceTurnEvent(m.event);
          else if (m.type === "response_ended") {
            const turnId = turnByResponse.get(m.response_no);
            if (turnId) store.voiceTurnEnded(turnId, m.reason);
          } else if (m.type === "error" && m.fatal) goOffline("Voice stopped. You can keep going in the chat.");
          break;
        }
      }
    };

    void (async () => {
      try {
        const { VoicePipeline } = await loadPipeline();
        if (closed) return;
        pipeline = new VoicePipeline({
          url: voiceSocketUrl(),
          // The gateway reads the account token from the subprotocols, never from a URL a log would keep.
          protocols: ["gened-companion-v1", `companion-token.${getAuthToken()}`],
          init: { language: "en", instance_id: instanceId, instance_node_id: startNode, device: navigator.userAgent.slice(0, 150) },
          // Half duplex: the tutor isn't cut off by its own echo through the speakers.
          interrupt: "never",
          onEvent,
        });
        await pipeline.start();
        pipelineRef.current = pipeline;
      } catch (error) {
        const kind = (error as { kind?: MicErrorKind })?.kind;
        goOffline(kind && kind in MIC_ERRORS ? MIC_ERRORS[kind] : "Voice couldn't start. You can keep going in the chat.");
      }
    })();

    return () => {
      closed = true;
      pipelineRef.current = null;
      void pipeline?.close().catch(() => undefined);
      setSession(STARTING); // the next session starts from scratch
    };
  }, [active, instanceId, hasNode]);

  return { ...session, setMuted };
}
