import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePlacementStore } from "../usePlacementStore";
import { placementService } from "../../services/placementService";
import { PLACEMENT_ERROR } from "../../types/placement";
import { PLACEMENT_ITEMS } from "@/test/msw/handlers/placement";
import type { PlacementBlockContent, PlacementBlockSummary } from "../../types/placement";

vi.mock("../../services/placementService", () => ({
  placementService: {
    getStatus: vi.fn(),
    start: vi.fn(),
    getBlock: vi.fn(),
    submitBlock: vi.fn(),
    getResult: vi.fn(),
  },
}));

const mocked = vi.mocked(placementService);

/** An `ApiRequestError`-shaped throw — what `authFetch` actually rejects with. */
const apiError = (code: string) => Object.assign(new Error(code), { error_code: code });

// A batch carries no subject any more — it mixes several, see item.subject.
const BLOCKS: PlacementBlockSummary[] = [
  { block_index: 0, item_count: 3, start_index: 0, answered: 0, slots: ["mcq_1", "mcq_2", "true_false_1"] },
  { block_index: 1, item_count: 2, start_index: 3, answered: 0, slots: ["visual_1", "flex_1"] },
  { block_index: 2, item_count: 1, start_index: 5, answered: 0, slots: ["mcq_1"] },
];

/** A mixed-subject batch: mcq (English), multi_select (Geography), true_false (Science). */
const firstBatch = (overrides: Partial<PlacementBlockContent> = {}): PlacementBlockContent => ({
  block_index: 0,
  item_count: 3,
  start_index: 0,
  answered: 0,
  slots: ["mcq_1", "mcq_2", "true_false_1"],
  items: PLACEMENT_ITEMS.slice(0, 3),
  ...overrides,
});

/** chart (Geography) + order (English). */
const secondBatch = (overrides: Partial<PlacementBlockContent> = {}): PlacementBlockContent => ({
  block_index: 1,
  item_count: 2,
  start_index: 3,
  answered: 0,
  slots: ["visual_1", "flex_1"],
  items: PLACEMENT_ITEMS.slice(3, 5),
  ...overrides,
});

/**
 * A numeric input and a one-word fill-in — a stand-in two-item batch. Since
 * a batch has at most one item per slot and always renders as a single
 * screen, this needs no pixel scenario, just a plausible slot shape.
 */
const lightBlock = (overrides: Partial<PlacementBlockContent> = {}): PlacementBlockContent => ({
  block_index: 0,
  item_count: 2,
  start_index: 0,
  answered: 0,
  slots: ["flex_1", "mcq_1"],
  items: [
    PLACEMENT_ITEMS.find((i) => i.item_id === "CBSE-G6-MATH-01")!, // numeric
    PLACEMENT_ITEMS.find((i) => i.item_id === "CBSE-G6-ENG-03")!, // fill_blank
  ],
  ...overrides,
});

const attempt = (overrides: Partial<Record<string, unknown>> = {}) => ({
  attempt_id: "attempt-1",
  student_id: "student-1",
  board: "CBSE",
  grade: 6,
  bank_version: "2.0",
  status: "IN_PROGRESS",
  current_index: 0,
  total_items: 10,
  total_blocks: 3,
  blocks: BLOCKS,
  current_block: firstBatch(),
  is_complete: false,
  ...overrides,
});

