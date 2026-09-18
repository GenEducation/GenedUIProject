import { create } from "zustand";
import { asError } from "@/utils/errors";
import { placementService } from "../services/placementService";
import {
  PLACEMENT_ERROR,
  type PlacementBlockAnswer,
  type PlacementBlockContent,
  type PlacementBlockSummary,
  type PlacementItem,
  type PlacementResponse,
} from "../types/placement";

export type PlacementPhase =
  | "idle"          // nothing checked yet
  | "checking"      // status call in flight
  | "intro"         // "N questions, no timer" — before the first item
  | "item"          // a page of the current block is on screen
  | "complete"       // the finishing screen — the last thing a student sees
  | "unavailable"   // ONBD_1104 — no form for this board+grade. Render nothing.
  | "error";

interface PlacementState {
  phase: PlacementPhase;
  attemptId: string | null;
  board: string | null;
  grade: number | null;
  /** The rail: every subject block, in order, no item content. */
  blocks: PlacementBlockSummary[];
  totalBlocks: number;
  /** Subject names from the question bank — used for the intro copy. */
  subjects: string[];
  currentIndex: number;
  totalItems: number;
  /** The subject block currently being answered — items included. A block
   *  now has at most one item per slot, so it always renders as one screen;
   *  there is no pagination within it any more. */
  currentBlock: PlacementBlockContent | null;
  /** Every drafted answer in the current block, keyed by item_id. Cleared
   *  only when a new block is loaded. */
  draftResponses: Record<string, PlacementResponse>;
  /** When each item was first rendered — feeds the advisory `elapsed_ms`. */
  itemShownAt: Record<string, number>;
  /**
   * When the student first reached the item screen (not the intro screen —
   * there is no timer promise on the intro copy, so "time taken" should
   * measure test-taking, not time spent reading). Client-only wall-clock;
   * the backend has no cumulative duration field anywhere. Feeds the
   * "Test Completed" summary's Time Taken card — a rough figure, not
   * something to over-engineer around (pausing/backgrounding isn't excluded).
   */
  startedAt: number | null;
  /** Stamped the moment the last block's submit reports `is_complete` —
   *  feeds the "Test Completed" summary's Status card date. */
  completedAt: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  isSubmitting: boolean;

  checkStatus: (studentId: string) => Promise<void>;
  startOrResume: (studentId: string) => Promise<void>;
  setItemDraft: (itemId: string, response: PlacementResponse | null) => void;
  /**
   * Submits every remaining item's draft answer in the current block and
   * loads whatever comes next. The one "Next" button in the UI always calls
   * this — there is no separate submit action for callers to get wrong.
   */
  goNext: () => Promise<void>;
  /** Leaving the finishing screen ends the flow for this session. */
  finish: () => void;
  reset: () => void;
}

const INITIAL = {
  phase: "idle" as PlacementPhase,
  attemptId: null,
  board: null,
  grade: null,
  blocks: [] as PlacementBlockSummary[],
  totalBlocks: 0,
  subjects: [] as string[],
  currentIndex: 0,
  totalItems: 0,
  currentBlock: null,
  draftResponses: {} as Record<string, PlacementResponse>,
  itemShownAt: {} as Record<string, number>,
  startedAt: null as number | null,
  completedAt: null as number | null,
  errorCode: null,
  errorMessage: null,
  isSubmitting: false,
};

export const usePlacementStore = create<PlacementState>((set, get) => ({
  ...INITIAL,

  /**
   * The gate. ONBD_1104 (ICSE, or a grade outside 3–9) is not an error state —
   * there is simply no form for this student, and they should never see a
   * toast about it.
   */
  checkStatus: async (studentId: string) => {
    if (get().phase !== "idle") return;
    set({ phase: "checking" });
    try {
      const status = await placementService.getStatus(studentId);
      if (status.attempt_status === "COMPLETED") {
        set({ ...INITIAL, phase: "unavailable" });
        return;
      }
      set({
        phase: "intro",
        board: status.board,
        grade: status.grade,
        currentIndex: status.current_index,
        totalItems: status.total_items,
        subjects: status.subjects.map((s) => s.subject),
      });
    } catch (error) {
      applyError(set, error);
    }
  },

  /**
   * `start` is idempotent and doubles as the resume call: it returns the same
   * attempt, the same frozen item order, and `current_block` wherever the
   * student stopped — a block abandoned half-way comes back whole, with
   * `answered` saying how many of its items are already recorded.
   * `current_index` is the entire resume state — there is nothing to cache
   * locally and nothing to reconcile.
   */
  startOrResume: async (studentId: string) => {
    try {
      const attempt = await placementService.start(studentId);
      set({
        attemptId: attempt.attempt_id,
        board: attempt.board,
        grade: attempt.grade,
        blocks: attempt.blocks,
        totalBlocks: attempt.total_blocks,
        errorCode: null,
        errorMessage: null,
      });

      if (attempt.is_complete || !attempt.current_block) {
        // Already finished in an earlier session — there is no celebration
        // screen or result to show for a plain resume, only for just now
        // finishing. Close the same way `checkStatus`'s COMPLETED branch does.
        set({ ...INITIAL, phase: "unavailable" });
        return;
      }

      applyBlock(set, get, attempt.current_block, attempt.current_index, attempt.total_items);
    } catch (error) {
      applyError(set, error);
    }
  },

  setItemDraft: (itemId, response) =>
    set((state) => {
      const next = { ...state.draftResponses };
      if (response === null) delete next[itemId];
      else next[itemId] = response;
      return { draftResponses: next };
    }),

  goNext: async () => {
    const { currentBlock, draftResponses, isSubmitting } = get();
    if (!currentBlock || isSubmitting) return;

    const remaining = currentBlock.items.slice(currentBlock.answered);
    const blockComplete = remaining.every((it) => draftResponses[it.item_id] !== undefined);
    if (!blockComplete) return;

    await submitCurrentBlock(set, get);
  },

  finish: () => set({ ...INITIAL, phase: "unavailable" }),

  reset: () => set({ ...INITIAL }),
}));

