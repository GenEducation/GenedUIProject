import { create } from "zustand";
import { asError } from "@/utils/errors";
import { lessonService } from "../services/lessonService";
import {
  isAlreadyCoveredNote,
  mergeTranscript,
  recordedTurnToTranscript,
  type EarlierPart,
  type TranscriptTurn,
} from "./transcript";
import {
  openTeacherTurnStream,
  resumeTeacherTurnStream,
  TurnRejected,
  type TeacherTurnStreamHandle,
} from "../services/teacherTurnStream";
import type {
  AnswerResponse,
  ChapterReport,
  InstanceState,
  PresentationManifest,
  Section,
  TeacherPayload,
  TeacherTurnStreamFrame,
  TurnKind,
} from "../types/lesson";

export type { EarlierPart, TranscriptTurn } from "./transcript";

interface AnswerFeedback {
  itemId: string;
  attemptId: string;
  outcome: "correct" | "incorrect" | "unscorable" | "quarantined";
  correct: boolean | null;
  roundState: "open" | "passed" | "failed";
}

export type LessonPhase = "idle" | "loading" | "ready" | "blocked" | "completed" | "error";

interface LessonState {
  phase: LessonPhase;
  instance: InstanceState | null;
  payload: TeacherPayload | null;
  /** Signed URLs for the current payload's crops. Never frozen — refetch on an image 403. */
  manifest: PresentationManifest | null;
  transcript: TranscriptTurn[];
  /** Parts finished during this visit, kept above the current part's conversation. */
  earlier: EarlierPart[];
  /** The chapter's name, from the textbook path of the first section seen. */
  chapterTitle: string | null;
  /** Textbook sections seen this visit, by section version, so a later part that reuses them can show them. */
  sectionCache: Record<string, Section>;
  /** The turn currently streaming, if any — drives the Stop button and the resume-on-reload check. */
  openTurnId: string | null;
  /** Highest seq the learner has actually seen rendered for the open turn (§4/§5 "visible_seq"). */
  visibleSeq: number;
  lastAnswerFeedback: AnswerFeedback | null;
  report: ChapterReport | null;
  errorCode: string | null;
  errorMessage: string | null;
  isSending: boolean;

