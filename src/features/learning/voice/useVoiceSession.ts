"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthToken } from "@/utils/authFetch";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useLessonStore, type SpokenCheckMark } from "../useLessonStore";
import { languageLabel } from "./languages";
import { loadPipeline, type MicErrorKind, type PipelineEvent, type VoicePipelineInstance } from "./loadPipeline";
import { voiceTuning } from "./voiceTuning";

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
  /** The language this session was opened in (the server never swaps it), null until one is chosen. */
  language: string | null;
  /** Mute or unmute (absent when there's no live session). Muting only silences the microphone; the tutor keeps speaking. */
  setMuted?: (muted: boolean) => void;
  /** Push to talk: the learner's press and release, not the automatic detector, decide when they are heard. */
  pushToTalk: boolean;
  /** The push-to-talk button is held down. */
  held: boolean;
  setPushToTalk?: (on: boolean) => void;
  /** Start / end speaking in push to talk; safe to call at any time (ignored with no live session, while muted or while the tutor speaks). */
  press?: () => void;
  release?: () => void;
}

const MIC_ERRORS: Record<MicErrorKind, string> = {
  denied: "Microphone access was blocked. Allow it in your browser to talk.",
  no_device: "No microphone was found.",
  busy: "Another app is using the microphone.",
  unsupported: "This browser can't use the microphone here.",
  failed: "The microphone couldn't start.",
};

const STARTING: VoiceSession = { phase: "connecting", heard: "", level: 0, error: null, muted: false, language: null, pushToTalk: false, held: false };

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
 * the lesson: spoken replies become turns in the same store as typed ones. A session
 * is opened in one `language`; choosing another ends it and opens a new one.
 */
