"use client";

import type { InstanceState } from "../types/lesson";

const NODE_TYPE_LABEL: Record<string, string> = {
  teach: "Learn",
  practice: "Practice",
  assess: "Assessment",
};

interface LessonHeaderProps {
  instance: InstanceState;
}

/** The breadcrumb + progress strip under the page's own header (PageHeader in page.tsx owns the back button and title). */
export function LessonHeader({ instance }: LessonHeaderProps) {
  const pct = instance.nodes_total > 0 ? Math.round((instance.nodes_done / instance.nodes_total) * 100) : 0;
  const node = instance.active_node;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-[rgba(4,46,92,0.06)] bg-white px-4 py-3 sm:px-8">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-bold uppercase tracking-wider text-[var(--tutor)]">
          {node ? NODE_TYPE_LABEL[node.type] ?? node.type : "Lesson"}
        </p>
        <h2 className="truncate text-base font-black text-[var(--primary-ink)]">{node?.title ?? "Lesson"}</h2>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <span className="text-xs font-semibold text-[#94A3B8]">
          {instance.nodes_done}/{instance.nodes_total}
        </span>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#EDEFF5] sm:w-32">
          <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
