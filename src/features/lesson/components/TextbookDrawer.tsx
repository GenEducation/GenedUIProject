"use client";

import { ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Chunk, Section, TeacherPayload } from "../types/lesson";
import { isAlreadyCoveredNote } from "../store/transcript";
import { joinPageBreaks, prettifyMath } from "../display";

/** Chunk types that read as a callout rather than a plain paragraph. */
const CALLOUT_TYPES = new Set(["note", "summary", "worked_example"]);
const HEADING_TYPES = new Set(["chapter_heading", "section_heading", "subsection_heading"]);

function ChunkBlock({ chunk }: { chunk: Chunk }) {
  const text = prettifyMath(chunk.text);
  if (HEADING_TYPES.has(chunk.element_type)) {
    return <h3 className="mb-2 mt-5 text-[15px] font-bold text-[var(--primary-ink)] first:mt-0">{text}</h3>;
  }
  if (CALLOUT_TYPES.has(chunk.element_type)) {
    return (
      <div
        className="my-3 rounded-xl border-l-4 px-4 py-3 text-[13.5px] leading-relaxed"
        style={{ borderColor: "var(--primary)", background: "rgba(5,159,109,0.06)", color: "#1A202C" }}
      >
        {text}
      </div>
    );
  }
  if (chunk.element_type === "equation") {
    return <p className="my-2 rounded-lg bg-[#F7F8FC] px-3 py-2 font-medium tabular-nums text-[var(--primary-ink)]">{text}</p>;
  }
  if (chunk.element_type === "figure") {
    // Images are not served to learners yet; the figure's description (read from the page
    // at ingestion) is shown instead, so "as shown in the picture" still has something to point at.
    return (
      <div className="my-3 flex gap-3 rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] px-4 py-3 text-[13px] leading-relaxed text-[#475569]">
        <ImageIcon size={16} className="mt-0.5 flex-shrink-0 text-[#94A3B8]" />
        <span>
          <span className="font-semibold text-[#64748B]">Picture: </span>
          {text || "a picture from the textbook"}
        </span>
      </div>
    );
  }
  return <p className="mb-3 text-[13.5px] leading-relaxed text-[#334155]">{text}</p>;
}

interface TextbookDrawerProps {
  payload: TeacherPayload;
  /** Sections seen earlier this visit, for parts whose pages were already covered. */
  sectionCache: Record<string, Section>;
  onClose: () => void;
  /** Asks the tutor to go over the earlier pages again, right from the empty state. */
  onAskTutor: () => void;
}

/** The textbook pages behind the current part: reference material the learner opens, not the task itself. */
export function TextbookDrawer({ payload, sectionCache, onClose, onAskTutor }: TextbookDrawerProps) {
  const sections = payload.node.sections.map((section) =>
    isAlreadyCoveredNote(section) ? (sectionCache[section.version_id] ?? null) : section,
  );
  const shown = sections.filter((s): s is Section => s !== null);
  const coveredElsewhere = sections.length - shown.length;

  return (
    <aside className="flex h-full w-full flex-col border-l border-[rgba(4,46,92,0.06)] bg-white sm:w-[400px]">
      <div className="flex items-center justify-between border-b border-[rgba(4,46,92,0.06)] px-5 py-3.5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">Textbook</p>
          <p className="truncate text-sm font-bold text-[var(--primary-ink)]">{payload.node.title}</p>
        </div>
        <Button iconOnly variant="tertiary" aria-label="Close textbook" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {coveredElsewhere > 0 && (
          <div className="mb-4 rounded-xl bg-[#F7F8FC] px-4 py-3 text-[13px] text-[#64748B]">
            <p>
              {shown.length > 0
                ? "Some of these pages came up in an earlier part of the chapter."
                : "This part uses textbook pages from an earlier part of the chapter."}
            </p>
            {shown.length === 0 && (
              <Button size="sm" className="mt-2.5" onClick={onAskTutor}>
                Ask my tutor to go over it again
              </Button>
            )}
          </div>
        )}
        {shown.map((section) => (
          <div key={section.id}>
            {joinPageBreaks(section.chunks).map((chunk) => (
              <ChunkBlock key={chunk.id} chunk={chunk} />
            ))}
          </div>
        ))}
        {sections.length === 0 && <p className="text-sm text-[#94A3B8]">No textbook pages for this part.</p>}
      </div>
    </aside>
  );
}
