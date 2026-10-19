"use client";

import { useState } from "react";
import { langAttrs, type ItemWidgetProps } from "./itemProps";
import { isDevanagari, transliterateToDevanagari } from "../../utils/hindiTransliteration";

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

  if (item.item_language === "hi") {
    return <HindiFillBlank current={current} onChange={onChange} disabled={disabled} />;
  }

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

/**
 * A Devanagari word typed with a Latin keyboard, converted live.
 *
 * Not every student has a Hindi keyboard set up on their device (or knows
 * how to switch to one) — this lets them type phonetically ("namaste") and
 * see it become the real word ("नमस्ते") as they go, without needing an OS
 * keyboard at all. Typing actual Devanagari (a student who *does* have a
 * native IME) still works: `isDevanagari` detects it and the field passes
 * that straight through without converting it a second time.
 *
 * Only the field's raw keystrokes are kept in local state; what's committed
 * to the store via `onChange` is always the converted Devanagari, since
 * that's the shape the wire contract expects (`{ text: string }`, same as
 * the English fill_blank).
 */
function HindiFillBlank({
  current,
  onChange,
  disabled,
}: {
  current: string;
  onChange: (response: { text: string } | null) => void;
  disabled?: boolean;
}) {
  const [raw, setRaw] = useState(current);
  const preview = raw && !isDevanagari(raw) ? transliterateToDevanagari(raw) : raw;

  return (
    <div className="space-y-1">
      <input
        type="text"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        disabled={disabled}
        value={raw}
        onChange={(e) => {
          const nextRaw = e.target.value;
          setRaw(nextRaw);
          const converted = nextRaw && !isDevanagari(nextRaw) ? transliterateToDevanagari(nextRaw) : nextRaw;
          onChange(converted.trim() ? { text: converted } : null);
        }}
        placeholder="Type in English letters, e.g. namaste"
        aria-label="Your answer, typed in English letters"
        className="w-full max-w-[280px] rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-all focus:outline-none focus:ring-2"
        style={{
          background: "var(--pl-surface)",
          borderColor: "var(--pl-border)",
          color: "var(--pl-ink)",
          // @ts-expect-error -- CSS custom property for the focus ring
          "--tw-ring-color": "var(--pl-ring)",
        }}
      />
      {raw && !isDevanagari(raw) && (
        <p
          lang="hi"
          className="m-0 text-[15px] font-semibold"
          style={{ color: "var(--pl-primary)" }}
          aria-live="polite"
        >
          {preview}
        </p>
      )}
    </div>
  );
}
