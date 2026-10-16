import { create } from "zustand";
import { asError } from "@/utils/errors";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { DeliveryLedger, type DeliveryBinding } from "./delivery/checkDelivery";
import { forgetPictures, preloadPicture } from "./figures";
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
  RevisitOptions,
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
/** A failed manifest read is tried this many more times within the step, the wait growing by this much each time. */
const MANIFEST_RETRIES = 2;
const MANIFEST_RETRY_MS = 300;
/**
 * The longest a presented figure holds its turn's words. Readiness is the picture's own load (or its failure, refreshed
 * once); this only bounds a request that never answers, after which the words show with a retry for the picture.
 */
const FIGURE_WAIT_MS = 8000;
/** The longest a new step's opening waits for the step's payload and pictures, for a read that never answers. */
const STEP_LOAD_WAIT_MS = 10_000;

/**
 * A figure the tutor presented live on this screen: `pending` until its picture is in the manifest and decoded (the
 * turn's words wait), `ready` once the board can draw it, `failed` when it could not load (the words show with a
 * retry), `retrying` while that retry runs. Figures from history have no entry and never hold anything.
 */
export type FigureReadiness = "pending" | "ready" | "failed" | "retrying";

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
  /** Coming back to the chapter: section scores, the weak ones, and where the learner would carry on. */
  revisitOptions: RevisitOptions | null;
  /** The "welcome back" choice is showing (an active chapter with weak sections; a finished one shows it in its summary). */
  revisitPromptOpen: boolean;
  /** A review or start over is in flight. */
  reviewBusy: boolean;
  /** The titles of the steps seen on this screen, by instance node id: the transcript's step boundaries name them. */
  stepTitles: Record<string, string>;
  /** Figures presented live on this screen, and whether the board can show them (see `FigureReadiness`). */
  figureStatus: Record<string, FigureReadiness>;
  /**
   * The lesson is moving to its next step: a step command (Next step, a choice) is in flight, or the lesson has moved and
   * the new step's opening has not started yet. A message sent now waits for it, so it is never sent on the step being left.
   */
  stepPending: boolean;
  /** The step (instance node) whose payload could not be read when the lesson moved to it: said in the chat, with a retry. */
  stepLoadError: string | null;

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
  /** Close the "welcome back" choice and carry on where the learner was. */
  closeRevisitPrompt: () => void;
  /** Replay these sections (canonical instance node ids), then carry on where the learner was. */
  reviewSections: (sectionIds: string[]) => Promise<void>;
  /** Start the chapter over; resolves to the new instance's id (the caller navigates to it). */
  startOver: () => Promise<string | null>;
  askHint: (itemId: string) => Promise<void>;
  refreshManifest: () => Promise<void>;
  /** Read the current step's payload and pictures again after `stepLoadError`; the step then opens if it never did. */
  reloadStep: () => Promise<void>;
  /** A presented figure that failed to load: fresh URLs, and one more try. */
  retryFigure: (figureGroupId: string) => Promise<void>;
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
  revisitOptions: null,
  revisitPromptOpen: false,
  reviewBusy: false,
  stepTitles: {},
  figureStatus: {},
  stepPending: false,
  stepLoadError: null,
};

/** The open stream's abort handle, and the turn it streams; not state, so they never re-render anything. */
let streamAbort: AbortController | null = null;
let streamTurnId: string | null = null;
/** Bumped by every load and reset: a load that is no longer the latest stops (React dev mounts twice). */
let loadGeneration = 0;
/** When the last tutor reply finished, for a learner message's `latency_ms`. */
let lastReplyAt = 0;

const uuid = () => crypto.randomUUID();

/** Check cards on screen right now, and the highest round ordinal seen per node (for the round a check is bound to). */
const visibleChecks = new Set<string>();
/** Replies of the live voice session (they arrive over its socket, not a turn stream). */
const voiceTurns = new Set<string>();
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
 * The learner is on a revisit step (`active_node.reason` "revisit_…") of a lesson still in progress. The step counts stay the
 * backend's own (they can read "17 of 17" then); this only lets the screen say that revisit work is under way.
 */
