"use client";

import { ChoiceButton } from "./ChoiceButton";
import { langAttrs, type ItemWidgetProps } from "./itemProps";

/**
 * True/false. `block_spec.statement` restates the claim the prompt sets up, so
 * it is shown as the thing being judged rather than folded into the prompt.
 */
export function TrueFalseItem({ item, value, onChange, disabled }: ItemWidgetProps) {
  const statement = (item.block_spec as { statement?: string }).statement ?? "";
  const selected = value && "choice" in value ? value.choice : null;
  const { lang } = langAttrs(item);

  return (
    <div className="space-y-2.5">
      {statement && (
        <p
          lang={lang}
          className="text-[13px] font-semibold leading-snug rounded-lg p-2.5"
          style={{ background: "var(--pl-surface)", color: "var(--pl-ink)" }}
        >
          {statement}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="True or false">
        {(["true", "false"] as const).map((choice) => (
          <ChoiceButton
            key={choice}
            selected={selected === choice}
            disabled={disabled}
            onClick={() => onChange({ choice })}
          >
            {choice === "true" ? "True" : "False"}
          </ChoiceButton>
        ))}
      </div>
    </div>
  );
}
