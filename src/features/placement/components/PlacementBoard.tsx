"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { usePlacementStore } from "../store/usePlacementStore";
import { ItemRenderer } from "./items/ItemRenderer";
import { PlacementIntro } from "./PlacementIntro";
import { PlacementProgressRail } from "./PlacementProgressRail";
import { PlacementResultView } from "./PlacementResultView";
import { isFullWidthSlot, splitVisual } from "../utils/slotGrid";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest("[hidden]") && el.getAttribute("aria-hidden") !== "true",
  );
}

/**
 * The placement form's shell.
 *
 * **Deliberately not `@/components/ui/Modal`.** That primitive is sized (and
 * named) for a dialog — a narrow, portrait-ish box. This is a wide board: a
 * subject block's items sit in a slot-keyed grid (see `slotGrid.ts`), several
 * regions side by side, the way the wireframe called for. Reusing Modal
 * would mean fighting its width and its single-column body on every screen,
 * so this is its own — deliberately minimal — overlay: a portal, a backdrop,
 * a focus trap, a scroll lock. It has no dismiss path (no Escape, no
 * backdrop click) for the same reason the rest of this form doesn't: a
 * graded item a student can dismiss mid-answer is an item they lose.
 *
 * **The layout is CSS-only, not a measured one — and not a single flat grid
 * either.** A batch has at most one item per slot, one per family (`mcq`,
 * `true_false`, `visual`, `flex`) with a climbing ordinal, and the
 * composition genuinely varies (a backfilled third `mcq`, a grade with no
 * `true_false`). Two things were tried and broke on real compositions before
 * landing on nested grids:
 *   1. A `grid-template-areas` string keyed by exact slot values — CSS
 *      requires every area name to form one rectangle, so the string had to
 *      be hand-built per composition and broke on shapes the pairing rule
 *      didn't anticipate.
 *   2. A single 3-column grid (`visual` explicitly placed in column 3,
 *      everything else left to auto-place) — the browser's own
 *      auto-placement doesn't know column 3 is reserved and happily filled
 *      it with a third `mcq`, pushing the actual visual item (and
 *      everything after it) down and off the bottom of the panel.
 * The fix: **two independent grids.** The left items sit in their own
 * 2-column grid (so there is structurally no third column for the browser
 * to place them into); that grid is itself one cell in an outer 2-column
 * grid whose second cell holds the `visual` item, sized to match by
 * ordinary grid row-stretch — no row-count math anywhere.
 *
 * **The panel's height is intrinsic, capped, not fixed — and only the
 * content region scrolls, never the whole panel.** `max-h` on the outer
 * panel is a ceiling; every phase's content wrapper needs both `flex-1` and
 * `min-h-0` to actually be constrained to the space left after the header
 * and footer, or its intrinsic height simply grows past the ceiling and
 * `overflow-hidden` on the panel silently clips whatever doesn't fit —
 * including the footer's Next/Finish button — with no scrollbar anywhere to
 * reveal it. `min-h-0` is the part that's easy to drop and still compile: a
 * flex child's default `min-height: auto` overrides `flex-1` and lets it
 * grow past its share regardless.
 */
