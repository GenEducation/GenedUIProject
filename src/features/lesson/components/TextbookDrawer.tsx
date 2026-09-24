"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Chunk, FigureGroup, PresentationManifest, Section, TeacherPayload } from "../types/lesson";
import { isAlreadyCoveredNote } from "../store/transcript";
import { joinPageBreaks, prettifyMath } from "../display";
import { FigureBlock } from "./FigureBlock";

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
    // The figure itself now renders as its own FigureBlock, interleaved by `after_chunk_id`
    // (see `figuresAfter` below) — a bare "figure" chunk carries no text worth showing on its own.
    return null;
  }
  return <p className="mb-3 text-[13.5px] leading-relaxed text-[#334155]">{text}</p>;
}

/** Every reference group keyed by the chunk it follows, in reading order — group(s) with no matching chunk
 * in the sections actually shown (e.g. `after_chunk_id` null, or pointing at a cached-elsewhere section)
 * fall back to a trailing "more from this page" list rather than being dropped. */
function groupsByChunk(groups: FigureGroup[]): { byChunk: Map<string, FigureGroup[]>; unplaced: FigureGroup[] } {
  const sorted = [...groups].sort((a, b) => a.reading_order - b.reading_order);
  const byChunk = new Map<string, FigureGroup[]>();
  const unplaced: FigureGroup[] = [];
  for (const group of sorted) {
    if (!group.after_chunk_id) {
      unplaced.push(group);
      continue;
    }
    const list = byChunk.get(group.after_chunk_id) ?? [];
    list.push(group);
    byChunk.set(group.after_chunk_id, list);
  }
  return { byChunk, unplaced };
}

interface TextbookDrawerProps {
  payload: TeacherPayload;
  /** Sections seen earlier this visit, for parts whose pages were already covered. */
  sectionCache: Record<string, Section>;
  manifest: PresentationManifest | null;
  onExpiredManifest: () => void;
  /** Figure groups already shown in the conversation — marked "discussed above" here rather than hidden,
   * so the textbook still reads as the complete page. */
  presentedGroupIds: ReadonlySet<string>;
  onClose: () => void;
  /** Asks the tutor to go over the earlier pages again, right from the empty state. */
  onAskTutor: () => void;
}

/** The textbook pages behind the current part: reference material the learner opens, not the task itself. */
export function TextbookDrawer({
  payload,
  sectionCache,
  manifest,
  onExpiredManifest,
  presentedGroupIds,
  onClose,
  onAskTutor,
}: TextbookDrawerProps) {
  const sections = payload.node.sections.map((section) =>
    isAlreadyCoveredNote(section) ? (sectionCache[section.version_id] ?? null) : section,
  );
  const shown = sections.filter((s): s is Section => s !== null);
  const coveredElsewhere = sections.length - shown.length;
  const { byChunk, unplaced } = groupsByChunk(payload.node.reference_groups);

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
              <div key={chunk.id}>
                <ChunkBlock chunk={chunk} />
                {(byChunk.get(chunk.id) ?? []).map((group) => (
                  <FigureBlock
                    key={group.id}
                    group={group}
                    manifest={manifest}
                    onExpired={onExpiredManifest}
                    discussedElsewhere={presentedGroupIds.has(group.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        ))}
        {unplaced.length > 0 && (
          <div className="mt-4">
            {shown.length > 0 && <h3 className="mb-2 text-[13px] font-bold text-[var(--primary-ink)]">More from this page</h3>}
            {unplaced.map((group) => (
              <FigureBlock
                key={group.id}
                group={group}
                manifest={manifest}
                onExpired={onExpiredManifest}
                discussedElsewhere={presentedGroupIds.has(group.id)}
              />
            ))}
          </div>
        )}
        {sections.length === 0 && unplaced.length === 0 && (
          <p className="text-sm text-[#94A3B8]">No textbook pages for this part.</p>
        )}
      </div>
    </aside>
  );
}
