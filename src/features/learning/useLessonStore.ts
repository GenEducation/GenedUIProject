import { create } from "zustand";
import { asError } from "@/utils/errors";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { DeliveryLedger, type DeliveryBinding } from "./delivery/checkDelivery";
import { lessonService } from "./lessonService";
import { readSseFrames } from "./sse";
import { resolveSessionLanguage, type SessionLanguage } from "./voice/languages";
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
/** The backend's step conflict; its `details.reason` says which (`check_not_delivered`: the check's delivery was never confirmed). */
const STEP_CONFLICT = "CORE_3106";

/** What the voice session captured when a tutor reply began: which check was pending, and in which session. */
export interface SpokenCheckMark {
  itemId: string;
  sessionId: string;
}

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
  /** The language the learner picked in this session, or null (then the last stored choice, then the profile's). Every typed turn carries it. */
  sessionLanguage: SessionLanguage | null;
  /** This lesson screen's own session id: the learner session while no voice session is live. */
  pageSessionId: string;
  /** The live voice session's id (the voice socket's `ready.session_id`); a reconnect is a new one. Null while there is none. */
  voiceSessionId: string | null;
  /** A check whose last answer was refused as not delivered: a neutral "getting ready" note, never "incorrect". */
  notDeliveredItemId: string | null;
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
  /** The session id answers and delivery confirmations carry: the voice session's while one is live, else this screen's. */
  sessionId: () => string;
  /** The voice socket opened (or reconnected) with this session id, or closed (null). Still-visible checks are confirmed again. */
  setVoiceSession: (sessionId: string | null) => void;
  setSessionLanguage: (language: SessionLanguage) => void;
  /** A check card is on screen and visible (or no longer is). The first time, in a session and round, the delivery is confirmed. */
  setCheckVisible: (itemId: string, visible: boolean) => void;
  /** At the start of a tutor reply: the one visible, unanswered check it may be reading aloud. */
  spokenCheckAtStart: () => SpokenCheckMark | null;
  /** A tutor reply's audio ended. Only a completed playback confirms; an interrupted one, or one from an older session, sends nothing. */
  checkPlaybackEnded: (mark: SpokenCheckMark | null, completed: boolean) => Promise<void>;
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
  pageSessionId: "",
  sessionLanguage: null,
  voiceSessionId: null,
  notDeliveredItemId: null,
  completedSteps: [],
  report: null,
};

/** The open stream's abort handle; not state, so it never re-renders anything. */
let streamAbort: AbortController | null = null;
/** Bumped by every load and reset: a load that is no longer the latest stops (React dev mounts twice). */
let loadGeneration = 0;
/** When the last tutor reply finished, for a learner message's `latency_ms`. */
let lastReplyAt = 0;

const uuid = () => crypto.randomUUID();

/** Check cards on screen right now, and the highest round ordinal seen per node (for the round a check is bound to). */
const visibleChecks = new Set<string>();
const roundsSeen = new Map<string, number>();

/**
 * The backend's manifest covers only the current node's pictures. The board keeps every figure shown this session,
 * so earlier nodes' signed URLs are kept (until they expire) and newer ones win.
 */
