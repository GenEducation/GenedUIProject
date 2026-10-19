"use client";

import { ChoiceButton } from "./ChoiceButton";
import { langAttrs, type ItemWidgetProps } from "./itemProps";
import type { PlacementOption } from "../../types/placement";

/**
 * Single-choice. 90 of the 127 served items are this type — it carries the form.
 * Sends the option *id*, never its display text.
 */
export function McqItem({ item, value, onChange, disabled }: ItemWidgetProps) {
  const options = (item.block_spec as { options?: PlacementOption[] }).options ?? [];
  const selected = value && "choice" in value ? value.choice : null;
  const { lang } = langAttrs(item);

  return (
    <div className="grid gap-1.5" role="radiogroup" aria-label="Answer options">
      {options.map((option) => (
        <ChoiceButton
          key={option.id}
          selected={selected === option.id}
          disabled={disabled}
          lang={lang}
          onClick={() => onChange({ choice: option.id })}
        >
          {option.text}
        </ChoiceButton>
      ))}
    </div>
  );
}
