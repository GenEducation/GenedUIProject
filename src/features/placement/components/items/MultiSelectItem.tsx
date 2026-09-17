"use client";

import { ChoiceButton } from "./ChoiceButton";
import { langAttrs, type ItemWidgetProps } from "./itemProps";
import type { PlacementOption } from "../../types/placement";

/**
 * Multi-select. Grading is order-independent, so `selected` is kept in the
 * bank's own option order rather than click order — it makes the payload
 * stable and diffable without changing how it grades. Clearing the last
 * selection sends `null`, which leaves the Next button disabled rather than
 * submitting an empty answer.
 */
export function MultiSelectItem({ item, value, onChange, disabled }: ItemWidgetProps) {
  const options = (item.block_spec as { options?: PlacementOption[] }).options ?? [];
  const selected = value && "selected" in value ? value.selected : [];
  const { lang } = langAttrs(item);

  const toggle = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : options.filter((o) => o.id === id || selected.includes(o.id)).map((o) => o.id);
    onChange(next.length ? { selected: next } : null);
  };

  return (
    <div className="space-y-1.5">
      <p
        className="text-[10px] font-black uppercase tracking-widest"
        style={{ color: "var(--pl-ink-faint)" }}
      >
        Choose all that apply
      </p>
      <div className="grid gap-1.5">
        {options.map((option) => (
          <ChoiceButton
            key={option.id}
            shape="checkbox"
            selected={selected.includes(option.id)}
            disabled={disabled}
            lang={lang}
            onClick={() => toggle(option.id)}
          >
            {option.text}
          </ChoiceButton>
        ))}
      </div>
    </div>
  );
}