describe("usePlacementStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlacementStore.getState().reset();
  });

  describe("the gate", () => {
    it("opens the intro for a student who hasn't started", async () => {
      mocked.getStatus.mockResolvedValue({
        board: "CBSE",
        grade: 6,
        attempt_status: "NOT_STARTED",
        current_index: 0,
        total_items: 10,
        subjects: [{ subject: "Hindi", status: "PENDING" }],
      });

      await usePlacementStore.getState().checkStatus("student-1");

      expect(usePlacementStore.getState().phase).toBe("intro");
      expect(usePlacementStore.getState().subjects).toEqual(["Hindi"]);
    });

    it("stays shut for a student who already finished", async () => {
      mocked.getStatus.mockResolvedValue({
        board: "CBSE",
        grade: 6,
        attempt_status: "COMPLETED",
        current_index: 10,
        total_items: 10,
        subjects: [],
      });

      await usePlacementStore.getState().checkStatus("student-1");

      expect(usePlacementStore.getState().phase).toBe("unavailable");
    });

    /**
     * ONBD_1104 means there is no form for this board+grade — an ICSE student,
     * or one outside grades 3–9. That is a normal state, not a failure: they
     * must see nothing at all, never an error.
     */
    it("skips silently when no form exists for the student", async () => {
      mocked.getStatus.mockRejectedValue(apiError(PLACEMENT_ERROR.NO_FORM));

      await usePlacementStore.getState().checkStatus("student-1");

      const state = usePlacementStore.getState();
      expect(state.phase).toBe("unavailable");
      expect(state.errorMessage).toBeNull();
    });
  });

  describe("resuming", () => {
    /**
     * `current_block` is the entire resume state. Nothing is cached locally,
     * so this asserts the store simply adopts whatever `start` reports —
     * including a batch already partly answered from a previous session.
     */
    it("loads the batch the server reports, skipping already-answered items", async () => {
      mocked.start.mockResolvedValue(
        attempt({
          current_index: 1,
          current_block: firstBatch({ answered: 1 }), // the mcq was already answered
        }),
      );

      await usePlacementStore.getState().startOrResume("student-1");

      const state = usePlacementStore.getState();
      expect(state.phase).toBe("item");
      expect(state.currentBlock?.answered).toBe(1);
      // Only the two remaining items (multi_select, true_false) are ever put on screen.
      expect(state.currentBlock?.items.slice(state.currentBlock.answered).map((i) => i.item_id)).toEqual([
        "CBSE-G6-GEO-01",
        "CBSE-G6-SCI-01",
      ]);
      expect(state.blocks).toEqual(BLOCKS);
    });

    it("closes silently, with no celebration screen, resuming into an attempt already complete", async () => {
      mocked.start.mockResolvedValue(attempt({ is_complete: true, current_block: null }));

      await usePlacementStore.getState().startOrResume("student-1");

      expect(mocked.getResult).not.toHaveBeenCalled();
      expect(usePlacementStore.getState().phase).toBe("unavailable");
    });
  });

  describe("answering within a batch", () => {
    beforeEach(async () => {
      // A numeric input and a one-word fill-in — light enough to share a page.
      mocked.start.mockResolvedValue(attempt({ current_block: lightBlock() }));
      await usePlacementStore.getState().startOrResume("student-1");
    });

    it("keeps drafts across items without contacting the server", () => {
      usePlacementStore.getState().setItemDraft("CBSE-G6-MATH-01", { value: 405 });

      expect(mocked.submitBlock).not.toHaveBeenCalled();
      expect(usePlacementStore.getState().draftResponses).toEqual({
        "CBSE-G6-MATH-01": { value: 405 },
      });
    });

    it("refuses to advance while any item in the batch is unanswered", async () => {
      usePlacementStore.getState().setItemDraft("CBSE-G6-MATH-01", { value: 405 });
      // ENG-03 still undrafted.
      await usePlacementStore.getState().goNext();

      expect(mocked.submitBlock).not.toHaveBeenCalled();
      expect(usePlacementStore.getState().phase).toBe("item");
    });

    it("submits the whole batch in one call once every item is answered", async () => {
      mocked.submitBlock.mockResolvedValue({
        accepted: 2,
        current_index: 2,
        total_items: 10,
        is_complete: false,
        next_block: secondBatch(),
      });

      const store = usePlacementStore.getState();
      store.setItemDraft("CBSE-G6-MATH-01", { value: 405 });
      store.setItemDraft("CBSE-G6-ENG-03", { text: "but" });
      await usePlacementStore.getState().goNext();

      expect(mocked.submitBlock).toHaveBeenCalledWith(
        "attempt-1",
        expect.arrayContaining([
          expect.objectContaining({ item_id: "CBSE-G6-MATH-01", response: { value: 405 } }),
          expect.objectContaining({ item_id: "CBSE-G6-ENG-03", response: { text: "but" } }),
        ]),
      );

      const state = usePlacementStore.getState();
      expect(state.currentBlock?.block_index).toBe(1);
      // The draft map must not carry across to the next batch.
      expect(state.draftResponses).toEqual({});
    });

    /**
     * A flaky connection must be safe to retry. The store leaves the batch
     * and every draft untouched on failure so pressing the button again
     * re-POSTs the same answers — which the backend treats as a no-op.
     */
    it("keeps the batch and drafts intact when the submit fails", async () => {
      mocked.submitBlock.mockRejectedValue(new Error("network"));

      const store = usePlacementStore.getState();
      store.setItemDraft("CBSE-G6-MATH-01", { value: 405 });
      store.setItemDraft("CBSE-G6-ENG-03", { text: "but" });
      await usePlacementStore.getState().goNext();

      const state = usePlacementStore.getState();
      // Still on the batch, not ejected to an error screen.
      expect(state.phase).toBe("item");
      expect(state.currentBlock).not.toBeNull();
      expect(state.draftResponses["CBSE-G6-MATH-01"]).toEqual({ value: 405 });
      expect(state.isSubmitting).toBe(false);
      expect(state.errorMessage).toMatch(/didn't send/i);
    });

    it("does eject when the attempt itself is gone", async () => {
      mocked.submitBlock.mockRejectedValue(apiError(PLACEMENT_ERROR.NO_ATTEMPT));

      const store = usePlacementStore.getState();
      store.setItemDraft("CBSE-G6-MATH-01", { value: 405 });
      store.setItemDraft("CBSE-G6-ENG-03", { text: "but" });
      await usePlacementStore.getState().goNext();

      // ONBD_1105 is not retryable in place: the attempt must be restarted.
      expect(usePlacementStore.getState().phase).toBe("intro");
    });

    it("never learns whether an answer was correct", async () => {
      mocked.submitBlock.mockResolvedValue({
        accepted: 2,
        current_index: 2,
        total_items: 10,
        is_complete: false,
        next_block: secondBatch(),
      });

      const store = usePlacementStore.getState();
      store.setItemDraft("CBSE-G6-MATH-01", { value: 405 });
      store.setItemDraft("CBSE-G6-ENG-03", { text: "but" });
      await usePlacementStore.getState().goNext();

      // Nothing in the store may carry correctness mid-form — the API does
      // not send it, and inferring it client-side is explicitly out of
      // contract.
      expect(JSON.stringify(usePlacementStore.getState())).not.toMatch(/is_correct/);
    });

    it("lands on the completed screen once the last batch is submitted — the last thing the student sees", async () => {
      mocked.submitBlock.mockResolvedValue({
        accepted: 2,
        current_index: 10,
        total_items: 10,
        is_complete: true,
        next_block: null,
      });

      const store = usePlacementStore.getState();
      store.setItemDraft("CBSE-G6-MATH-01", { value: 405 });
      store.setItemDraft("CBSE-G6-ENG-03", { text: "but" });
      await usePlacementStore.getState().goNext();

      const state = usePlacementStore.getState();
      expect(state.phase).toBe("complete");
      expect(state.completedAt).not.toBeNull();
      // There is no separate results screen — nothing ever fetches the full
      // per-item breakdown from this flow.
      expect(mocked.getResult).not.toHaveBeenCalled();
    });

    it("closes the flow when the completed screen's own button is used", async () => {
      mocked.submitBlock.mockResolvedValue({
        accepted: 2,
        current_index: 10,
        total_items: 10,
        is_complete: true,
        next_block: null,
      });

      const store = usePlacementStore.getState();
      store.setItemDraft("CBSE-G6-MATH-01", { value: 405 });
      store.setItemDraft("CBSE-G6-ENG-03", { text: "but" });
      await usePlacementStore.getState().goNext();
      usePlacementStore.getState().finish();

      expect(usePlacementStore.getState().phase).toBe("unavailable");
    });

    it("stamps startedAt once the student reaches an item, and completedAt once the form is finished", async () => {
      const before = Date.now();
      mocked.submitBlock.mockResolvedValue({
        accepted: 2,
        current_index: 10,
        total_items: 10,
        is_complete: true,
        next_block: null,
      });

      expect(usePlacementStore.getState().startedAt).toBeGreaterThanOrEqual(before);
      expect(usePlacementStore.getState().completedAt).toBeNull();

      const store = usePlacementStore.getState();
      store.setItemDraft("CBSE-G6-MATH-01", { value: 405 });
      store.setItemDraft("CBSE-G6-ENG-03", { text: "but" });
      await usePlacementStore.getState().goNext();

      expect(usePlacementStore.getState().completedAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe("error codes", () => {
    it("asks a student with no grade to finish their profile", async () => {
      mocked.getStatus.mockRejectedValue(apiError(PLACEMENT_ERROR.NO_GRADE));

      await usePlacementStore.getState().checkStatus("student-1");

      const state = usePlacementStore.getState();
      expect(state.phase).toBe("error");
      expect(state.errorMessage).toMatch(/profile/i);
    });

    it("points at the teacher when the grade changed mid-attempt", async () => {
      mocked.start.mockRejectedValue(apiError(PLACEMENT_ERROR.BAD_ITEM));

      await usePlacementStore.getState().startOrResume("student-1");

      const state = usePlacementStore.getState();
      expect(state.phase).toBe("error");
      expect(state.errorMessage).toMatch(/teacher/i);
    });

    it("offers a retry for an unrecognised failure rather than giving up", async () => {
      mocked.getStatus.mockRejectedValue(new Error("boom"));

      await usePlacementStore.getState().checkStatus("student-1");

      const state = usePlacementStore.getState();
      expect(state.phase).toBe("error");
      expect(state.errorMessage).toMatch(/connection/i);
    });
  });
});