  loadChapter: (chapterId: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  stopTeacher: () => Promise<void>;
  /** `displayText` is how the answer reads in the conversation (the option's text, not its id). */
  submitAnswer: (itemId: string, response: AnswerResponse, latencyMs: number, displayText?: string) => Promise<void>;
  requestHint: (itemId: string) => Promise<void>;
  markNodeDone: () => Promise<void>;
  regenerateLastTurn: () => Promise<void>;
  /** A figure's signed URL expired (its <img> 403'd). Reissues the manifest, TTL-bucketed so this is cheap. */
  refreshManifest: () => Promise<void>;
  reset: () => void;
}

type Set = (partial: Partial<LessonState> | ((state: LessonState) => Partial<LessonState>)) => void;
type Get = () => LessonState;

const INITIAL = {
  phase: "idle" as LessonPhase,
  instance: null as InstanceState | null,
  payload: null as TeacherPayload | null,
  manifest: null as PresentationManifest | null,
  transcript: [] as TranscriptTurn[],
  earlier: [] as EarlierPart[],
  chapterTitle: null as string | null,
  sectionCache: {} as Record<string, Section>,
  openTurnId: null as string | null,
  visibleSeq: 0,
  lastAnswerFeedback: null as AnswerFeedback | null,
  report: null as ChapterReport | null,
  errorCode: null as string | null,
  errorMessage: null as string | null,
  isSending: false,
};

/** The one open connection at a time — a new turn always supersedes the last. */
let activeStream: TeacherTurnStreamHandle | null = null;

function newRequestId(): string {
  return crypto.randomUUID();
}

export const useLessonStore = create<LessonState>((set, get) => ({
  ...INITIAL,

  loadChapter: async (chapterId: string) => {
    set({ phase: "loading", errorCode: null, errorMessage: null });
    try {
      const instance = await lessonService.openInstance(chapterId);
      await refreshForNode(set, get, instance);
    } catch (error) {
      const e = asError(error);
      set({ phase: "error", errorCode: e.error_code ?? null, errorMessage: e.message ?? "Could not open the lesson." });
    }
  },

  sendMessage: async (text: string) => {
    const { instance } = get();
    if (!instance?.active_node || !text.trim()) return;
    set({ errorCode: null, errorMessage: null });

    // No separate /engagement call: the turn itself records the message as
    // one engagement, or as an answer to a pending check
    // (gened_learning.chat.record_chat_message, ADR 0006 D3/D4). Calling
    // both counted every message twice.

    // Captured before beginTurn resets `visibleSeq` for the new turn — this
    // is what the learner had actually seen rendered of the turn it interrupts.
    const prevOpenTurnId = get().openTurnId;
    const prevVisibleSeq = get().visibleSeq;
    const turnId = newRequestId();
    beginTurn(set, get, turnId, "learner_message", text);
    startTurnStream(set, get, instance.id, {
      turn_id: turnId,
      kind: "learner_message",
      instance_node_id: get().instance!.active_node!.instance_node_id,
      text: text.trim(),
      latency_ms: 0,
      // A message sent while the teacher is still streaming supersedes it,
      // reporting exactly what the learner had seen rendered (§6).
      interrupts: prevOpenTurnId ? { turn_id: prevOpenTurnId, visible_seq: prevVisibleSeq } : null,
    });
  },

  /** The learner's own Stop button. `visibleSeq` is what they actually saw rendered. */
  stopTeacher: async () => {
    const { instance, openTurnId, visibleSeq } = get();
    if (!instance || !openTurnId) return;
    stopActiveStream();
    try {
      await lessonService.interruptTurn(instance.id, openTurnId, { visible_seq: visibleSeq });
    } catch {
      // The stream side (turn_interrupted, or a resumed reload) is the
      // source of truth either way; a failed stop call isn't fatal here.
    }
  },

  submitAnswer: async (itemId: string, response: AnswerResponse, latencyMs: number, displayText?: string) => {
    const { instance } = get();
    if (!instance) return;
    set({ isSending: true, errorCode: null, errorMessage: null });
    try {
      const result = await lessonService.submitAnswer(instance.id, {
        request_id: newRequestId(),
        item_id: itemId,
        expected_revision: instance.revision,
        // A choice response must carry channel "choice"; every other kind
        // is "typed" (domains/assessment/src/gened_assessment/interpret.py
        // in the backend: `expected = ChoiceResponse if channel == "choice"
        // else typed`, so an MCQ sent as "typed" 422s with CORE_3105).
        channel: response.kind === "choice" ? "choice" : "typed",
        latency_ms: latencyMs,
        response,
      });
      if (result.outcome === "unscorable") {
        // Nothing was scored and the question is still open. There is nothing for the
        // tutor to react to (the attempt has no feedback), so say so here, without a model call.
        const turn: TranscriptTurn = {
          turnId: newRequestId(),
          kind: "result_reaction",
          learnerText: displayText ?? null,
          teacherText: "",
          status: "completed",
          createdAt: new Date().toISOString(),
          answer: { outcome: "unscorable", correct: null },
          localOnly: true,
        };
        set({ instance: sameNodeOrKeep(get().instance, result.instance), isSending: false, transcript: [...get().transcript, turn] });
        return;
      }
      set({
        instance: sameNodeOrKeep(get().instance, result.instance),
        isSending: false,
        lastAnswerFeedback: {
          itemId,
          attemptId: result.attempt_id,
          outcome: result.outcome,
          correct: result.correct,
          roundState: result.round_state,
        },
      });

      // The teacher's reaction is bound to this attempt's own node and
      // revision, never the currently active node (TEACHER_TURN_v1 §3).
      const turnId = newRequestId();
      beginTurn(set, get, turnId, "result_reaction", displayText ?? null, {
        outcome: result.outcome,
        correct: result.correct,
      });
      startTurnStream(set, get, instance.id, {
        turn_id: turnId,
        kind: "result_reaction",
        instance_node_id: instance.active_node?.instance_node_id ?? "",
        attempt_id: result.attempt_id,
      });
    } catch (error) {
      const e = asError(error);
      set({ isSending: false, errorCode: e.error_code ?? null, errorMessage: e.message ?? "Could not submit that answer." });
      if (e.error_code === "stale_node") await get().loadChapter(instance.chapter_id);
    }
  },

  requestHint: async (itemId: string) => {
    const { instance } = get();
    if (!instance?.active_node) return;
    set({ errorCode: null, errorMessage: null });
    // No separate /hints call: a `hint` turn records the request on the
    // server before the prompt is built (TEACHER_TURN_v1 §3,
    // ASSISTANCE_TRACKING_v1), so calling both recorded it twice.
    const turnId = newRequestId();
    beginTurn(set, get, turnId, "hint", "Can I have a hint?");
    startTurnStream(set, get, instance.id, {
      turn_id: turnId,
      kind: "hint",
      instance_node_id: instance.active_node.instance_node_id,
      item_id: itemId,
    });
  },

  markNodeDone: async () => {
    const { instance } = get();
    if (!instance) return;
    try {
      const updated = await lessonService.markDone(instance.id, {
        request_id: newRequestId(),
        expected_revision: instance.revision,
      });
      await refreshForNode(set, get, updated);
    } catch (error) {
      const e = asError(error);
      set({ errorCode: e.error_code ?? null, errorMessage: e.message ?? "Could not finish this part." });
      if (e.error_code === "stale_node") await get().loadChapter(instance.chapter_id);
    }
  },

  regenerateLastTurn: async () => {
    const { instance, transcript } = get();
    const failed = [...transcript].reverse().find((t) => t.status === "failed");
    if (!instance?.active_node || !failed) return;
    const turnId = newRequestId();
    beginTurn(set, get, turnId, failed.kind, failed.learnerText);
    startTurnStream(set, get, instance.id, {
      turn_id: turnId,
      kind: "regenerate",
      instance_node_id: instance.active_node.instance_node_id,
      regenerates: failed.turnId,
    });
  },

  refreshManifest: async () => {
    const { instance } = get();
    if (!instance) return;
    try {
      const manifest = await lessonService.getPresentationManifest(instance.id);
      set({ manifest });
    } catch {
      // The images that were already showing keep their (possibly now-expired) URLs;
      // the next render attempt (or a full reload) will pick up a fresh manifest.
    }
  },

  reset: () => {
    stopActiveStream();
    set(INITIAL);
  },
}));

// ── Internals ────────────────────────────────────────────────────────────
// Kept as module functions, not store actions, so they can take the fresh
// `instance`/`turnId` a caller just computed without a second store read.

function beginTurn(
  set: Set,
  get: Get,
  turnId: string,
  kind: TurnKind,
  learnerText: string | null,
  answer?: TranscriptTurn["answer"],
): void {
  const turn: TranscriptTurn = {
    turnId,
    kind,
    learnerText,
    answer,
    teacherText: "",
    status: "streaming",
    createdAt: new Date().toISOString(),
  };
  set({ transcript: [...get().transcript, turn], openTurnId: turnId, visibleSeq: 0 });
}

function startTurnStream(
  set: Set,
  get: Get,
  instanceId: string,
  request: Parameters<typeof openTeacherTurnStream>[1],
): void {
  attachStream(
    openTeacherTurnStream(instanceId, request, {
      onFrame: (frame) => handleFrame(set, get, frame),
      onGiveUp: (error) => giveUp(set, get, error),
    }),
  );
}

/**
 * Loads the active node's teach content and recorded transcript, opens the
 * node's teacher turn if it has never been opened, or reattaches to one
 * still streaming (a reload mid-turn). Called after every state transition
 * that can change the active node: chapter open, done, and a turn closing.
 */
async function refreshForNode(set: Set, get: Get, instance: InstanceState): Promise<void> {
  if (instance.state === "completed" || instance.next_action === "completed") {
    const report = await lessonService.getReport(instance.id);
    set({ phase: "completed", report, instance });
    return;
  }
  if (!instance.active_node) {
    set({ phase: instance.blocked ? "blocked" : "error", instance });
    return;
  }

  const [payload, recorded, manifest] = await Promise.all([
    lessonService.getTeacherPayload(instance.id),
    lessonService.getTeacherTurns(instance.id, instance.active_node.instance_node_id),
    lessonService.getPresentationManifest(instance.id),
  ]);

  const previous = get();
  const sameNode = previous.instance?.active_node?.instance_node_id === instance.active_node.instance_node_id;
  const transcript = mergeTranscript(recorded.map(recordedTurnToTranscript), sameNode ? previous.transcript : []);
  if (!sameNode && previous.instance?.active_node && previous.transcript.length > 0) {
    // Moving on keeps the finished part's conversation on screen above the new one,
    // so the lesson reads as one continuous thread rather than resetting.
    set({
      earlier: [
        ...previous.earlier,
        { instanceNodeId: previous.instance.active_node.instance_node_id, title: previous.instance.active_node.title, turns: previous.transcript },
      ],
    });
  }
  const openTurn = recorded.find((t) => t.closed_at === null);

  const sectionCache = { ...previous.sectionCache };
  for (const section of payload.node.sections) {
    if (!isAlreadyCoveredNote(section)) sectionCache[section.version_id] = section;
  }
  const chapterTitle = previous.chapterTitle ?? payload.node.sections.find((sec) => sec.path.length > 1)?.path[0] ?? null;

  set({
    phase: instance.blocked ? "blocked" : "ready",
    instance,
    payload,
    manifest,
    sectionCache,
    chapterTitle,
    transcript,
    openTurnId: openTurn?.turn_id ?? null,
    visibleSeq: openTurn?.committed_through_seq ?? 0,
    lastAnswerFeedback: null,
  });

  stopActiveStream();
  if (openTurn) {
    attachStream(
      resumeTeacherTurnStream(instance.id, openTurn.turn_id, openTurn.committed_through_seq ?? 0, {
        onFrame: (frame) => handleFrame(set, get, frame),
        onGiveUp: (error) => giveUp(set, get, error),
      }),
    );
  } else if (transcript.length === 0) {
    // A node with no recorded turns yet: the teacher opens on its own,
    // client-triggered (ADR 0006 D7) — idempotent, so a duplicate is a replay.
    const turnId = newRequestId();
    beginTurn(set, get, turnId, "opening", null);
    startTurnStream(set, get, instance.id, {
      turn_id: turnId,
      kind: "opening",
      instance_node_id: instance.active_node.instance_node_id,
    });
  }
}

/** The single point every stream frame passes through, for every turn kind. */
function handleFrame(set: Set, get: Get, frame: TeacherTurnStreamFrame): void {
  let closedInstance: InstanceState | null = null;

  set((state) => {
    const idx = state.transcript.findIndex((t) => t.turnId === frame.turn_id);
    if (idx === -1) return {};
    const transcript = [...state.transcript];
    const turn = { ...transcript[idx] };

    switch (frame.type) {
      case "text_delta":
        if (frame.text !== null) turn.teacherText += frame.text;
        break;
      case "turn_completed":
        turn.status = "completed";
        break;
      case "turn_interrupted":
        turn.status = "interrupted";
        break;
      case "turn_failed":
        turn.status = "failed";
        turn.failedReason = frame.reason;
        turn.retryable = frame.retryable;
        break;
      case "answer_recorded":
        // A chat message the server read as an answer to the open question.
        turn.answer = { outcome: frame.outcome, correct: frame.correct };
        break;
      case "figure_presented":
        turn.figureGroupId = frame.figure_group_id;
        break;
      case "state_changed":
        // Authoritative: represents the plan moving to a new active node,
        // never a conversational cue — never read as "open the next node now".
        closedInstance = frame.instance;
        break;
      default:
        break;
    }

    transcript[idx] = turn;
    const stillOpen = turn.status === "streaming";
    return {
      transcript,
      openTurnId: stillOpen ? state.openTurnId : null,
      visibleSeq: "seq" in frame ? frame.seq : state.visibleSeq,
      instance: closedInstance ? sameNodeOrKeep(state.instance, closedInstance) : state.instance,
    };
  });

  if (frame.type === "turn_completed" || frame.type === "turn_interrupted") {
    // The current teacher finishes its reaction on the source node
    // (finish_source_reaction); this reload picks up whatever node is now
    // active and opens its turn if it hasn't been opened yet. The instance is
    // read fresh: the turn recorded engagement or an answer on the server,
    // which no stream frame is guaranteed to carry.
    const instance = get().instance;
    if (instance) void reloadAfterTurn(set, get, instance.id);
  } else if (frame.type === "turn_failed") {
    const instance = get().instance;
    if (instance) void lessonService.getInstance(instance.id).then((fresh) => set({ instance: fresh })).catch(() => {});
  }
}

async function reloadAfterTurn(set: Set, get: Get, instanceId: string): Promise<void> {
  try {
    const fresh = await lessonService.getInstance(instanceId);
    await refreshForNode(set, get, fresh);
  } catch {
    // The transcript on screen is still correct; the next action retries the read.
  }
}

/**
 * Take a newer lesson state only while it is still on the same part. When an
 * answer finishes a part, the tutor's reaction still belongs to that part
 * (finish_source_reaction), so the switch waits for the reload after the turn.
 */
function sameNodeOrKeep(current: InstanceState | null, next: InstanceState): InstanceState {
  if (!current?.active_node || current.active_node.instance_node_id === next.active_node?.instance_node_id) return next;
  return current;
}

function giveUp(set: Set, get: Get, error: unknown): void {
  if (error instanceof TurnRejected) {
    // Never admitted: drop the placeholder turn rather than leaving a dead bubble.
    set((state) => ({
      transcript: state.transcript.filter((t) => t.turnId !== state.openTurnId),
      openTurnId: null,
    }));
    if (error.error_code === "stale_node") {
      // The lesson moved on (another tab, or an answer that advanced it): reload it.
      const chapterId = get().instance?.chapter_id;
      if (chapterId) void get().loadChapter(chapterId);
      return;
    }
    set({ errorCode: error.error_code, errorMessage: error.message });
    return;
  }
  // The server may well have finished the reply; this client just couldn't reach it.
  markOpenTurnFailed(set, "connection_lost");
}

function markOpenTurnFailed(set: Set, reason: TranscriptTurn["failedReason"]): void {
  set((state) => ({
    transcript: state.transcript.map((t) =>
      t.turnId === state.openTurnId ? { ...t, status: "failed" as const, failedReason: reason, retryable: true } : t,
    ),
    openTurnId: null,
  }));
}

function attachStream(handle: TeacherTurnStreamHandle): void {
  stopActiveStream();
  activeStream = handle;
}

function stopActiveStream(): void {
  activeStream?.close();
  activeStream = null;
}
