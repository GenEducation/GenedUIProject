"use client";

import type { PlacementBlockSummary } from "../types/placement";

/**
 * The batch rail: one segment per batch, filled by how far through it the
 * student is.
 *
 * Built from `blocks`, which is frozen when the attempt is created and never
 * changes across resumes — so a rail built on the first call stays valid for
 * the life of the attempt.
 *
 * A batch mixes 3–4 subjects across its cards and carries no subject of its
 * own, so there is no "3 of 4 in Mathematics" label to show any more — the
 * segments are keyed by `block_index`, and the header names the batch number
 * instead of a subject.
 */
export function PlacementProgressRail({
  blocks,
  activeBlockIndex,
  answeredInActiveBlock,
  currentIndex,
  totalItems,
}: {
  blocks: PlacementBlockSummary[];
  /** `currentBlock.block_index` — which rail segment is the active one. */
  activeBlockIndex: number;
  /** How many items of the active batch are answered, including ones
   *  answered in an earlier session before it was resumed. */
  answeredInActiveBlock: number;
  currentIndex: number;
  totalItems: number;
}) {
  if (!blocks.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span
          className="text-[13px] font-bold"
          style={{ color: "var(--pl-primary)" }}
        >
          Batch {activeBlockIndex + 1} of {blocks.length}
        </span>
        <span className="text-[12px] font-semibold" style={{ color: "var(--pl-ink-faint)" }}>
          {Math.min(currentIndex + 1, totalItems)} of {totalItems}
        </span>
      </div>

      <div
        className="flex gap-1.5"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalItems}
        aria-valuenow={currentIndex}
        aria-label={`Question ${Math.min(currentIndex + 1, totalItems)} of ${totalItems}`}
      >
        {blocks.map((block) => {
          const isPast = block.block_index < activeBlockIndex;
          const isActive = block.block_index === activeBlockIndex;
          const fill = isPast ? 1 : isActive ? answeredInActiveBlock / block.item_count : 0;

          return (
            <div
              key={block.block_index}
              className="h-2 rounded-full overflow-hidden"
              style={{ flexGrow: block.item_count, background: "var(--pl-surface)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${fill * 100}%`,
                  background: isActive ? "var(--pl-accent)" : "var(--pl-primary)",
                  transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
