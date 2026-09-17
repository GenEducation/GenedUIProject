"use client";

import { langAttrs, type ItemWidgetProps } from "./itemProps";

/**
 * Single-word fill-in.
 *
 * The bank accepts several wordings where it allows them ("but" or "yet"), and
 * comparison ignores case and surrounding whitespace — so what the student
 * typed is sent through verbatim. Don't lowercase, trim or spell-correct on
 * the way out: it changes nothing about grading and only hides what they
 * actually wrote from item statistics. The trim below is a has-the-student-
 * answered check, not a transform.
 *
 * Hand-rolled rather than the shared `FIELD_CLASSNAME` — see NumericItem.tsx
 * for why: several questions render on one screen here, and that constant's
 * padding is sized for a single full-page field.
 */
export function FillBlankItem({ item, value, onChange, disabled }: ItemWidgetProps) {
  const current = value && "text" in value ? value.text : "";
  const { lang } = langAttrs(item);

  return (
    <input
      type="text"
      autoComplete="off"
      autoCapitalize="none"
      spellCheck={false}
      disabled={disabled}
      lang={lang}
      value={current}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw.trim() ? { text: raw } : null);
      }}
      placeholder="Type your answer"
      aria-label="Your answer"
      className="w-full max-w-[280px] rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-all focus:outline-none focus:ring-2"
      style={{
        background: "var(--pl-surface)",
        borderColor: "var(--pl-border)",
        color: "var(--pl-ink)",
        // @ts-expect-error -- CSS custom property for the focus ring
        "--tw-ring-color": "var(--pl-ring)",
      }}
    />
  );
}