export function PlacementBoard({ studentId, subjects }: { studentId: string; subjects: string[] }) {
  const phase = usePlacementStore((s) => s.phase);
  const blocks = usePlacementStore((s) => s.blocks);
  const currentBlock = usePlacementStore((s) => s.currentBlock);
  const currentIndex = usePlacementStore((s) => s.currentIndex);
  const totalItems = usePlacementStore((s) => s.totalItems);
  const totalBlocks = usePlacementStore((s) => s.totalBlocks);
  const draftResponses = usePlacementStore((s) => s.draftResponses);
  const result = usePlacementStore((s) => s.result);
  const errorMessage = usePlacementStore((s) => s.errorMessage);
  const isSubmitting = usePlacementStore((s) => s.isSubmitting);

  const startOrResume = usePlacementStore((s) => s.startOrResume);
  const setItemDraft = usePlacementStore((s) => s.setItemDraft);
  const goNext = usePlacementStore((s) => s.goNext);
  const dismissResult = usePlacementStore((s) => s.dismissResult);
  const reset = usePlacementStore((s) => s.reset);

  const [isStarting, setIsStarting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Every remaining item in the block, in the block's own fixed order.
  const remainingItems = currentBlock ? currentBlock.items.slice(currentBlock.answered) : [];
  const { left: leftItems, visual: visualItems } = splitVisual(remainingItems);

  const open = phase !== "idle" && phase !== "checking" && phase !== "unavailable";
  const isLastBlock = currentBlock ? currentBlock.block_index >= totalBlocks - 1 : false;
  const isLastScreen = isLastBlock;
  const blockComplete =
    remainingItems.length > 0 && remainingItems.every((it) => draftResponses[it.item_id] !== undefined);

  const handleStart = async () => {
    setIsStarting(true);
    await startOrResume(studentId);
    setIsStarting(false);
  };

  // Focus trap + scroll lock + initial focus, while open. No Escape handler
  // and no backdrop `onClick` — this board has nothing that closes it.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const target = panel && focusableWithin(panel)[0];
      target?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = focusableWithin(panel);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] backdrop-blur-sm"
            style={{ background: "rgb(16 20 32 / 0.55)" }}
          />

          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Placement test"
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
              className="placement-theme w-[1180px] max-w-[95vw] max-h-[min(760px,92vh)] flex flex-col rounded-[24px] overflow-hidden pointer-events-auto outline-none"
              style={{ background: "var(--pl-canvas)", boxShadow: "0 30px 80px rgb(16 20 32 / 0.28)" }}
            >
              {phase === "intro" && (
                <div className="overflow-y-auto flex-1 min-h-0">
                  <PlacementIntro
                    totalItems={totalItems}
                    subjects={subjects}
                    isStarting={isStarting}
                    onStart={handleStart}
                  />
                </div>
              )}

              {phase === "item" && currentBlock && (
                <div className="flex flex-col min-h-0 flex-1">
                  <div className="px-6 sm:px-10 pt-7 pb-4 shrink-0">
                    <PlacementProgressRail
                      blocks={blocks}
                      activeBlockIndex={currentBlock.block_index}
                      answeredInActiveBlock={currentBlock.answered}
                      currentIndex={currentIndex}
                      totalItems={totalItems}
                    />
                  </div>

                  {/* Two independent grids, not one flat multi-column one —
                      a single grid with 3 explicit columns would let the
                      browser's own auto-placement fill all 3 per row,
                      dropping a left item straight into the visual's column.
                      Nesting the left items in their own 2-column grid makes
                      that structurally impossible: this grid genuinely only
                      has 2 columns to place into. */}
                  <div
                    className="px-6 sm:px-10 pb-6 overflow-y-auto grid flex-1 min-h-0"
                    style={{
                      gridTemplateColumns: visualItems.length > 0 ? "2fr 1.3fr" : "1fr",
                      gap: 16,
                      alignContent: "start",
                    }}
                  >
                    <div className="grid content-start" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      {leftItems.map((item) => (
                        <div
                          key={item.item_id}
                          style={{ gridColumn: isFullWidthSlot(item.slot) ? "1 / 3" : undefined }}
                        >
                          <ItemRenderer
                            item={item}
                            value={draftResponses[item.item_id] ?? null}
                            onChange={(response) => setItemDraft(item.item_id, response)}
                            disabled={isSubmitting}
                          />
                        </div>
                      ))}
                    </div>

                    {visualItems.length > 0 && (
                      // In the same outer grid row as the left column above,
                      // so it stretches to match that column's real height —
                      // no row-count math needed.
                      <div className="space-y-4">
                        {visualItems.map((item) => (
                          <ItemRenderer
                            key={item.item_id}
                            item={item}
                            value={draftResponses[item.item_id] ?? null}
                            onChange={(response) => setItemDraft(item.item_id, response)}
                            disabled={isSubmitting}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    className="px-6 sm:px-10 py-5 shrink-0 border-t flex items-center justify-between gap-4"
                    style={{ borderColor: "var(--pl-border)" }}
                  >
                    {/* A send that failed leaves the student exactly where
                        they were; pressing the button again re-sends the
                        same block, which the backend treats as a no-op. */}
                    <p
                      className="m-0 text-[12px] font-medium"
                      role="alert"
                      style={{ color: "var(--pl-ink-mid)", visibility: errorMessage ? "visible" : "hidden" }}
                    >
                      {errorMessage} Tap the button again.
                    </p>

                    <Button
                      variant="primary"
                      size="lg"
                      loading={isSubmitting}
                      // Every item in the block needs an answer — there is no
                      // skip, and no partial submit.
                      disabled={!blockComplete || isSubmitting}
                      onClick={goNext}
                    >
                      {isLastScreen ? "Finish" : "Next"}
                    </Button>
                  </div>
                </div>
              )}

              {phase === "result" && result && (
                <div className="overflow-y-auto flex-1 min-h-0">
                  <PlacementResultView result={result} onDone={dismissResult} />
                </div>
              )}

              {phase === "error" && (
                <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-14 text-center">
                  <h2 className="m-0 font-extrabold text-[22px]" style={{ color: "var(--pl-primary)" }}>
                    We couldn&apos;t load your test
                  </h2>
                  <p className="mt-3 mb-0 max-w-[40ch] text-[15px]" style={{ color: "var(--pl-ink-mid)" }}>
                    {errorMessage}
                  </p>
                  <div className="mt-8 w-full max-w-[280px]">
                    <Button variant="outline" size="lg" fullWidth className="pl-btn-quiet" onClick={reset}>
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
