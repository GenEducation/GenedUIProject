"use client";

export interface SegmentTab {
  value: string;
  label: string;
  count?: number;
  /**
   * The tab that asks for something (e.g. Pending). Its count wears citron
   * while there is anything in it — the screen's one citron moment.
   */
  highlight?: boolean;
}

/**
 * The quick split of a list by its most-used category (role, status). A row of
 * tabs with counts says at a glance what a dropdown hides behind a click.
 * Scrolls sideways on a phone instead of wrapping into a ragged block.
 */
export function SegmentedTabs({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: SegmentTab[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    // Inline, not a `[scrollbar-width:none]` utility: the global `* { scrollbar-width: thin }`
    // is unlayered, so it beats any Tailwind class however specific.
    <div className="-mx-1 overflow-x-auto px-1" style={{ scrollbarWidth: "none" }}>
      <div
        role="tablist"
        aria-label={label}
        className="inline-flex min-w-max gap-1 rounded-[12px] border border-border bg-paper p-[3px]"
      >
        {tabs.map((t) => {
          const active = t.value === value;
          return (
            <button
              key={t.value || "all"}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => onChange(t.value)}
              className={`inline-flex min-h-9 items-center gap-2 rounded-[9px] px-3 text-[12.5px] font-bold transition-all ${
                active
                  ? "bg-white text-ink shadow-[0_1px_3px_rgba(18,45,48,.10)]"
                  : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
              {t.count != null ? (
                <span
                  className={`rounded-full px-1.5 py-px text-[10.5px] tabular-nums ${
                    t.highlight && t.count
                      ? "bg-accent font-bold text-accent-ink"
                      : active
                        ? "bg-emerald text-white"
                        : "bg-ink/5 text-muted"
                  }`}
                >
                  {t.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