function mergeManifest(previous: PresentationManifest | null, next: PresentationManifest | null): PresentationManifest | null {
  if (!next) return previous;
  if (!previous) return next;
  return { expires_at: next.expires_at, figures: { ...previous.figures, ...next.figures } };
}

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

  const sessionId = () => get().voiceSessionId ?? get().pageSessionId;

  /** The unanswered check items of the active node that the payload also carries; anything else is never confirmed. */
  const pendingChecks = (): string[] => {
    const { instance, payload } = get();
    const node = instance?.active_node;
    if (!node || instance?.state !== "active" || payload?.node.id !== node.node_id) return [];
    const carried = new Set(payload.node.check_items.map((c) => c.id));
    return node.check_item_ids.filter((id) => carried.has(id) && !node.answered_item_ids.includes(id));
  };

  /** The binding a confirmation for this check would have now, or null when it is not a pending check of the active node. */
  const bindingFor = (itemId: string, session = sessionId()): DeliveryBinding | null => {
    const { instanceId, instance } = get();
    const node = instance?.active_node;
    if (!instanceId || !node || !pendingChecks().includes(itemId)) return null;
    const round = node.round_ordinal ?? (roundsSeen.get(node.instance_node_id) ?? 0) + 1;
    return { instanceId, instanceNodeId: node.instance_node_id, itemId, round: String(round), sessionId: session };
  };

  const sameBinding = (a: DeliveryBinding, b: DeliveryBinding | null) =>
    b !== null && a.instanceId === b.instanceId && a.instanceNodeId === b.instanceNodeId && a.itemId === b.itemId && a.round === b.round && a.sessionId === b.sessionId;

  const ledger = new DeliveryLedger({
    send: (instanceId, itemId, body) => lessonService.checkDelivered(instanceId, itemId, body),
    newId: uuid,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    stillCurrent: (binding, channel) =>
      get().instanceId === binding.instanceId &&
      sameBinding(binding, bindingFor(binding.itemId, binding.sessionId)) &&
      // A screen delivery is only for a check that is still on screen; a voice one was decided when its audio ended.
      (channel === "voice" || visibleChecks.has(binding.itemId)) &&
      // A reconnect is a new session: the old session's delivery is not sent once it has been replaced.
      binding.sessionId === sessionId(),
  });

  /** Confirm every check card that is on screen, in the current session and round (idempotent: confirmed ones are not sent again). */
  const syncDeliveries = () => {
    for (const itemId of visibleChecks) {
      const binding = bindingFor(itemId);
      if (binding) void ledger.confirm(binding, "screen");
    }
  };

  /** Reread the node's session payload and pictures (on load and whenever the active node changes). */
  const loadNode = async (instanceId: string) => {
    const [payload, manifest] = await Promise.all([
      lessonService.teacherPayload(instanceId),
      lessonService.manifest(instanceId).catch(() => null),
    ]);
    if (get().instanceId === instanceId) {
      set((state) => ({ payload, manifest: mergeManifest(state.manifest, manifest) }));
      syncDeliveries();
    }
  };

  const loadReport = async (instanceId: string) => {
    const report = await lessonService.report(instanceId);
    if (get().instanceId === instanceId) set({ report });
  };

  /** The node whose opening has not been asked for yet: set when the lesson moves on, cleared when it is asked for or no longer wanted. */
  let openingDue: string | null = null;
  const openIfDue = () => {
    const node = openingDue;
    if (!node) return;
    const { instance, voiceSessionId, turns } = get();
    if (voiceSessionId || instance?.state !== "active" || instance.active_node?.instance_node_id !== node) {
      openingDue = null; // a voice session opens it on reconnecting, or the lesson has moved on again
      return;
    }
    if (turns.some((t) => t.status === "streaming")) return; // asked again when that turn ends
    openingDue = null;
    void runTurn({ turn_id: uuid(), kind: "opening", instance_node_id: node }, null);
  };

  const applyInstance = (instance: InstanceState) => {
    const previous = get().instance;
    const beforeNode = previous?.active_node;
    const ordinal = instance.active_node?.round_ordinal;
    if (instance.active_node && typeof ordinal === "number") {
      const id = instance.active_node.instance_node_id;
      roundsSeen.set(id, Math.max(roundsSeen.get(id) ?? 0, ordinal));
    }
    set({ instance });
    syncDeliveries();
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
    // The lesson moved on to a new node: it opens with the tutor speaking first (backend ADR 0006 D7, D17: the client asks).
    // In a voice session the socket reconnects for the new node and the server opens it, so only a text session asks here.
    // Asked after the turn in flight (a reaction to the answer that finished the old node) has ended, never over it.
    if (instance.state === "active" && beforeNode && after && after !== beforeNode.instance_node_id) {
      openingDue = after;
      queueMicrotask(openIfDue);
    }
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
  const runTurn = async (unsessioned: TurnRequest, learnerText: string | null) => {
    const instanceId = get().instanceId;
    if (!instanceId) return;
    // A typed turn is written in the session language the learner chose (backend ADR 0037); none known, none sent.
    const language =
      unsessioned.language ??
      (unsessioned.modality === "voice"
        ? undefined
        : (resolveSessionLanguage(get().sessionLanguage, useStudentStore.getState().studentProfile?.preferred_language) ?? undefined));
    const request: TurnRequest = { ...unsessioned, session_id: sessionId(), ...(language ? { language } : {}) };
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
      // An HTTP refusal (the turn never started) carries the backend's reason; anything else is a dropped stream.
      const { status, message, request_id } = asError(error);
      const refused = typeof status === "number" && Boolean(message);
      updateTurn(request.turn_id, (t) => ({
        ...t,
        status: "failed",
        failure: { reason: refused ? "prepare_failed" : "stream_interrupted", retryable: false, ...(refused ? { message } : {}) },
      }));
      console.warn("Lesson turn failed:", request_id, message ?? error);
    } finally {
      if (streamAbort === abort) streamAbort = null;
      lastReplyAt = Date.now();
      openIfDue();
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
      const generation = ++loadGeneration;
      streamAbort?.abort();
      visibleChecks.clear();
      roundsSeen.clear();
      ledger.clear();
      set({ ...initial, instanceId, pageSessionId: uuid(), status: "loading" });
      try {
        const [instance, history] = await Promise.all([
          lessonService.instance(instanceId),
          // History is per active node; a finished lesson has none, so its history read fails. Not fatal.
          lessonService.turnHistory(instanceId).catch(() => []),
        ]);
        if (generation !== loadGeneration) return;
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
        if (generation !== loadGeneration) return;
        set({ status: "ready" });

        // A fresh node opens with the tutor speaking first.
        const node = instance.active_node?.instance_node_id;
        if (instance.state === "active" && node && turns.length === 0) {
          void runTurn({ turn_id: uuid(), kind: "opening", instance_node_id: node }, null);
        }
      } catch (error) {
        if (generation !== loadGeneration) return;
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
      // A confirmation still on its way is waited for (briefly), not raced: the answer is bound to the same session.
      const binding = bindingFor(itemId);
      const waiting = binding ? ledger.inflight(binding, "screen") : null;
      if (waiting) await Promise.race([waiting, new Promise((resolve) => setTimeout(resolve, 2500))]);
      const requestId = uuid();
      try {
        let result: AnswerResult | null = null;
        // A refusal as not delivered leaves nothing recorded: confirm again, same ids, and send once more.
        for (let attempt = 0; attempt < 2 && !result; attempt += 1) {
          try {
            result = await lessonService.answer(instanceId, {
              request_id: requestId,
              item_id: itemId,
              expected_revision: get().instance?.revision ?? instance.revision,
              channel,
              latency_ms: Math.min(Math.max(Date.now() - startedAt, 0), 3_600_000),
              response,
              confirmed_reading: options.confirmedReading || undefined,
              session_id: sessionId(),
            });
          } catch (error) {
            if (!isNotDelivered(error)) throw error;
            const again = bindingFor(itemId);
            if (again) {
              ledger.forget(again, "screen");
              if (attempt === 0 && visibleChecks.has(itemId)) await ledger.confirm(again, "screen");
            }
            if (attempt === 1 || !again || !visibleChecks.has(itemId)) {
              set({ notDeliveredItemId: itemId });
              return null;
            }
          }
        }
        if (!result) return null;
        set({ notDeliveredItemId: null });
        // The reaction belongs to the node the answer was given on (backend admission: attempt-bound), which the answer itself
        // may have finished; the next node's opening follows once the reaction ends.
        const node = activeNodeId();
        applyInstance(result.instance);
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
      if (get().instanceId === instanceId) set((state) => ({ manifest: mergeManifest(state.manifest, manifest) }));
    },

    focusFigure: (figureGroupId) => set({ focusedFigureId: figureGroupId }),

    setVoiceMode: (on) => set({ voiceMode: on }),

    sessionId,

    setSessionLanguage: (language) => set({ sessionLanguage: language }),

    setVoiceSession: (id) => {
      if (get().voiceSessionId === id) return;
      set({ voiceSessionId: id });
      syncDeliveries(); // a reconnect is a new session: what is still on screen is confirmed again
    },

    setCheckVisible: (itemId, visible) => {
      if (!visible) {
        visibleChecks.delete(itemId);
        return;
      }
      visibleChecks.add(itemId);
      syncDeliveries();
    },

    spokenCheckAtStart: () => {
      const pending = pendingChecks();
      return pending.length === 1 && visibleChecks.has(pending[0]) ? { itemId: pending[0], sessionId: sessionId() } : null;
    },

    checkPlaybackEnded: async (mark, completed) => {
      if (!mark || !completed) return; // interrupted playback confirms nothing
      if (mark.sessionId !== sessionId()) return; // it played in a session that has since been replaced
      const binding = bindingFor(mark.itemId, mark.sessionId);
      if (binding) await ledger.confirm(binding, "voice");
    },

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
      visibleChecks.clear();
      roundsSeen.clear();
      ledger.clear();
      loadGeneration += 1;
      streamAbort?.abort();
      streamAbort = null;
      lastReplyAt = 0;
      openingDue = null;
      set({ ...initial });
    },
  };
});

/** The backend refused the answer because the check's delivery was never confirmed in this session. */
function isNotDelivered(error: unknown): boolean {
  const e = asError(error);
  return e.error_code === STEP_CONFLICT && e.details?.reason === "check_not_delivered";
}

/** The manifest's pictures for one figure group, in a stable order. */
export function picturesFor(manifest: PresentationManifest | null, figureGroupId: string) {
  if (!manifest) return [];
  return Object.entries(manifest.figures)
    .filter(([, figure]) => figure.figure_group_id === figureGroupId)
    .map(([pictureId, figure]) => ({ pictureId, ...figure, src: lessonService.pictureSrc(figure.url) }));
}
