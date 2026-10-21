"use client";

import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { markLine, orderedMarks, type Mark } from "./markup";

/** What the marks on the picture will say in the remake request, word for word, with a way back to edit them. */
export function MarksPreview({ marks, onEdit }: { marks: Mark[]; onEdit?: () => void }) {
  if (marks.length === 0) return null;
  const lines = orderedMarks(marks).map((m, i) => markLine(m, i + 1).replace(/^\d+\.\s*/, ""));
  return (
    <section aria-label="Sent with this remake" className="rounded-xl border border-[#075E63]/15 bg-[#DCEBE7]/40 px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#122D30]/55">
          Sent with this remake · {marks.length === 1 ? "1 change" : `${marks.length} changes`}
        </p>
        {onEdit && (
          <Button size="sm" variant="tertiary" leadingIcon={<PenLine size={13} />} onClick={onEdit}>
            Edit marks
          </Button>
        )}
      </div>
      <ol className="mt-2 flex flex-col gap-1.5">
        {lines.map((line, i) => (
          <li key={i} className="flex items-start gap-2 text-[12.5px] leading-snug text-[#122D30]">
            <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#075E63] text-[9px] font-black text-white">
              {i + 1}
            </span>
            <span className="min-w-0">{line}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