export const isRevisiting = (instance: InstanceState | null): boolean =>
  instance?.state === "active" && Boolean(instance.active_node?.reason?.startsWith("revisit_"));

/** The learner is replaying a section they chose to review (`active_node.reason` "revisit_review"). */
export const isReviewingSection = (instance: InstanceState | null): boolean =>
  instance?.state === "active" && instance.active_node?.reason === "revisit_review";

/** A turn's words wait while a figure it presented is still on its way to the board (FIGURES_IN_TEACHING_v1 §9.2). */
export const heldForFigure = (turn: LessonTurn, status: Record<string, FigureReadiness>): boolean =>
  turn.figureGroupIds.some((id) => status[id] === "pending");

/** The last seq of a turn the learner has actually seen: none of its words while a figure holds them. */
function visibleSeq(turn: LessonTurn, status: Record<string, FigureReadiness>): number {
  if (!heldForFigure(turn, status)) return turn.lastSeq;
  return (turn.deltas[0]?.seq ?? turn.lastSeq + 1) - 1;
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

  /** Fetch and decode a fresh manifest's pictures now, so each is ready before the tutor presents it (§9.2). */
  const preloadManifest = (manifest: PresentationManifest | null) => {
    for (const figure of Object.values(manifest?.figures ?? {})) {
      void preloadPicture(lessonService.pictureSrc(figure.url)).catch(() => undefined);
    }
  };

  /** The manifest, tried again a few times within the step: without it none of the step's pictures can be shown. */
  const fetchManifest = async (instanceId: string): Promise<PresentationManifest | null> => {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await lessonService.manifest(instanceId);
      } catch {
        if (attempt >= MANIFEST_RETRIES || get().instanceId !== instanceId) return null;
        await new Promise((resolve) => setTimeout(resolve, MANIFEST_RETRY_MS * (attempt + 1)));
      }
    }
  };

  /** Reread the node's session payload and pictures (on load and whenever the active node changes). */
  const loadNode = async (instanceId: string) => {
    const node = get().instance?.active_node?.instance_node_id;
    const [payload, manifest] = await Promise.all([lessonService.teacherPayload(instanceId), fetchManifest(instanceId)]);
    // Once the lesson has moved again, the newer step's read owns the screen.
    if (get().instanceId !== instanceId || get().instance?.active_node?.instance_node_id !== node) return;
    set((state) => ({ payload, manifest: mergeManifest(state.manifest, manifest) }));
    preloadManifest(manifest);
    syncDeliveries();
  };

  /** One manifest refresh at a time: every figure that needs fresh URLs waits on the same read. */
  let refreshing: Promise<void> | null = null;
  const refreshOnce = (): Promise<void> => {
    refreshing ??= get()
      .refreshManifest()
      .catch(() => undefined)
      .finally(() => {
        refreshing = null;
      });
    return refreshing;
  };

  const setFigure = (id: string, status: FigureReadiness) =>
    set((state) => (state.figureStatus[id] === status ? state : { figureStatus: { ...state.figureStatus, [id]: status } }));

  /** Each presented figure's readiness check in flight. */
  const figureChecks = new Map<string, Promise<void>>();

  /**
   * Make a presented figure showable: its picture in the manifest (refreshed when the id is missing) and decoded (an
   * expired URL is refreshed once and tried again). It ends `ready` or `failed`, never left pending past FIGURE_WAIT_MS;
   * a picture that arrives after that still turns `ready`.
   */
  const ensureFigure = (id: string, retrying = false): Promise<void> => {
    if (get().figureStatus[id] === "ready") return Promise.resolve();
    const running = figureChecks.get(id);
    if (running) return running;
    const instanceId = get().instanceId;
    const current = () => get().instanceId === instanceId;
    setFigure(id, retrying ? "retrying" : "pending");
    const decode = async (): Promise<boolean> => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (attempt > 0 || !picturesFor(get().manifest, id)[0]) await refreshOnce();
        const picture = picturesFor(get().manifest, id)[0];
        if (!current()) return false;
        if (!picture) continue;
        try {
          await preloadPicture(picture.src);
          return true;
        } catch {
          // an expired or refused URL: fresh ones, then once more
        }
      }
      return false;
    };
    const check = (async () => {
      const ceiling = setTimeout(() => {
        if (current() && get().figureStatus[id] === "pending") setFigure(id, "failed");
      }, FIGURE_WAIT_MS);
      try {
        const ok = await decode();
        if (current()) setFigure(id, ok ? "ready" : "failed");
      } finally {
        clearTimeout(ceiling);
        figureChecks.delete(id);
      }
    })();
    figureChecks.set(id, check);
    return check;
  };

  const loadReport = async (instanceId: string) => {
    const report = await lessonService.report(instanceId);
    if (get().instanceId === instanceId) set({ report });
  };

  /**
   * Read the revisit options; with `prompt`, open the "welcome back" choice when an active chapter has weak sections and
   * no review is under way. A failed read only means no choice is offered: the lesson carries on as it was.
   */
  const loadRevisitOptions = async (instanceId: string, prompt: boolean) => {
    let options: RevisitOptions | null = null;
    try {
      options = await lessonService.revisitOptions(instanceId);
    } catch {
      options = null;
    }
    if (get().instanceId !== instanceId) return;
    const offer = prompt && options?.state === "active" && options.weak.length > 0 && !options.review_in_progress;
    set((state) => ({ revisitOptions: options, revisitPromptOpen: offer || (state.revisitPromptOpen && Boolean(options)) }));
  };

  /** The step gap (`stepPending`): a message sent inside it waits for it to close. */
  let gap: { closed: Promise<void>; close: () => void } | null = null;
  const openGap = () => {
    if (gap) return;
    let close = () => {};
    const closed = new Promise<void>((resolve) => (close = resolve));
    gap = { closed, close };
    set({ stepPending: true });
  };
  const closeGap = () => {
    if (!gap) return;
    gap.close();
    gap = null;
    set({ stepPending: false });
  };

  /**
   * The lesson left a step. Every turn still streaming that is not on the new step is closed here, except `cause`, the
   * turn whose own stream moved the lesson on (its words are the reaction to what finished the step): its stream is
   * cancelled, it shows as stopped and takes no more events, and the server is told what the learner saw of it (the same
   * report as Stop). So nothing of the step left streams into the next, and the next step's opening (backend ADR 0006
   * D32) is told only what the learner saw. A voice reply needs no report: its socket is replaced for the new step, and
   * that cancels it. Resolves once the reports are in (never rejects).
   */
  const leaveStep = (newNode: string | null, cause: string | null): Promise<void> => {
    const instanceId = get().instanceId;
    const { turns, figureStatus } = get();
    const left = turns.filter((t) => t.status === "streaming" && t.turnId !== cause && (!newNode || t.nodeId !== newNode));
    const reports = left.map((turn) => {
      updateTurn(turn.turnId, (t) => ({ ...t, status: "interrupted" }));
      if (turn.turnId !== streamTurnId || !instanceId) return Promise.resolve();
      streamAbort?.abort();
      streamAbort = null;
      streamTurnId = null;
      return lessonService
        .interruptTurn(instanceId, turn.turnId, visibleSeq(turn, figureStatus))
        .then((out) => {
          const through = out.transcript_through_seq;
          if (typeof through === "number") updateTurn(turn.turnId, (t) => ({ ...t, deltas: t.deltas.filter((d) => d.seq <= through) }));
        })
        .catch(() => undefined);
    });
    return Promise.all(reports).then(() => undefined);
  };

  /**
   * The step whose opening has not been asked for yet: set when the lesson moves on, `ready` once the step's payload and
   * pictures are read and the step left has been closed; cleared when the opening is asked for or no longer wanted.
   */
  let openingDue: { node: string; ready: boolean } | null = null;
  const openIfDue = () => {
    const due = openingDue;
    if (!due?.ready) return;
    const { instance, voiceSessionId, turns } = get();
    if (voiceSessionId || instance?.state !== "active" || instance.active_node?.instance_node_id !== due.node) {
      openingDue = null; // a voice session opens it on reconnecting, or the lesson has moved on again
      closeGap();
      return;
    }
    // The reaction to what finished the step plays out first; asked again when it ends.
    if (turns.some((t) => t.status === "streaming")) return;
    openingDue = null;
    // The opening's turn is on screen (streaming) before the gap closes, so a waiting message follows it.
    void runTurn({ turn_id: uuid(), kind: "opening", instance_node_id: due.node }, null);
    closeGap();
  };

  const applyInstance = (instance: InstanceState, cause: string | null = null) => {
    const previous = get().instance;
    const beforeNode = previous?.active_node;
    const ordinal = instance.active_node?.round_ordinal;
    if (instance.active_node && typeof ordinal === "number") {
      const id = instance.active_node.instance_node_id;
      roundsSeen.set(id, Math.max(roundsSeen.get(id) ?? 0, ordinal));
    }
    const active = instance.active_node;
    set((state) => ({
      instance,
      stepTitles: active ? { ...state.stepTitles, [active.instance_node_id]: active.title } : state.stepTitles,
      // A step that could not load is no longer the question once the lesson is on another one.
      stepLoadError: state.stepLoadError === (active?.instance_node_id ?? null) ? state.stepLoadError : null,
    }));
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
    const left = beforeNode && after !== beforeNode.instance_node_id ? leaveStep(after ?? null, cause) : Promise.resolve();
    // The new step's payload is what its board and check card are drawn from: a failed read is never swallowed. It is
    // said in the chat with a retry (`stepLoadError`), and the step is not opened over a board that cannot show it.
    const loading: Promise<boolean> =
      after && after !== beforeNode?.instance_node_id
        ? loadNode(instance.id).then(
            () => true,
            (error) => {
              console.warn("The lesson step couldn't load:", asError(error).request_id, asError(error).message ?? error);
              if (get().instance?.active_node?.instance_node_id === after) set({ stepLoadError: after });
              return false;
            },
          )
        : Promise.resolve(true);
    // The lesson moved on to a new node: it opens with the tutor speaking first (backend ADR 0006 D7, D17: the client asks).
    // In a voice session the socket reconnects for the new node and the server opens it, so only a text session asks here.
    // Asked once the new step's payload and pictures are read (so a figure it presents can be shown) and the step left is
    // closed; after the reaction to the answer that finished the old node has ended, never over it.
    if (instance.state === "active" && beforeNode && after && after !== beforeNode.instance_node_id) {
      openGap();
      const due = { node: after, ready: false };
      openingDue = due;
      // A read that never answers is said like a failed one (the learner can retry, and type meanwhile); should it answer
      // after all, the step still opens then.
      const ceiling = setTimeout(() => {
        if (openingDue !== due) return;
        set({ stepLoadError: after });
        closeGap();
      }, STEP_LOAD_WAIT_MS);
      void Promise.all([loading, left]).then(([loaded]) => {
        clearTimeout(ceiling);
        if (openingDue !== due) return; // the lesson has moved again; that move owns the gap
        if (!loaded) {
          openingDue = null;
          closeGap();
          return;
        }
        if (get().stepLoadError === after) set({ stepLoadError: null });
        due.ready = true;
        openIfDue();
      });
    }
    if (instance.state === "completed" && previous?.state !== "completed") void loadReport(instance.id).catch(() => undefined);
    // The sections the learner chose to review are done: offer what is still weak (a finished chapter's summary does).
    if (beforeNode?.reason === "revisit_review" && instance.active_node?.reason !== "revisit_review") {
      void loadRevisitOptions(instance.id, instance.state === "active");
    }
  };

  const onEvent = (turnId: string, event: SequencedTurnEvent) => {
    const before = currentTurn(turnId);
    // A turn already closed on this screen takes nothing more: the learner stopped it, or the lesson left its step.
    if (!before || before.status !== "streaming") return;
    const after = applyEvent(before, event);
    if (after === before) return; // a replayed event
    updateTurn(turnId, () => after);
    if (event.type === "state_changed") applyInstance(event.instance, turnId);
    if (event.type === "figure_presented") {
      // Pending first, so the board never draws it (or the chat shows its words) before its picture is ready.
      void ensureFigure(event.figure_group_id);
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
    streamTurnId = request.turn_id;
    // One turn streams at a time: a still-open one is superseded (the server records it via `interrupts`).
    set((state) => ({
      turns: [
        ...state.turns.map((t) => (t.status === "streaming" ? { ...t, status: "interrupted" as const } : t)),
        newTurn(request.turn_id, request.kind, learnerText, request.instance_node_id),
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
      if (streamAbort === abort) {
        streamAbort = null;
        streamTurnId = null;
      }
      lastReplyAt = Date.now();
      openIfDue();
    }
  };

  const activeNodeId = () => get().instance?.active_node?.instance_node_id ?? null;

  /** The open turn, if one is still streaming, so a new turn can name it as interrupted. */
  const openTurnInterrupt = () => {
    const open = get().turns.findLast((t) => t.status === "streaming");
    return open ? { turn_id: open.turnId, visible_seq: visibleSeq(open, get().figureStatus) } : undefined;
  };

  /** Run a step command (Next step, a choice): the step gap is open while it is in flight, and stays open if it moved the lesson. */
  const stepCommand = async (command: () => Promise<InstanceState>) => {
    openGap();
    try {
      applyInstance(await command());
    } catch (error) {
      await rereadIfStale(error);
      throw error;
    } finally {
      if (!openingDue) closeGap();
    }
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
      figureChecks.clear();
      openingDue = null;
      closeGap();
      set({ ...initial, instanceId, pageSessionId: uuid(), status: "loading" });
      try {
        const [instance, history] = await Promise.all([
          lessonService.instance(instanceId),
          // History is per active node; a finished lesson has none, so its history read fails. Not fatal.
          lessonService.turnHistory(instanceId).catch(() => []),
        ]);
        if (generation !== loadGeneration) return;
        const node = instance.active_node;
        const turns = history.map((turn) => fromRecorded(turn, node?.instance_node_id ?? null));
        const presented = withFigures([], turns.flatMap((t) => t.figureGroupIds));
        set({
          instance,
          turns,
          presentedFigureIds: presented,
          focusedFigureId: presented.at(-1) ?? null,
          stepTitles: node ? { [node.instance_node_id]: node.title } : {},
        });
        // Coming back: the weak sections to offer for review (non-fatal; the lesson opens either way).
        void loadRevisitOptions(instanceId, true);
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
        if (instance.state === "active" && node && turns.length === 0) {
          void runTurn({ turn_id: uuid(), kind: "opening", instance_node_id: node.instance_node_id }, null);
        }
      } catch (error) {
        if (generation !== loadGeneration) return;
        set({ status: "error", error: asError(error).message ?? "This lesson couldn't be opened." });
      }
    },

    send: async (text) => {
      // Sent while the lesson moves to its next step, a message waits for that step (and its opening to start), so it is
      // never sent on the step being left (the server would refuse it as a stale node, or answer it there).
      if (gap) await gap.closed;
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
        const out = await lessonService.interruptTurn(instanceId, open.turnId, visibleSeq(open, get().figureStatus));
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
      // Only a turn of the step on screen: a failed turn of a step already left is not brought back into this one.
      if (!failed || failed.status !== "failed" || !node || (failed.nodeId && failed.nodeId !== node)) return;
      if (failed.kind === "opening") {
        // The step never got its opening: ask for it again (a failed opening is not attached to, so this one is
        // generated afresh), in place of the failure.
        set((state) => ({ turns: state.turns.filter((t) => t.turnId !== turnId) }));
        await runTurn({ turn_id: uuid(), kind: "opening", instance_node_id: node }, null);
        return;
      }
      if (!failed.failure?.retryable) return;
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
      const revision = instance.revision;
      await stepCommand(() => lessonService.done(instanceId, { request_id: uuid(), expected_revision: revision }));
    },

    choose: async (choice) => {
      const { instanceId, instance } = get();
      if (!instanceId || instance?.revision === undefined) return;
      const revision = instance.revision;
      await stepCommand(() => lessonService.choose(instanceId, { request_id: uuid(), expected_revision: revision, choice }));
    },

    closeRevisitPrompt: () => set({ revisitPromptOpen: false }),

    reviewSections: async (sectionIds) => {
      const { instanceId, instance } = get();
      if (!instanceId || instance?.revision === undefined || sectionIds.length === 0) return;
      set({ reviewBusy: true });
      try {
        await lessonService.review(instanceId, {
          request_id: uuid(),
          expected_revision: instance.revision,
          section_ids: sectionIds,
        });
      } catch (error) {
        set({ reviewBusy: false });
        await rereadIfStale(error);
        throw error;
      }
      // The lesson is on another node (or a finished chapter reopened): open it afresh, with the tutor speaking first.
      await get().load(instanceId);
    },

    startOver: async () => {
      const { instanceId, instance } = get();
      if (!instanceId || instance?.revision === undefined) return null;
      set({ reviewBusy: true });
      try {
        const fresh = await lessonService.review(instanceId, {
          request_id: uuid(),
          expected_revision: instance.revision,
          start_over: true,
        });
        return fresh.id;
      } finally {
        set({ reviewBusy: false });
      }
    },

    askHint: async (itemId) => {
      const { instanceId } = get();
      const node = activeNodeId();
      if (!instanceId || !node) return;
      // Only a hint turn: the server counts and records it at admission. `/hints` is a second request for the same
      // ask, which would be counted twice as an action (LEARNING_ACTIVITY_v1 §4.15, R-E5).
      await runTurn({ turn_id: uuid(), kind: "hint", instance_node_id: node, item_id: itemId }, null);
    },

    refreshManifest: async () => {
      const { instanceId } = get();
      if (!instanceId) return;
      const manifest = await lessonService.manifest(instanceId);
      if (get().instanceId !== instanceId) return;
      set((state) => ({ manifest: mergeManifest(state.manifest, manifest) }));
      preloadManifest(manifest);
    },

    reloadStep: async () => {
      const { instanceId } = get();
      const node = activeNodeId();
      if (!instanceId || !node || get().stepLoadError !== node) return;
      set({ stepLoadError: null });
      try {
        await loadNode(instanceId);
      } catch (error) {
        console.warn("The lesson step couldn't load:", asError(error).request_id, asError(error).message ?? error);
        if (activeNodeId() === node) set({ stepLoadError: node });
        return;
      }
      // The step never got its opening on this screen (nothing was said on it yet): ask for it now.
      if (activeNodeId() === node && !get().turns.some((t) => t.nodeId === node)) {
        openingDue = { node, ready: true };
        openIfDue();
      }
    },

    retryFigure: async (figureGroupId) => {
      if (get().figureStatus[figureGroupId] !== "failed") return;
      await refreshOnce();
      await ensureFigure(figureGroupId, true);
    },

    focusFigure: (figureGroupId) => set({ focusedFigureId: figureGroupId }),

    setVoiceMode: (on) => set({ voiceMode: on }),

    sessionId,

    setSessionLanguage: (language) => set({ sessionLanguage: language }),

    setVoiceSession: (id) => {
      if (get().voiceSessionId === id) return;
      // A reconnect is a fresh session (backend ADR 0025, no resume): a reply of the session it replaces is over, whether
      // or not its end reached us. Left streaming, it would look like a tutor still talking on the step.
      set((state) => ({
        voiceSessionId: id,
        turns: state.turns.map((t) => (t.status === "streaming" && voiceTurns.has(t.turnId) ? { ...t, status: "interrupted" as const } : t)),
      }));
      voiceTurns.clear();
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
      voiceTurns.add(turnId);
      set((state) => ({
        turns: [
          ...state.turns.map((t) => (t.status === "streaming" ? { ...t, status: "interrupted" as const } : t)),
          newTurn(turnId, "learner_message", learnerText, activeNodeId()),
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
      closeGap();
      figureChecks.clear();
      voiceTurns.clear();
      forgetPictures();
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
