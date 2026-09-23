"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePlacementStore } from "../store/usePlacementStore";
import { ItemRenderer } from "./items/ItemRenderer";
import { PlacementHeader } from "./PlacementHeader";
import { PlacementIntro } from "./PlacementIntro";
import { PlacementCompleteView } from "./PlacementCompleteView";
import { StudentBlobatar } from "@/features/student/components/StudentBlobatar";
import { thinking, happy, idle } from "blobatar/expression";
import { PlacementProgressRail } from "./PlacementProgressRail";
import type { PlacementItem } from "../types/placement";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest("[hidden]") && el.getAttribute("aria-hidden") !== "true",
  );
}

/** "Q3", "Q3 and Q7", "Q3, Q7 and Q9" — the same item's own "Q{n}" label the card shows. */
function formatQuestionList(items: PlacementItem[]): string {
  const labels = items.map((it) => `Q${it.index + 1}`);
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/**
 * The placement form's shell.
 *
 * **Deliberately not `@/components/ui/Modal`.** That primitive is sized (and
 * named) for a dialog — a narrow, portrait-ish box. This is a wide board: a
 * subject block's items flow through a masonry of several columns, the way
 * the wireframe called for. Reusing Modal
 * would mean fighting its width and its single-column body on every screen,
 * so this is its own — deliberately minimal — overlay: a portal, a backdrop,
 * a focus trap, a scroll lock. It has no dismiss path (no Escape, no
 * backdrop click) for the same reason the rest of this form doesn't: a
 * graded item a student can dismiss mid-answer is an item they lose.
 *
 * **The layout is CSS-only, not a measured one — and not a grid at all.** A
 * batch mixes several item types of differing natural height (a short mcq
 * next to a tall chart or map), and the reference layout packs them densely:
 * whichever item comes next in reading order starts right under the
 * previous one in the same column, no matter how short that one was. Two
 * grid-based approaches were tried and dropped before landing here:
 *   1. A `grid-template-areas` string keyed by exact slot values — CSS
 *      requires every area name to form one rectangle, so the string had to
 *      be hand-built per composition and broke on shapes the pairing rule
 *      didn't anticipate.
 *   2. Splitting items into a dedicated 2-column "left" grid plus a
 *      separate "visual" column — a grid row's height is set by its
 *      tallest cell, so a short visual item left a column mostly empty
 *      under it while the left column still needed scrolling.
 * The fix: a **CSS multi-column masonry** (`column-count: 3`). The browser
 * balances column heights on its own and items flow through in the batch's
 * own order — no per-family placement rule to keep in sync with the item
 * types the backend actually sends.
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
  const currentBlock = usePlacementStore((s) => s.currentBlock);
  const currentIndex = usePlacementStore((s) => s.currentIndex);
  const totalItems = usePlacementStore((s) => s.totalItems);
  const totalBlocks = usePlacementStore((s) => s.totalBlocks);
  const draftResponses = usePlacementStore((s) => s.draftResponses);
  const errorMessage = usePlacementStore((s) => s.errorMessage);
  const isSubmitting = usePlacementStore((s) => s.isSubmitting);
  const grade = usePlacementStore((s) => s.grade);
  const board = usePlacementStore((s) => s.board);
  const startedAt = usePlacementStore((s) => s.startedAt);
  const completedAt = usePlacementStore((s) => s.completedAt);

  const startOrResume = usePlacementStore((s) => s.startOrResume);
  const setItemDraft = usePlacementStore((s) => s.setItemDraft);
  const goNext = usePlacementStore((s) => s.goNext);
  const finish = usePlacementStore((s) => s.finish);
  const reset = usePlacementStore((s) => s.reset);

  const [isStarting, setIsStarting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Every remaining item in the block, in the block's own fixed order.
  const remainingItems = currentBlock ? currentBlock.items.slice(currentBlock.answered) : [];

  const open = phase !== "idle" && phase !== "checking" && phase !== "unavailable";
  // The intro and complete screens are single-column bookend cards, not the
  // item screen's multi-subject grid — sized to the reference's narrower
  // dialog rather than stretching to the item screen's 1180px board width.
  const isNarrowPhase = phase === "intro" || phase === "complete";
  const isLastBlock = currentBlock ? currentBlock.block_index >= totalBlocks - 1 : false;
  const isLastScreen = isLastBlock;
  const missingItems = remainingItems.filter((it) => draftResponses[it.item_id] === undefined);
  const blockComplete = remainingItems.length > 0 && missingItems.length === 0;

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
              aria-label="Onboarding test"
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
              className={`placement-theme max-h-[min(760px,92vh)] flex flex-col rounded-[24px] overflow-hidden pointer-events-auto outline-none ${
                isNarrowPhase ? "w-[640px] max-w-[92vw]" : "w-[1180px] max-w-[95vw]"
              }`}
              style={{ background: "var(--pl-canvas)", boxShadow: "0 30px 80px rgb(16 20 32 / 0.28)" }}
            >
              {phase === "intro" && (
                <div className="overflow-y-auto flex-1 min-h-0">
                  <PlacementIntro
                    totalItems={totalItems}
                    subjects={subjects}
                    grade={grade}
                    board={board}
                    isStarting={isStarting}
                    onStart={handleStart}
                  />
                </div>
              )}

              {phase === "item" && currentBlock && (
                <div className="flex flex-col min-h-0 flex-1">
                  <div className="px-6 sm:px-10 pt-6 pb-4 shrink-0 space-y-4">
                    <PlacementHeader />
                    <div className="flex items-center gap-3">
                      {/* Company through a long mandatory test. It reacts to
                          PROGRESS only — never to correctness. This store
                          deliberately carries no per-answer `is_correct`
                          client-side (see types/placement.ts, asserted by a
                          store test), and the creature is not a reason to
                          change that. */}
                      <div className="hidden sm:flex shrink-0">
                        <StudentBlobatar
                          size={40}
                          animate="hover"
                          expression={
                            isSubmitting
                              ? thinking
                              : totalItems > 0 && currentIndex >= totalItems / 2
                                ? happy
                                : idle
                          }
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <PlacementProgressRail currentIndex={currentIndex} totalItems={totalItems} />
                      </div>
                    </div>
                  </div>

                  {/* A CSS multi-column masonry, not a grid — the reference
                      layout packs every item (mcq, map, chart, whatever)
                      into the same 3 columns by reading order, each column
                      filling to roughly the same height, so a short card is
                      immediately followed by the next item rather than
                      leaving a gap under it. A grid can't do this: a grid
                      row's height is set by its tallest cell, so any card
                      shorter than its row-mate wastes the rest of that row.
                      `break-inside: avoid` keeps a single item from being
                      split across two columns. */}
                  <div
                    className="px-6 sm:px-10 pb-6 overflow-y-auto flex-1 min-h-0"
                    style={{ columnCount: 3, columnGap: 16 }}
                  >
                    {remainingItems.map((item) => (
                      <div key={item.item_id} style={{ breakInside: "avoid", marginBottom: 16 }}>
                        <ItemRenderer
                          item={item}
                          value={draftResponses[item.item_id] ?? null}
                          onChange={(response) => setItemDraft(item.item_id, response)}
                          disabled={isSubmitting}
                        />
                      </div>
                    ))}
                  </div>

                  <div
                    className="px-6 sm:px-10 py-5 shrink-0 border-t flex items-center justify-between gap-4"
                    style={{ borderColor: "var(--pl-border)" }}
                  >
                    {/* A send that failed leaves the student exactly where
                        they were; pressing the button again re-sends the
                        same block, which the backend treats as a no-op.
                        Otherwise, while the block is incomplete, name the
                        exact questions still blocking Next/Finish — "answer
                        Q18, Q20" is something a student can act on; a
                        disabled button with no explanation is not. The
                        static hint is the fallback once nothing is missing,
                        so the footer isn't empty space either way. */}
                    <p className="m-0 text-[12px] font-medium" role="alert" style={{ color: "var(--pl-ink-mid)" }}>
                      {errorMessage
                        ? `${errorMessage} Tap the button again.`
                        : missingItems.length > 0
                          ? `Answer ${formatQuestionList(missingItems)} to continue.`
                          : "Questions are tailored to your grade and curriculum."}
                    </p>

                    <Button
                      variant="primary"
                      size="lg"
                      loading={isSubmitting}
                      // Every item in the block needs an answer — there is no
                      // skip, and no partial submit.
                      disabled={!blockComplete || isSubmitting}
                      onClick={goNext}
                      trailingIcon={<ArrowRight size={18} strokeWidth={2.4} />}
                    >
                      {isLastScreen ? "Finish" : "Next"}
                    </Button>
                  </div>
                </div>
              )}

              {phase === "complete" && (
                <div className="overflow-y-auto flex-1 min-h-0">
                  <PlacementCompleteView
                    subjectCount={subjects.length}
                    totalItems={totalItems}
                    grade={grade}
                    board={board}
                    startedAt={startedAt}
                    completedAt={completedAt}
                    onContinue={finish}
                  />
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
