"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { enterToSubmit } from "@/utils/enterToSubmit";
import { NOTE_MAX, REASON_CODES, REASON_LABELS, type ReasonCode } from "../../types/visuals";

interface ReasonFieldsProps {
  reasons: ReasonCode[];
  onReasonsChange: (next: ReasonCode[]) => void;
  note: string;
  onNoteChange: (next: string) => void;
  /** Characters of the note the marks on the picture already use (they're sent first, in the same note). */
  reserved?: number;
  /** Enter in the note sends the form (Shift+Enter or Ctrl+Enter for a new line). The caller checks it can. */
  onSubmit?: () => void;
}

/** Reject / regenerate reasons: multi-select chips (≥ 1 required by the caller) and an optional note. */
export function ReasonFields({ reasons, onReasonsChange, note, onNoteChange, reserved = 0, onSubmit }: ReasonFieldsProps) {
  const noteId = useId();
  const hintId = useId();

  // The marks and the note share one limit: the note gets what the marks leave.
  const room = Math.max(0, NOTE_MAX - reserved);
  const used = reserved + note.length;

  const toggle = (code: ReasonCode) =>
    onReasonsChange(reasons.includes(code) ? reasons.filter((r) => r !== code) : [...reasons, code]);

  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="text-[10px] font-black text-[#122D30]/50 uppercase tracking-widest mb-2">
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
          <label htmlFor={noteId} className="text-[10px] font-black text-[#122D30]/50 uppercase tracking-widest">
            Note <span className="normal-case tracking-normal font-bold">(optional)</span>
          </label>
          <span
            className={`text-[10px] font-bold tabular-nums ${used >= NOTE_MAX ? "text-red-500" : "text-[#122D30]/40"}`}
            aria-live="polite"
          >
            {reserved > 0 && <span className="mr-1 font-medium">incl. marks</span>}
            {used}/{NOTE_MAX}
          </span>
        </div>
        <textarea
          id={noteId}
          value={note}
          maxLength={room}
          rows={3}
          aria-describedby={hintId}
          onChange={(e) => onNoteChange(e.target.value.slice(0, room))}
          onKeyDown={onSubmit ? enterToSubmit(onSubmit) : undefined}
          placeholder="What should the new picture do differently?"
          className="w-full px-3 py-2 bg-[#F6F7F2] border border-[#122D30]/10 focus:border-[#122D30]/40 rounded-xl text-sm text-[#122D30] outline-none placeholder:text-[#122D30]/30 resize-none"
        />
        <p id={hintId} className="mt-1 text-[11px] text-[#122D30]/50">
          Don&apos;t include names or personal details. This note is used to improve the picture.
          {onSubmit && <span className="ml-1 text-[#122D30]/40">Enter to send, Shift+Enter for a new line.</span>}
        </p>
      </div>
    </div>
  );
}