export function useVoiceSession(active: boolean, language: string | null): VoiceSession {
  const instanceId = useLessonStore((s) => s.instanceId);
  // The server binds a voice session to the node named at `init` and checks every turn against it, so the session follows the
  // lesson by reconnecting: moving to a new node ends the old socket (which cancels the old reply) and opens one for the new node,
  // whose opening the server then speaks (backend ADR 0025: a fresh `init`, no resume).
  const activeNodeId = useLessonStore((s) => s.instance?.active_node?.instance_node_id ?? null);
  const [session, setSession] = useState<VoiceSession>(STARTING);
  const pipelineRef = useRef<VoicePipelineInstance | null>(null);
  // Hold to talk is the student's own setting, the same one Profile's "Voice activation" shows and changes.
  const pushToTalk = useStudentStore((s) => s.voicePrefs.listenMode === "ptt");
  const [held, setHeld] = useState(false);
  // The press handlers read the latest of these without being recreated.
  const live = useRef({ muted: false, phase: session.phase, held: false, pushToTalk });
  useEffect(() => {
    live.current = { ...live.current, muted: session.muted, phase: session.phase, pushToTalk };
  }, [session.muted, session.phase, pushToTalk]);

  const release = useCallback(() => {
    if (!live.current.held) return;
    live.current.held = false;
    setHeld(false);
    try {
      pipelineRef.current?.release();
    } catch {
      // the session ended under the learner's finger
    }
  }, []);

  const press = useCallback(() => {
    const { muted, phase, held: already, pushToTalk: on } = live.current;
    const pipeline = pipelineRef.current;
    // Pressing while the tutor speaks is allowed: it is how the learner interrupts (the server confirms a barge-in from what it hears,
    // backend ADR 0017). Nothing is sent while muted or before the session is up.
    if (!pipeline || !on || muted || already || phase === "offline" || phase === "connecting" || phase === "reconnecting") return;
    try {
      pipeline.press();
    } catch {
      return;
    }
    live.current.held = true;
    setHeld(true);
  }, []);

  const setPushToTalk = useCallback(
    (on: boolean) => {
      release();
      // Saved to the student's voice preferences, so Profile shows the same choice (and remembers it for next time).
      useStudentStore.getState().setListenMode(on ? "ptt" : "continuous");
      try {
        pipelineRef.current?.setMode(on ? "hold" : "auto");
      } catch {
        // applied when the next session opens
      }
    },
    [release],
  );

  const setMuted = useCallback((muted: boolean) => {
    const pipeline = pipelineRef.current;
    if (!pipeline) return;
    if (muted) release();
    // Tell the server (voice_wire_v1 `mute`), and stop the track so no audio leaves the page while muted.
    pipeline.worker?.postMessage({ t: "send", msg: { type: "mute", muted } });
    if (pipeline.track) pipeline.track.enabled = !muted;
    setSession((s) => ({ ...s, muted, level: muted ? 0 : s.level }));
  }, [release]);

  useEffect(() => {
    const store = useLessonStore.getState();
    const startNode = store.instance?.active_node?.instance_node_id;
    if (!active || !language || !instanceId || !startNode) return;
    let pipeline: VoicePipelineInstance | null = null;
    let closed = false;
    /** The learner's last final words, waiting for the reply they start. */
    let pendingLearnerText: string | null = null;
    const turnByResponse = new Map<number, string>();
    /**
     * Per tutor reply: the check it may be reading aloud, whether its audio began, and whether it was cut off. Only a reply
     * whose audio began and played to its end confirms the check (backend ADR 0035 decision 5); a barge-in, a mute, a failed
     * or cancelled reply and a reconnect confirm nothing.
     */
    const replies = new Map<number, { mark: SpokenCheckMark | null; began: boolean; cut: boolean }>();
    let currentReply: number | null = null;
    const cutAllReplies = () => replies.forEach((r) => (r.cut = true));
    const update = (patch: Partial<VoiceSession>) => !closed && setSession((s) => ({ ...s, ...patch }));
    /** The server refused this language: that message stays, whatever the dropped socket reports next. */
    let refused = false;
    const goOffline = (error: string) => !refused && update({ phase: "offline", error, level: 0 });

    const onEvent = (e: PipelineEvent) => {
      switch (e.t) {
        case "capture":
          update({ level: Math.min(1, e.rms / RMS_FULL_SCALE) });
          break;
        case "ui":
          if ((e.ev === "speaking" && e.on) || e.ev === "first_sample") {
            const reply = replies.get(e.responseNo ?? currentReply ?? -1);
            if (reply) reply.began = true;
          } else if (e.ev === "drained" || e.ev === "stopped") {
            const no = e.responseNo ?? currentReply ?? -1;
            const reply = replies.get(no);
            if (reply) {
              replies.delete(no);
              // `drained`: the audio played to its end. `stopped`: it was cut off (barge-in, mute, cancel): nothing is confirmed.
              void store.checkPlaybackEnded(reply.mark, e.ev === "drained" && reply.began && !reply.cut);
            }
          }
          if (e.ev === "utterance_start") update({ phase: "hearing" });
          else if (e.ev === "utterance_end") update({ phase: "thinking" });
          else if (e.ev === "speaking") update({ phase: e.on ? "speaking" : "listening" });
          else if (e.ev === "drained" || e.ev === "stopped") update({ phase: "listening" });
          break;
        case "status":
          if (e.state === "reconnecting") {
            cutAllReplies(); // audio from the lost session never counts
            update({ phase: "reconnecting" });
          }
          else if (e.state === "reconnected") update({ phase: "listening" });
          else if (e.state === "gave_up" || e.state === "worker_error") goOffline("Voice disconnected. You can keep going in the chat.");
          break;
        case "mic":
          if (e.event === "track_ended") goOffline("The microphone stopped.");
          break;
        case "server": {
          const m = e.msg;
          if (m.type === "ready") {
            // The session id answers and deliveries are bound to; a reconnect brings a new one and the visible check is confirmed again.
            store.setVoiceSession(m.session_id);
            update({ phase: "listening", error: null });
          }
          else if (m.type === "transcript") {
            if (m.kind === "final") {
              pendingLearnerText = m.text.trim() || null;
              update({ heard: "" });
            } else update({ heard: m.text });
          } else if (m.type === "response_started") {
            turnByResponse.set(m.response_no, m.turn_id);
            replies.set(m.response_no, { mark: store.spokenCheckAtStart(), began: false, cut: false });
            currentReply = m.response_no;
            store.voiceTurnStarted(m.turn_id, pendingLearnerText);
            pendingLearnerText = null;
          } else if (m.type === "teacher_event") store.voiceTurnEvent(m.event);
          else if (m.type === "response_ended") {
            if (m.reason !== "completed") {
              const reply = replies.get(m.response_no);
              if (reply) reply.cut = true;
            }
            const turnId = turnByResponse.get(m.response_no);
            if (turnId) store.voiceTurnEnded(turnId, m.reason);
          } else if (m.type === "error" && m.code === "language_not_enabled") {
            goOffline(`Voice isn't available in ${languageLabel(language)} (${language}) right now. Choose another language, or keep going in the chat.`);
            refused = true;
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
          init: { language, instance_id: instanceId, instance_node_id: startNode, device: navigator.userAgent.slice(0, 150) },
          // Echo-aware by default: the learner may interrupt, and a sound the tutor's own echo explains never starts a turn.
          ...voiceTuning(),
          onEvent,
        });
        await pipeline.start();
        pipelineRef.current = pipeline;
        if (live.current.pushToTalk) pipeline.setMode("hold");
      } catch (error) {
        const kind = (error as { kind?: MicErrorKind })?.kind;
        goOffline(kind && kind in MIC_ERRORS ? MIC_ERRORS[kind] : "Voice couldn't start. You can keep going in the chat.");
      }
    })();

    return () => {
      closed = true;
      cutAllReplies();
      store.setVoiceSession(null);
      pipelineRef.current = null;
      live.current.held = false;
      setHeld(false);
      void pipeline?.close().catch(() => undefined);
      setSession(STARTING); // the next session starts from scratch
    };
    // The server takes the language and the node once, at `init`: a new one reconnects with it.
  }, [active, instanceId, activeNodeId, language]);

  return { ...session, language, setMuted, pushToTalk, held, setPushToTalk, press, release };
}
