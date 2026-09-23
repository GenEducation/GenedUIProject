"use client";

import { Button } from "@/components/ui/Button";
import type { AnswerResponse, Chunk, InstanceState, TeacherPayload } from "../types/lesson";
import { CheckCard } from "./CheckCard";

interface LessonPanelProps {
  instance: InstanceState;
  payload: TeacherPayload;
  isSending: boolean;
  onAnswer: (itemId: string, response: AnswerResponse, latencyMs: number) => void;
  onHint: (itemId: string) => void;
  onDone: () => void;
}

/** Chunk types that read as a callout rather than a plain paragraph — mirrors the boxed "Key Properties" style. */
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
    // No image URL on the payload today — a labeled placeholder keeps the
    // reading order intact rather than silently dropping the figure.
    return (
      <div className="my-3 rounded-xl border border-dashed border-[#E2E8F0] px-4 py-6 text-center text-xs text-[#94A3B8]">
        Figure — {chunk.text || "not shown yet"}
      </div>
    );
  }
  return <p className="mb-3 text-[13.5px] leading-relaxed text-[#334155]">{chunk.text}</p>;
}

export function LessonPanel({ instance, payload, isSending, onAnswer, onHint, onDone }: LessonPanelProps) {
  const node = payload.node;
  const activeNode = instance.active_node;
  if (!activeNode) return null;

  const unanswered = node.check_items.filter((c) => !activeNode.answered_item_ids.includes(c.id));
  const engagementMet = activeNode.engagement_count >= activeNode.engagement_required;
  const checksMet = node.check_items.length === 0 || unanswered.length === 0;
  const canFinish = node.type === "teach" ? engagementMet : checksMet;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-8">
      {node.sections.length > 0 && (
        <article className="rounded-2xl border border-[rgba(4,46,92,0.06)] bg-white p-5 shadow-[0_1px_3px_rgba(4,46,92,0.04)]">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">From the textbook</p>
          {node.sections.map((section) => (
            <div key={section.id}>
              {section.chunks.map((chunk) => (
                <ChunkBlock key={chunk.id} chunk={chunk} />
              ))}
            </div>
          ))}
        </article>
      )}

      {node.type === "teach" && (
        <div className="rounded-2xl border border-[rgba(4,46,92,0.06)] bg-white p-4">
          <div className="mb-1.5 flex justify-between text-xs font-semibold text-[#94A3B8]">
            <span>Engagement</span>
            <span>
              {activeNode.engagement_count} / {activeNode.engagement_required}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#EDEFF5]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (activeNode.engagement_count / Math.max(1, activeNode.engagement_required)) * 100)}%`,
                background: "var(--primary)",
              }}
            />
          </div>
        </div>
      )}

      {node.check_items.length > 0 && (
        <div className="flex flex-col gap-3">
          {node.check_items.map((check, i) => (
            <CheckCard
              key={check.id}
              check={check}
              ordinal={i + 1}
              total={node.check_items.length}
              disabled={isSending || activeNode.answered_item_ids.includes(check.id)}
              onSubmit={(response, latencyMs) => onAnswer(check.id, response, latencyMs)}
              onHint={() => onHint(check.id)}
            />
          ))}
        </div>
      )}

      <Button fullWidth disabled={!canFinish} onClick={onDone}>
        {node.type === "teach" ? "I'm ready to move on" : "Done with this part"}
      </Button>
    </div>
  );
}
