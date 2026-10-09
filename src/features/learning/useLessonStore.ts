import { create } from "zustand";
import { asError } from "@/utils/errors";
import { lessonService } from "./lessonService";
import { readSseFrames } from "./sse";
import { applyEvent, fromRecorded, isTerminal, newTurn, type LessonTurn } from "./transcript";
import type {
  ChapterReport,
  AnswerResponse,
  AnswerResult,
  InstanceState,
  PresentationManifest,
  SequencedTurnEvent,
  TeacherPayload,
  TurnRequest,
  TurnStreamFrame,
} from "./types";

/** How many times a dropped stream is resumed from its cursor before the turn is shown as failed. */
const MAX_RESUMES = 3;
/** The backend's stale-revision error: the lesson moved on; reread it. */
const STALE_REVISION = "CORE_3103";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface LessonState {
  instanceId: string | null;
  status: LoadStatus;
  error: string | null;
  instance: InstanceState | null;
  payload: TeacherPayload | null;
  manifest: PresentationManifest | null;
  turns: LessonTurn[];
  /** Figure groups in the order the tutor presented them this session: the filmstrip. */
  presentedFigureIds: string[];
  /** The figure group on the whiteboard. */
  focusedFigureId: string | null;
  voiceMode: boolean;
  /** Steps finished while this screen was open, oldest first (the backend has no full plan list yet). */
  completedSteps: Array<{ instanceNodeId: string; title: string }>;
  /** The chapter report, read once the lesson completes. */
  report: ChapterReport | null;

  load: (instanceId: string) => Promise<void>;
  send: (text: string) => Promise<void>;
  stop: () => Promise<void>;
  retry: (turnId: string) => Promise<void>;
  answer: (
    itemId: string,
    response: AnswerResponse,
    options?: { channel?: "typed" | "choice"; confirmedReading?: boolean },
  ) => Promise<AnswerResult | null>;
  /** The learner's explicit done on a teach node (allowed once engaged enough and every probe is attempted). */
  done: () => Promise<void>;
  /** After a failed practice round. */
  choose: (choice: "try_now" | "keep_going") => Promise<void>;
  askHint: (itemId: string) => Promise<void>;
  refreshManifest: () => Promise<void>;
  focusFigure: (figureGroupId: string) => void;
  setVoiceMode: (on: boolean) => void;
  /**
   * Voice replies, which arrive over the voice socket rather than a turn stream. Their events are the same
   * teacher-turn events, so they go through the same reducer: the board, chat and rail update in voice too.
   */
  voiceTurnStarted: (turnId: string, learnerText: string | null) => void;
  voiceTurnEvent: (event: SequencedTurnEvent) => void;
  voiceTurnEnded: (turnId: string, reason: "completed" | "failed" | "interrupted" | "cancelled") => void;
  reset: () => void;
}

const initial = {
  instanceId: null,
  status: "idle" as LoadStatus,
  error: null,
  instance: null,
  payload: null,
  manifest: null,
  turns: [],
  presentedFigureIds: [],
  focusedFigureId: null,
  voiceMode: false,
  completedSteps: [],
  report: null,
};

/** The open stream's abort handle; not state, so it never re-renders anything. */
let streamAbort: AbortController | null = null;
/** When the last tutor reply finished, for a learner message's `latency_ms`. */
let lastReplyAt = 0;

const uuid = () => crypto.randomUUID();

function withFigures(presented: string[], ids: string[]): string[] {
  const next = [...presented];
  for (const id of ids) if (!next.includes(id)) next.push(id);
  return next;
}

/**
 * The lesson screen's state: one instance, its transcript and its pictures.
 * Separate from `useStudentStore` (the old MVP chat). The UI renders what the
 * backend says and never decides correctness or progression itself.
 */