type Setter = (partial: Partial<PlacementState>) => void;
type Getter = () => PlacementState;

function stampShown(items: PlacementItem[]): Record<string, number> {
  const now = Date.now();
  return Object.fromEntries(items.map((item) => [item.item_id, now]));
}

/**
 * Loads one subject block into the store, jumping straight past whatever the
 * student already answered before abandoning it. Already-recorded items
 * (`index < block.answered`) are never re-rendered — we have no way to
 * prefill their response, and the contract treats re-submitting them as
 * unnecessary, not merely harmless.
 *
 * A block now has at most one item per slot (see `PlacementSlot`), so it
 * always fits one screen — `PlacementBoard` lays it out with a fixed
 * `buildSlotGrid` template, no measurement or pagination required.
 */
function applyBlock(
  set: Setter,
  get: Getter,
  block: PlacementBlockContent,
  currentIndex: number,
  totalItems: number,
) {
  const remaining = block.items.slice(block.answered);
  set({
    phase: "item",
    currentBlock: block,
    currentIndex,
    totalItems,
    draftResponses: {},
    itemShownAt: stampShown(remaining),
    // Stamped once, the first time the student actually reaches an item —
    // a resumed attempt's later blocks must not push this forward.
    startedAt: get().startedAt ?? Date.now(),
    errorCode: null,
    errorMessage: null,
  });
}

/**
 * Submits every drafted answer in the current block and moves on.
 *
 * On failure the block and every draft are left exactly as they were, so the
 * student can press the same button again: replaying a block is
 * a no-op on the backend that changes nothing, so a retry cannot double-submit
 * or overwrite a graded answer. Only a fatal code (the attempt is gone, the
 * grade changed) is worth leaving the block over — anything else is a message
 * under the button they are already looking at.
 */
async function submitCurrentBlock(set: Setter, get: Getter) {
  const { attemptId, currentBlock, draftResponses, itemShownAt } = get();
  if (!attemptId || !currentBlock) return;

  const answers: PlacementBlockAnswer[] = currentBlock.items
    .slice(currentBlock.answered)
    .filter((item) => draftResponses[item.item_id] !== undefined)
    .map((item) => {
      const shownAt = itemShownAt[item.item_id];
      return {
        item_id: item.item_id,
        response: draftResponses[item.item_id],
        ...(shownAt ? { elapsed_ms: Date.now() - shownAt } : {}),
      };
    });

  set({ isSubmitting: true, errorCode: null, errorMessage: null });
  try {
    const res = await placementService.submitBlock(attemptId, answers);
    set({ isSubmitting: false });

    if (res.is_complete || !res.next_block) {
      set({
        currentIndex: res.current_index,
        currentBlock: null,
        phase: "complete",
        completedAt: Date.now(),
      });
      return;
    }

    applyBlock(set, get, res.next_block, res.current_index, res.total_items);
  } catch (error) {
    set({ isSubmitting: false });

    const code = asError(error).error_code;
    const isFatal =
      code === PLACEMENT_ERROR.NO_ATTEMPT ||
      code === PLACEMENT_ERROR.BAD_ITEM ||
      code === PLACEMENT_ERROR.NO_FORM;

    if (isFatal) {
      applyError(set, error);
      return;
    }

    set({ errorCode: code ?? null, errorMessage: "That didn't send." });
  }
}

/**
 * Error code → phase, per the contract's table. Anything unrecognised (a 500,
 * a dropped connection) falls through to a generic retryable error rather than
 * pretending the form does not exist.
 */
function applyError(set: Setter, error: unknown) {
  const { error_code: code, message, request_id } = asError(error);

  switch (code) {
    case PLACEMENT_ERROR.NO_FORM:
      // No form for this board+grade. Skip placement silently — not an error.
      set({ ...INITIAL, phase: "unavailable" });
      return;
    case PLACEMENT_ERROR.NO_GRADE:
      set({
        phase: "error",
        errorCode: code,
        errorMessage: "Finish your profile first — we need your grade to build your test.",
      });
      return;
    case PLACEMENT_ERROR.NO_ATTEMPT:
      // Attempt gone or not ours. Drop it; the gate will call start() again.
      set({ ...INITIAL, phase: "intro", errorCode: code });
      return;
    case PLACEMENT_ERROR.BAD_ITEM:
      set({
        phase: "error",
        errorCode: code,
        errorMessage: "Your grade changed while this test was open. Ask your teacher to reset your placement.",
      });
      return;
    case PLACEMENT_ERROR.IN_PROGRESS:
      // Results asked for mid-form — keep them in the form.
      set({ phase: "item", errorCode: code });
      return;
    case PLACEMENT_ERROR.BAD_ID:
      console.error("[placement] malformed id", request_id, message);
      set({ phase: "error", errorCode: code, errorMessage: "Something went wrong on our side." });
      return;
    default:
      set({
        phase: "error",
        errorCode: code ?? null,
        errorMessage: "We couldn't reach your test. Check your connection and try again.",
      });
  }
}
