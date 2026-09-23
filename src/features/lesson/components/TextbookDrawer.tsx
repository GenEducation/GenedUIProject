"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Chunk, TeacherPayload } from "../types/lesson";

/** Chunk types that read as a callout rather than a plain paragraph. */
const CALLOUT_TYPES = new Set(["note", "summary", "worked_example"]);
const HEADING_TYPES = new Set(["chapter_heading", "section_heading", "subsection_heading"]);

function ChunkBlock({ chunk }: { chunk: Chunk }) {
  if (HEADING_TYPES.has(chunk.element_type)) {
    return <h3 className="mb-2 mt-5 text-[15px] font-bold text-[var(--primary-ink)] first:mt-0">{chunk.text}</h3>;
  }
  if (CALLOUT_TYPES.has(chunk.element_type)) {
    return (
      <div
        className="my-3 rounded-xl border-l-4 px-4 py-3 text-[13.5px] leading-relaxed"
        style={{ borderColor: "var(--primary)", background: "rgba(5,159,109,0.06)", color: "#1A202C" }}
      >
        {chunk.text}
      </div>
    );
  }
  if (chunk.element_type === "figure") {
    // The payload has no image URL yet; a labeled placeholder keeps the reading order.
    return (
      <div className="my-3 rounded-xl border border-dashed border-[#E2E8F0] px-4 py-6 text-center text-xs text-[#94A3B8]">
        Figure — {chunk.text || "not shown yet"}
      </div>
    );
  }
  return <p className="mb-3 text-[13.5px] leading-relaxed text-[#334155]">{chunk.text}</p>;
}

interface TextbookDrawerProps {
  payload: TeacherPayload;
  onClose: () => void;
}

/** The textbook pages behind the current part: reference material the learner opens, not the task itself. */
export function TextbookDrawer({ payload, onClose }: TextbookDrawerProps) {
  const sections = payload.node.sections;
  return (
    <aside className="flex h-full w-full flex-col border-l border-[rgba(4,46,92,0.06)] bg-white sm:w-[400px]">
      <div className="flex items-center justify-between border-b border-[rgba(4,46,92,0.06)] px-5 py-3.5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">Textbook</p>
          <p className="text-sm font-bold text-[var(--primary-ink)]">{payload.node.title}</p>
        </div>
        <Button iconOnly variant="tertiary" aria-label="Close textbook" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {sections.length === 0 ? (
          <p className="text-sm text-[#94A3B8]">No textbook pages for this part.</p>
        ) : (
          sections.map((section) => (
            <div key={section.id}>
              {section.chunks.map((chunk) => (
                <ChunkBlock key={chunk.id} chunk={chunk} />
              ))}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
