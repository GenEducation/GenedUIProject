"use client";

import { Button } from "@/components/ui/Button";
import type { AnswerResponse, InstanceState, TeacherPayload } from "../types/lesson";
import { CheckCard } from "./CheckCard";

interface LessonPanelProps {
  instance: InstanceState;
  payload: TeacherPayload;
  isSending: boolean;
  onAnswer: (itemId: string, response: AnswerResponse, latencyMs: number) => void;
  onHint: (itemId: string) => void;
  onDone: () => void;
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
    <div className="flex h-full flex-col gap-4 overflow-y-auto border-l border-slate-200 bg-slate-50 p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{node.type}</p>
        <h2 className="text-base font-semibold text-slate-800">{node.title}</h2>
      </div>

      {node.type === "teach" && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>Engagement</span>
            <span>
              {activeNode.engagement_count} / {activeNode.engagement_required}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${Math.min(100, (activeNode.engagement_count / Math.max(1, activeNode.engagement_required)) * 100)}%` }}
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

      <Button className="mt-auto" fullWidth disabled={!canFinish} onClick={onDone}>
        {node.type === "teach" ? "I'm ready to move on" : "Done with this part"}
      </Button>
    </div>
  );
}