export const useLessonStore = create<LessonState>((set, get) => {
  const updateTurn = (turnId: string, update: (turn: LessonTurn) => LessonTurn) =>
    set((state) => ({ turns: state.turns.map((t) => (t.turnId === turnId ? update(t) : t)) }));

  const currentTurn = (turnId: string) => get().turns.find((t) => t.turnId === turnId);

  /** Reread the node's session payload and pictures (on load and whenever the active node changes). */
  const loadNode = async (instanceId: string) => {
    const [payload, manifest] = await Promise.all([
      lessonService.teacherPayload(instanceId),
      lessonService.manifest(instanceId).catch(() => null),
    ]);
    if (get().instanceId === instanceId) set({ payload, manifest });
  };

  const loadReport = async (instanceId: string) => {
    const report = await lessonService.report(instanceId);
    if (get().instanceId === instanceId) set({ report });
  };

  const applyInstance = (instance: InstanceState) => {
    const previous = get().instance;
    const beforeNode = previous?.active_node;
    set({ instance });
    const after = instance.active_node?.instance_node_id;
    // The step we were on is finished once the lesson moves past it.
    if (beforeNode && beforeNode.instance_node_id !== after && instance.nodes_done > (previous?.nodes_done ?? 0)) {
      set((state) => ({
        completedSteps: state.completedSteps.some((c) => c.instanceNodeId === beforeNode.instance_node_id)
          ? state.completedSteps
          : [...state.completedSteps, { instanceNodeId: beforeNode.instance_node_id, title: beforeNode.title }],
      }));
    }
    if (after && after !== beforeNode?.instance_node_id) void loadNode(instance.id).catch(() => undefined);
    if (instance.state === "completed" && previous?.state !== "completed") void loadReport(instance.id).catch(() => undefined);
  };

  const onEvent = (turnId: string, event: SequencedTurnEvent) => {
    const before = currentTurn(turnId);
    if (!before) return;
    const after = applyEvent(before, event);
    if (after === before) return; // a replayed event
    updateTurn(turnId, () => after);
    if (event.type === "state_changed") applyInstance(event.instance);
    if (event.type === "figure_presented") {
      set((state) => ({
        presentedFigureIds: withFigures(state.presentedFigureIds, [event.figure_group_id]),
        focusedFigureId: event.figure_group_id,
      }));
    }
  };

  /** Read frames until the turn closes; false if the stream ended first (a drop). */
  const consume = async (turnId: string, response: Response, signal: AbortSignal): Promise<boolean> => {
    for await (const frame of readSseFrames(response, signal)) {
      let event: TurnStreamFrame;
      try {
        event = JSON.parse(frame.data);
      } catch {
        continue;
      }
      if (event.type === "keepalive") continue;
      onEvent(turnId, event);
      const turn = currentTurn(turnId);
      if (turn && isTerminal(turn.status)) return true;
    }
    return false;
  };

  /** Start a turn and follow it to its end, resuming from the cursor if the stream drops. */
  const runTurn = async (request: TurnRequest, learnerText: string | null) => {
    const instanceId = get().instanceId;
    if (!instanceId) return;
    streamAbort?.abort();
    const abort = new AbortController();
    streamAbort = abort;
    // One turn streams at a time: a still-open one is superseded (the server records it via `interrupts`).
    set((state) => ({
      turns: [
        ...state.turns.map((t) => (t.status === "streaming" ? { ...t, status: "interrupted" as const } : t)),
        newTurn(request.turn_id, request.kind, learnerText),
      ],
    }));

    try {
      let closed = await consume(request.turn_id, await lessonService.startTurn(instanceId, request, abort.signal), abort.signal);
      for (let attempt = 0; !closed && attempt < MAX_RESUMES && !abort.signal.aborted; attempt += 1) {
        const cursor = currentTurn(request.turn_id)?.lastSeq ?? 0;
        closed = await consume(
          request.turn_id,
          await lessonService.resumeTurn(instanceId, request.turn_id, cursor, abort.signal),
          abort.signal,
        );
      }
      if (!closed && !abort.signal.aborted) {
        updateTurn(request.turn_id, (t) => ({ ...t, status: "failed", failure: { reason: "stream_interrupted", retryable: false } }));
      }
    } catch (error) {
      if (abort.signal.aborted) return;
      updateTurn(request.turn_id, (t) => ({ ...t, status: "failed", failure: { reason: "stream_interrupted", retryable: false } }));
      console.error("Lesson turn failed:", asError(error).request_id, asError(error).message ?? error);
    } finally {
      if (streamAbort === abort) streamAbort = null;
      lastReplyAt = Date.now();
    }
  };

  const activeNodeId = () => get().instance?.active_node?.instance_node_id ?? null;

  /** The open turn, if one is still streaming, so a new turn can name it as interrupted. */
  const openTurnInterrupt = () => {
    const open = get().turns.findLast((t) => t.status === "streaming");
    return open ? { turn_id: open.turnId, visible_seq: open.lastSeq } : undefined;
  };

  /** Reread the instance after a stale-revision 409, then rethrow so the caller can show it. */
  const rereadIfStale = async (error: unknown) => {
    const instanceId = get().instanceId;
    if (instanceId && asError(error).error_code === STALE_REVISION) {
      applyInstance(await lessonService.instance(instanceId));
    }
  };

  return {
    ...initial,

    load: async (instanceId) => {
      streamAbort?.abort();
      set({ ...initial, instanceId, status: "loading" });
      try {
        const [instance, history] = await Promise.all([
          lessonService.instance(instanceId),
          // History is per active node; a finished lesson has none, so its history read fails. Not fatal.
          lessonService.turnHistory(instanceId).catch(() => []),
        ]);
        if (get().instanceId !== instanceId) return;
        const turns = history.map(fromRecorded);
        const presented = withFigures([], turns.flatMap((t) => t.figureGroupIds));
        set({ instance, turns, presentedFigureIds: presented, focusedFigureId: presented.at(-1) ?? null });
        if (instance.state === "completed") {
          // A finished lesson has no active node to load; show its report.
          await loadReport(instanceId).catch(() => undefined);
          set({ status: "ready" });
          return;
        }
        await loadNode(instanceId);
        set({ status: "ready" });

        // A fresh node opens with the tutor speaking first.
        const node = instance.active_node?.instance_node_id;
        if (instance.state === "active" && node && turns.length === 0) {
          void runTurn({ turn_id: uuid(), kind: "opening", instance_node_id: node }, null);
        }
      } catch (error) {
        if (get().instanceId !== instanceId) return;
        set({ status: "error", error: asError(error).message ?? "This lesson couldn't be opened." });
      }
    },

    send: async (text) => {
      const node = activeNodeId();
      const trimmed = text.trim();
      if (!node || !trimmed) return;
      await runTurn(
        {
          turn_id: uuid(),
          kind: "learner_message",
          instance_node_id: node,
          text: trimmed.slice(0, 1000),
          latency_ms: lastReplyAt ? Math.min(Date.now() - lastReplyAt, 3_600_000) : 0,
          interrupts: openTurnInterrupt(),
        },
        trimmed,
      );
    },

    stop: async () => {
      const { instanceId } = get();
      const open = get().turns.findLast((t) => t.status === "streaming");
      if (!instanceId || !open) return;
      streamAbort?.abort();
      updateTurn(open.turnId, (t) => ({ ...t, status: "interrupted" }));
      try {
        const out = await lessonService.interruptTurn(instanceId, open.turnId, open.lastSeq);
        const through = out.transcript_through_seq;
        if (typeof through === "number") {
          updateTurn(open.turnId, (t) => ({ ...t, deltas: t.deltas.filter((d) => d.seq <= through) }));
        }
      } catch (error) {
        console.error("Stopping the turn failed:", asError(error).request_id, asError(error).message ?? error);
      }
    },

    retry: async (turnId) => {
      const failed = currentTurn(turnId);
      const node = activeNodeId();
      if (!failed?.failure?.retryable || !node) return;
      await runTurn({ turn_id: uuid(), kind: "regenerate", instance_node_id: node, regenerates: turnId }, failed.learnerText);
    },

    answer: async (itemId, response, options = {}) => {
      const channel = options.channel ?? (response.kind === "choice" ? "choice" : "typed");
      const { instanceId, instance } = get();
      if (!instanceId || instance?.revision === undefined) return null;
      const startedAt = lastReplyAt || Date.now();
      try {
        const result = await lessonService.answer(instanceId, {
          request_id: uuid(),
          item_id: itemId,
          expected_revision: instance.revision,
          channel,
          latency_ms: Math.min(Math.max(Date.now() - startedAt, 0), 3_600_000),
          response,
          confirmed_reading: options.confirmedReading || undefined,
        });
        applyInstance(result.instance);
        // The tutor reacts to a committed result in its own turn.
        const node = activeNodeId();
        if (result.attempt_id && result.outcome !== "needs_confirmation" && node) {
          void runTurn(
            { turn_id: uuid(), kind: "result_reaction", instance_node_id: node, attempt_id: result.attempt_id },
            null,
          );
        }
        return result;
      } catch (error) {
        await rereadIfStale(error);
        throw error;
      }
    },

    done: async () => {
      const { instanceId, instance } = get();
      if (!instanceId || instance?.revision === undefined) return;
      try {
        applyInstance(await lessonService.done(instanceId, { request_id: uuid(), expected_revision: instance.revision }));
      } catch (error) {
        await rereadIfStale(error);
        throw error;
      }
    },

    choose: async (choice) => {
      const { instanceId, instance } = get();
      if (!instanceId || instance?.revision === undefined) return;
      try {
        applyInstance(await lessonService.choose(instanceId, { request_id: uuid(), expected_revision: instance.revision, choice }));
      } catch (error) {
        await rereadIfStale(error);
        throw error;
      }
    },

    askHint: async (itemId) => {
      const { instanceId } = get();
      const node = activeNodeId();
      if (!instanceId || !node) return;
      applyInstance(await lessonService.hint(instanceId, { request_id: uuid(), item_id: itemId }));
      await runTurn({ turn_id: uuid(), kind: "hint", instance_node_id: node, item_id: itemId }, null);
    },

    refreshManifest: async () => {
      const { instanceId } = get();
      if (!instanceId) return;
      const manifest = await lessonService.manifest(instanceId);
      if (get().instanceId === instanceId) set({ manifest });
    },

    focusFigure: (figureGroupId) => set({ focusedFigureId: figureGroupId }),

    setVoiceMode: (on) => set({ voiceMode: on }),

    voiceTurnStarted: (turnId, learnerText) => {
      if (currentTurn(turnId)) return;
      // A spoken reply supersedes any typed one still streaming.
      streamAbort?.abort();
      set((state) => ({
        turns: [
          ...state.turns.map((t) => (t.status === "streaming" ? { ...t, status: "interrupted" as const } : t)),
          newTurn(turnId, "learner_message", learnerText),
        ],
      }));
    },

    voiceTurnEvent: (event) => onEvent(event.turn_id, event),

    voiceTurnEnded: (turnId, reason) => {
      // The terminal event normally closed it already; this settles one that ended without it (a cancel).
      updateTurn(turnId, (t) =>
        t.status !== "streaming" ? t : { ...t, status: reason === "completed" ? "completed" : reason === "failed" ? "failed" : "interrupted" },
      );
      lastReplyAt = Date.now();
    },

    reset: () => {
      streamAbort?.abort();
      streamAbort = null;
      lastReplyAt = 0;
      set({ ...initial });
    },
  };
});

/** The manifest's pictures for one figure group, in a stable order. */
export function picturesFor(manifest: PresentationManifest | null, figureGroupId: string) {
  if (!manifest) return [];
  return Object.entries(manifest.figures)
    .filter(([, figure]) => figure.figure_group_id === figureGroupId)
    .map(([pictureId, figure]) => ({ pictureId, ...figure, src: lessonService.pictureSrc(figure.url) }));
}
