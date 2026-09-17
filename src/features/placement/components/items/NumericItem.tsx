"use client";

import type { ItemWidgetProps } from "./itemProps";

/**
 * Numeric entry.
 *
 * Every *served* numeric item is `input: "integer"` and sends the bare number
 * in `value`. The single `input: "fraction"` item is held in reserve, but the
 * backend already grades the `{ text: "3/4" }` form, so it is handled here
 * rather than left to fail silently when the reserve bank starts serving.
 *
 * `block_spec.unit` (₹, m, cm²) is a label, not part of the answer — it is
 * rendered as an affix and never concatenated into what is sent.
 *
 * Hand-rolled rather than the shared `FIELD_CLASSNAME` (`fieldStyles.ts`):
 * that constant's vertical padding is fixed at 14px, shared by Select/
 * DatePicker/TimePicker elsewhere in the app, and this card needs a shorter
 * input to leave room for several questions on one screen.
 */
export function NumericItem({ item, value, onChange, disabled }: ItemWidgetProps) {
  const spec = item.block_spec as { input?: "integer" | "fraction"; unit?: string };
  const isFraction = spec.input === "fraction";
  const unit = spec.unit;

  const current = value
    ? "value" in value
      ? String(value.value)
      : "text" in value
        ? value.text
        : ""
    : "";

  const handle = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return onChange(null);
    if (isFraction) return onChange({ text: trimmed });
    const parsed = Number(trimmed);
    onChange(Number.isFinite(parsed) ? { value: parsed } : null);
  };

  return (
    <div className="flex items-center gap-2">
      {unit && (
        <span
          className="text-[14px] font-bold shrink-0"
          style={{ color: "var(--pl-ink-mid)" }}
          aria-hidden="true"
        >
          {unit}
        </span>
      )}
      <input
        type="text"
        // A numeric keypad on phones, but not type="number": its spinners and
        // scroll-to-change behaviour are a menace inside a graded form, and it
        // cannot hold the fraction form at all.
        inputMode={isFraction ? "text" : "numeric"}
        autoComplete="off"
        disabled={disabled}
        value={current}
        onChange={(e) => handle(e.target.value)}
        placeholder={isFraction ? "e.g. 3/4" : "Your answer"}
        aria-label={unit ? `Answer in ${unit}` : "Your answer"}
        className="w-full max-w-[200px] rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-all focus:outline-none focus:ring-2"
        style={{
          background: "var(--pl-surface)",
          borderColor: "var(--pl-border)",
          color: "var(--pl-ink)",
          // @ts-expect-error -- CSS custom property for the focus ring
          "--tw-ring-color": "var(--pl-ring)",
        }}
      />
    </div>
  );
}
