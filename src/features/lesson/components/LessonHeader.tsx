"use client";

import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { InstanceState } from "../types/lesson";

const NODE_TYPE_LABEL: Record<string, string> = {
  teach: "Learn",
  practice: "Practice",
  assess: "Check yourself",
};

interface LessonHeaderProps {
  instance: InstanceState;
  textbookOpen: boolean;
  onToggleTextbook: () => void;
}

/** Where the learner is in the chapter, under the page's own PageHeader, with the one secondary action: the textbook. */
export function LessonHeader({ instance, textbookOpen, onToggleTextbook }: LessonHeaderProps) {
  const pct = instance.nodes_total > 0 ? Math.round((instance.nodes_done / instance.nodes_total) * 100) : 0;
  const node = instance.active_node;
  const partNumber = Math.min(instance.nodes_done + 1, instance.nodes_total);

  return (
    <div className="border-b border-[rgba(4,46,92,0.06)] bg-white px-4 py-3 sm:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-wider text-[var(--tutor)]">
            Part {partNumber} of {instance.nodes_total}
            {node && ` · ${NODE_TYPE_LABEL[node.type] ?? node.type}`}
          </p>
          <h2 className="truncate text-base font-black text-[var(--primary-ink)]">{node?.title ?? "Lesson"}</h2>
        </div>
        <Button
          size="sm"
          variant={textbookOpen ? "secondary" : "outline"}
          leadingIcon={<BookOpen size={15} />}
          onClick={onToggleTextbook}
        >
          Textbook
        </Button>
      </div>
      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[#EDEFF5]">
        <div className="h-full rounded-full bg-[var(--primary)] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
