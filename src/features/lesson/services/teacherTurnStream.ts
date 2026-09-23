import { getAuthToken } from "@/utils/authFetch";
import { parseSSEStream } from "./sseParser";
import type { TeacherTurnStreamFrame, TurnRequest } from "../types/lesson";
import { isKeepalive, isTerminal } from "../types/lesson";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
const INSTANCES_BASE = `${API_BASE_URL}/v1/instances`;

/** The gap-as-protocol-error retry budget (TEXT_STREAMING_TRANSPORT_v1 §4's "retry: 1000"). */
const RESUME_RETRY_DELAY_MS = 1000;
const MAX_RESUME_ATTEMPTS = 5;

/**
 * The server refused to admit the turn (an HTTP error before the stream,
 * TEACHER_TURN_v1 §1: stale_node, teacher_busy, too_many_streams, …). Nothing
 * was admitted, so there is nothing to resume.
 */
export class TurnRejected extends Error {
  constructor(
    readonly status: number,
    readonly error_code: string,
    message: string,
  ) {
    super(message);
    this.name = "TurnRejected";
  }
}

async function rejection(response: Response): Promise<TurnRejected> {
  let body: { error_code?: string; message?: string } = {};
  try {
    body = await response.json();
  } catch {
    // not JSON: fall back to the status alone
  }
  return new TurnRejected(response.status, body.error_code ?? `HTTP_${response.status}`, body.message ?? "Your tutor couldn't start that reply.");
}

export interface TeacherTurnStreamHandlers {
  /** Every frame in seq order, after gap/duplicate filtering — nothing else touches `last_seq`. */
  onFrame: (frame: TeacherTurnStreamFrame) => void;
  /** The connection dropped and a resume is about to be attempted; UI may show "reconnecting". */
  onReconnecting?: () => void;
  /** Resumes exhausted, or an error before the first byte. The turn's true state is still whatever
   * the last committed event said — a caller can always recover with `getTeacherTurns`. */
  onGiveUp?: (error: unknown) => void;
}

export interface TeacherTurnStreamHandle {
  /** Aborts the client's connection only. Does not tell the server the learner stopped —
   * call `lessonService.interruptTurn` for that (POST .../interrupt is the learner-stop signal). */
  close: () => void;
}

function authHeaders(lastEventId?: string): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    Authorization: token ? `Bearer ${token}` : "",
    Accept: "text/event-stream",
  };
  if (lastEventId) headers["Last-Event-ID"] = lastEventId;
  return headers;
}

/**
 * Admits a new turn and streams its log from seq 0 (or, on a retried
 * request with the same `turn_id`, attaches to the existing stream —
 * TEACHER_TURN_v1 §1).
 */
export function openTeacherTurnStream(
  instanceId: string,
  turnRequest: TurnRequest,
  handlers: TeacherTurnStreamHandlers,
): TeacherTurnStreamHandle {
  const controller = new AbortController();
  void runStream(
    controller.signal,
    () =>
      fetch(`${INSTANCES_BASE}/${instanceId}/teacher-turns`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(turnRequest),
        signal: controller.signal,
      }),
    (afterSeq) => resumeFetch(instanceId, turnRequest.turn_id, afterSeq, controller.signal),
    handlers,
    true,
  );
  return { close: () => controller.abort() };
}

/**
 * Reconnects to an already-admitted turn's log: the committed suffix after
 * `afterSeq`, then live events until the terminal one. Used both for the
 * client's own initial resume (e.g. after a page reload mid-turn, once the
 * caller knows an open turn's id from `GET teacher-turns`) and internally
 * whenever `openTeacherTurnStream`'s connection drops.
 */
export function resumeTeacherTurnStream(
  instanceId: string,
  turnId: string,
  afterSeq: number,
  handlers: TeacherTurnStreamHandlers,
): TeacherTurnStreamHandle {
  const controller = new AbortController();
  void runStream(
    controller.signal,
    () => resumeFetch(instanceId, turnId, afterSeq, controller.signal),
    (seq) => resumeFetch(instanceId, turnId, seq, controller.signal),
    handlers,
  );
  return { close: () => controller.abort() };
}

function resumeFetch(instanceId: string, turnId: string, afterSeq: number, signal: AbortSignal): Promise<Response> {
  const url = new URL(`${INSTANCES_BASE}/${instanceId}/teacher-turns/${turnId}/events`);
  url.searchParams.set("after_seq", String(afterSeq));
  return fetch(url.toString(), {
    headers: authHeaders(`${turnId}:${afterSeq}`),
    signal,
  });
}

/**
 * Drives one connection attempt through `parseSSEStream`, filters and
 * orders frames (§4's client rules), and on a lost connection or a sequence
 * gap resumes from the last frame it accepted — up to `MAX_RESUME_ATTEMPTS` —
 * rather than surfacing every transport hiccup to the caller.
 */
async function runStream(
  signal: AbortSignal,
  openFirst: () => Promise<Response>,
  openResume: (afterSeq: number) => Promise<Response>,
  handlers: TeacherTurnStreamHandlers,
  firstIsAdmission = false,
): Promise<void> {
  let lastSeq = 0;
  let admitted = !firstIsAdmission;
  let attempt = 0;
  let opener = openFirst;

  while (!signal.aborted) {
    try {
      const response = await opener();
      if (!admitted && !response.ok) {
        handlers.onGiveUp?.(await rejection(response));
        return;
      }
      admitted = true;
      if (!response.ok || !response.body) {
        throw new Error(`teacher-turn stream failed to open: ${response.status}`);
      }
      attempt = 0; // a connection that opened resets the resume budget

      for await (const raw of parseSSEStream(response.body)) {
        const frame = JSON.parse(raw.data) as TeacherTurnStreamFrame;

        if (isKeepalive(frame)) {
          // No id, never moves Last-Event-ID (§4).
          continue;
        }

        if (frame.seq <= lastSeq) {
          // Already-seen event from an overlapping resume window — drop it.
          continue;
        }
        if (frame.seq > lastSeq + 1) {
          // A gap is a protocol error: resume from the last accepted seq
          // rather than rendering out of order or skipping text.
          throw new Error(`sequence gap: had ${lastSeq}, got ${frame.seq}`);
        }

        lastSeq = frame.seq;
        handlers.onFrame(frame);

        if (isTerminal(frame)) return; // server ends the body right after; nothing left to read
      }

      // Body ended with no terminal event: a lost transport (§4). Resume.
      throw new Error("teacher-turn stream ended without a terminal event");
    } catch (error) {
      if (signal.aborted) return;

      attempt += 1;
      if (attempt > MAX_RESUME_ATTEMPTS) {
        handlers.onGiveUp?.(error);
        return;
      }
      handlers.onReconnecting?.();
      // Until the admission POST has answered, retry that same POST (idempotent
      // by turn_id); once admitted, resume the log from the last accepted seq.
      opener = admitted ? () => openResume(lastSeq) : openFirst;
      await delay(RESUME_RETRY_DELAY_MS, signal);
    }
  }
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
