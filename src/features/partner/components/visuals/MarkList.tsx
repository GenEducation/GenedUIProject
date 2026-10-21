"use client";

import { Crop, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { INSTRUCTION_MAX, QUICK_ACTIONS, cropWords, orderedMarks, whereOnPicture, type Mark } from "./markup";

interface MarkListProps {
  marks: Mark[];
  /** The parts of the picture its spec names; empty hides "Which part?". */
  parts: string[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<Pick<Mark, "part" | "instruction">>) => void;
  onRemove: (id: string) => void;
}

/** One row per mark, numbered as in the note: where it is, which part, what to do. */
export function MarkList({ marks, parts, activeId, onSelect, onChange, onRemove }: MarkListProps) {
  const ordered = orderedMarks(marks);
  if (ordered.length === 0) return null;
  const partOptions = [{ value: "", label: "Which part? (optional)" }, ...parts.map((p) => ({ value: p, label: p.replace(/^the /, "") }))];

  return (
    <ol aria-label="Changes marked on the picture" className="flex flex-col gap-2">
      {ordered.map((m, i) => {
        const active = m.id === activeId;
        return (
          <li
            key={m.id}
            onFocusCapture={() => onSelect(m.id)}
            className={`rounded-xl border px-3 py-3 transition-colors ${active ? "border-[#075E63]/40 bg-white" : "border-[#122D30]/10 bg-[#FBFAF5]"}`}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#075E63] text-[11px] font-black text-white">
                {m.kind === "crop" ? <Crop size={12} aria-hidden /> : i + 1}
              </span>
              <p className="min-w-0 flex-1 text-xs font-black text-[#122D30]">
                {m.kind === "crop" ? "Crop to this area" : `Change ${i + 1}`}
                <span className="ml-1.5 font-bold text-[#122D30]/45">{m.kind === "crop" ? cropWords(m.box) : whereOnPicture(m.box)}</span>
              </p>
              <Button iconOnly size="sm" variant="tertiary" aria-label={`Remove ${m.kind === "crop" ? "the crop" : `change ${i + 1}`}`} onClick={() => onRemove(m.id)}>
                <Trash2 size={14} />
              </Button>
            </div>

            <div className="mt-2.5 flex flex-col gap-2 pl-[34px]">
              {parts.length > 0 && (
                <Select
                  aria-label={`Which part, ${m.kind === "crop" ? "crop" : `change ${i + 1}`}`}
                  placeholder="Which part? (optional)"
                  accentColor="#122D30"
                  value={m.part}
                  onChange={(next) => onChange(m.id, { part: next })}
                  options={partOptions}
                />
              )}
              {m.kind === "change" && (
                <div className="flex flex-wrap gap-1.5" aria-label="Quick actions">
                  {QUICK_ACTIONS.map((a) => (
                    <Button
                      key={a.label}
                      size="sm"
                      pill
                      variant={m.instruction.trim() === a.text.trim() ? "primary" : "outline"}
                      onClick={() => onChange(m.id, { instruction: a.text })}
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>
              )}
              <input
                type="text"
                value={m.instruction}
                maxLength={INSTRUCTION_MAX}
                onChange={(e) => onChange(m.id, { instruction: e.target.value.slice(0, INSTRUCTION_MAX) })}
                aria-label={m.kind === "crop" ? "Anything else about the crop" : `What to do, change ${i + 1}`}
                placeholder={m.kind === "crop" ? "Anything else? (optional)" : "What should change here?"}
                className="w-full rounded-xl border border-[#122D30]/10 bg-white px-3 py-2 text-[13px] text-[#122D30] outline-none placeholder:text-[#122D30]/30 focus:border-[#122D30]/40"
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
