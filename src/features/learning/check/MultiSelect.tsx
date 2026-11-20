"use client";

import type { CheckItem } from "../types";
import { useUiText } from "../i18n";
import { twoColumns } from "./SingleChoice";
import { ChoiceMark, choiceState, type ChoiceTone } from "./ChoiceTile";

/**
 * Multiple select: every option is a real checkbox (visually hidden, drawn as a square mark), so Tab moves between them and Space
 * chooses, with no pointer needed; the group is named by the question and says that several may be chosen. The whole row is the
 * tap target. `tone` marks the chosen options after a check the learner should change.
 */
export function MultiSelect({
  check,
  chosen,
  onChange,
  tone = null,
  disabled = false,
}: {
  check: CheckItem;
  chosen: string[];
  onChange: (ids: string[]) => void;
  tone?: ChoiceTone;
  disabled?: boolean;
}) {
  const t = useUiText();
  const toggle = (id: string) => onChange(chosen.includes(id) ? chosen.filter((c) => c !== id) : [...chosen, id]);
  return (
    <fieldset className="mt-4 min-w-0 border-0 p-0" aria-labelledby={`check-${check.id}`} disabled={disabled}>
      <legend className="lesson-hand mb-2 text-[16px] text-[var(--ls-ink-mid)]">{t("chooseAll")}</legend>
      <div className={`grid gap-2 ${twoColumns(check.options)}`}>
        {check.options.map((option) => {
          const on = chosen.includes(option.id);
          return (
            <label
              key={option.id}
              {...choiceState(on, tone)}
              className="lesson-choice lesson-sketch-sm lesson-hand relative focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--ls-ring)]"
            >
              <input type="checkbox" checked={on} onChange={() => toggle(option.id)} className="sr-only" />
              <ChoiceMark kind="check" checked={on} />
              <span className="min-w-0 flex-1">{option.text}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
