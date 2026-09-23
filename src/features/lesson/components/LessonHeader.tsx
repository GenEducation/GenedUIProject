"use client";

import type { InstanceState } from "../types/lesson";

interface LessonHeaderProps {
  chapterTitle: string;
  instance: InstanceState;
}

export function LessonHeader({ chapterTitle, instance }: LessonHeaderProps) {
  const pct = instance.nodes_total > 0 ? Math.round((instance.nodes_done / instance.nodes_total) * 100) : 0;
  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <div>
        <h1 className="text-sm font-semibold text-slate-800">{chapterTitle}</h1>
        <p className="text-xs text-slate-500">
          {instance.nodes_done} of {instance.nodes_total} parts done
        </p>
      </div>
      <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
