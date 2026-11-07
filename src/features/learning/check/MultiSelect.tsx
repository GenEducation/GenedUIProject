"use client";

import type { CheckItem } from "../types";
import { useUiText } from "../i18n";

/**
 * Multiple select: every option is a real checkbox, so Tab moves between them and Space chooses, with no pointer needed; the
 * group is named by the question and says that several may be chosen. Tap targets are the whole row.
 */
export function MultiSelect({
  check,
  chosen,
  onChange,
  disabled = false,
}: {
  check: CheckItem;
  chosen: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const t = useUiText();
  const toggle = (id: string) => onChange(chosen.includes(id) ? chosen.filter((c) => c !== id) : [...chosen, id]);
  return (
    <fieldset className="mt-4 min-w-0 border-0 p-0" aria-labelledby={`check-${check.id}`} disabled={disabled}>
      <legend className="lesson-hand mb-2 text-[16px] text-[var(--ls-ink-mid)]">{t("chooseAll")}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {check.options.map((option) => (
          <label
            key={option.id}
            className={`lesson-sketch-sm lesson-hand flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2.5 text-[18px] transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-[var(--ls-primary)] ${
              chosen.includes(option.id) ? "bg-[var(--ls-accent)] font-bold" : "hover:bg-[var(--ls-primary-soft)]"
            }`}
          >
            <input
              type="checkbox"
              checked={chosen.includes(option.id)}
              onChange={() => toggle(option.id)}
              className="size-5 shrink-0 accent-[var(--ls-primary)]"
            />
            <span>{option.text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
