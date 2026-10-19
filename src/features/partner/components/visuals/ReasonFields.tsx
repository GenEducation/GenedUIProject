"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { NOTE_MAX, REASON_CODES, REASON_LABELS, type ReasonCode } from "../../types/visuals";

interface ReasonFieldsProps {
  reasons: ReasonCode[];
  onReasonsChange: (next: ReasonCode[]) => void;
  note: string;
  onNoteChange: (next: string) => void;
}

/** Reject / regenerate reasons: multi-select chips (≥ 1 required by the caller) and an optional note. */
export function ReasonFields({ reasons, onReasonsChange, note, onNoteChange }: ReasonFieldsProps) {
  const noteId = useId();
  const hintId = useId();

  const toggle = (code: ReasonCode) =>
    onReasonsChange(reasons.includes(code) ? reasons.filter((r) => r !== code) : [...reasons, code]);

  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="text-[10px] font-black text-[#1A3D2C]/50 uppercase tracking-widest mb-2">
          What&apos;s wrong? <span className="normal-case tracking-normal font-bold">(pick at least one)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {REASON_CODES.map((code) => {
            const on = reasons.includes(code);
            return (
              <Button
                key={code}
                size="sm"
                pill
                variant={on ? "primary" : "outline"}
                aria-pressed={on}
                onClick={() => toggle(code)}
              >
                {REASON_LABELS[code]}
              </Button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <label htmlFor={noteId} className="text-[10px] font-black text-[#1A3D2C]/50 uppercase tracking-widest">
            Note <span className="normal-case tracking-normal font-bold">(optional)</span>
          </label>
          <span
            className={`text-[10px] font-bold tabular-nums ${note.length >= NOTE_MAX ? "text-red-500" : "text-[#1A3D2C]/40"}`}
            aria-live="polite"
          >
            {note.length}/{NOTE_MAX}
          </span>
        </div>
        <textarea
          id={noteId}
          value={note}
          maxLength={NOTE_MAX}
          rows={3}
          aria-describedby={hintId}
          onChange={(e) => onNoteChange(e.target.value.slice(0, NOTE_MAX))}
          placeholder="What should the new picture do differently?"
          className="w-full px-3 py-2 bg-[#F8F9F8] border border-[#1A3D2C]/10 focus:border-[#1A3D2C]/40 rounded-xl text-sm text-[#1A3D2C] outline-none placeholder:text-[#1A3D2C]/30 resize-none"
        />
        <p id={hintId} className="mt-1 text-[11px] text-[#1A3D2C]/50">
          Don&apos;t include names or personal details. This note is used to improve the picture.
        </p>
      </div>
    </div>
  );
}
