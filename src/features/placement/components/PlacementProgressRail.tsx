"use client";

/**
 * One continuous progress bar across the whole form — "N of Total" — rather
 * than a segment per batch. A batch mixes 3–4 subjects across its cards and
 * carries no subject of its own, so there was never a meaningful "3 of 4 in
 * Mathematics" to show; a single bar keyed off the same `currentIndex`/
 * `totalItems` the store already tracks is simpler and reads the same way
 * the reference design's does, without inventing a second progress concept.
 */
export function PlacementProgressRail({
  currentIndex,
  totalItems,
}: {
  currentIndex: number;
  totalItems: number;
}) {
  if (!totalItems) return null;

  const shown = Math.min(currentIndex + 1, totalItems);
  const fill = shown / totalItems;

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--pl-surface)" }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalItems}
        aria-valuenow={currentIndex}
        aria-label={`Question ${shown} of ${totalItems}`}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${fill * 100}%`,
            background: "var(--pl-primary)",
            transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>
      <span className="text-[12px] font-semibold shrink-0" style={{ color: "var(--pl-ink-faint)" }}>
        {shown} of {totalItems}
      </span>
    </div>
  );
}
