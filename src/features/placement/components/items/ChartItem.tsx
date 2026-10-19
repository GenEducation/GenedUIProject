"use client";

import { langAttrs, type ItemWidgetProps } from "./itemProps";
import type { PlacementChartBar } from "../../types/placement";

/**
 * A clickable bar chart, filling the `visual` slot. Markup mirrors the chat
 * side's `Chart.tsx` bar rendering (flex row of buttons, height scaled to the
 * tallest value) but retokenised to `--pl-*` and wired to the plain
 * `ItemWidgetProps` contract — no `useInteractiveAnswer`/`InteractiveShell`,
 * that machinery is chat-specific.
 *
 * Single-select: clicking a bar replaces the current selection, same as a
 * radio `ChoiceButton`. The response shape (`{selected: [id]}`) is the same
 * envelope `multi_select` uses, just always length-1 here.
 */
export function ChartItem({ item, value, onChange, disabled }: ItemWidgetProps) {
  const spec = item.block_spec as {
    data?: PlacementChartBar[];
    y_label?: string;
    target_label?: string;
  };
  const data = spec.data ?? [];
  const selectedId = value && "selected" in value ? value.selected[0] : undefined;
  const maxVal = Math.max(1, ...data.map((d) => d.value));
  const { lang } = langAttrs(item);

  return (
    <div className="space-y-1.5">
      {spec.target_label && (
        <p
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: "var(--pl-ink-faint)" }}
        >
          {spec.target_label}
        </p>
      )}
      <div
        className="flex items-end gap-3 px-1"
        style={{ height: 140 }}
      >
        {data.map((bar) => {
          const on = bar.id === selectedId;
          return (
            // eslint-disable-next-line no-restricted-syntax -- a chart bar is a custom-shaped hit target (variable height, value+label stacked around it), not something the shared Button's variants model.
            <button
              key={bar.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${bar.label}: ${bar.value}`}
              disabled={disabled}
              onClick={() => onChange({ selected: [bar.id] })}
              className="flex flex-col items-center justify-end gap-1 flex-1 h-full bg-transparent border-none p-0 focus-visible:outline-none focus-visible:ring-2 rounded"
              style={{
                cursor: disabled ? "default" : "pointer",
                // @ts-expect-error -- CSS custom property for the focus ring
                "--tw-ring-color": "var(--pl-ring)",
              }}
            >
              <span className="text-[11px] font-semibold" style={{ color: on ? "var(--pl-primary)" : "var(--pl-ink-mid)" }}>
                {bar.value}
              </span>
              <div
                className="w-full max-w-[52px] rounded-t-md transition-colors"
                style={{
                  height: `${(bar.value / maxVal) * 100}px`,
                  background: on ? "var(--pl-primary)" : "var(--pl-surface)",
                }}
              />
              <span className="text-[12px] font-medium leading-snug text-center" style={{ color: "var(--pl-ink)" }} lang={lang}>
                {bar.label}
              </span>
            </button>
          );
        })}
      </div>
      {spec.y_label && (
        <p className="text-[10px]" style={{ color: "var(--pl-ink-faint)" }}>
          {spec.y_label}
        </p>
      )}
    </div>
  );
}
