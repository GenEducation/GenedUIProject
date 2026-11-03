"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { VisualReviewSummary } from "../../types/visuals";

interface RedrawTallyBarProps {
  summary: VisualReviewSummary;
  /** Open the chapter's list of redraws; no link without it. */
  onShowRedraws?: () => void;
}

/**
 * Where the review of one chapter's visuals stands, at a glance:
 * "Reviewed 42/50 · Accepted 30 · Rejected 12 · Sent for redraw 9
 * (6 drawing · 3 ready)". A picture slot whose redraw landed counts as to
 * review again, so "reviewed" can go down as redraws arrive.
 */
export function RedrawTallyBar({ summary, onShowRedraws }: RedrawTallyBarProps) {
  const { targets, redraws } = summary;
  const total = Math.max(targets.total, 1);
  const running = redraws.queued + redraws.drawing;
  const breakdown = [
    running ? `${running} drawing` : null,
    redraws.ready ? `${redraws.ready} ready` : null,
    redraws.failed ? `${redraws.failed} failed` : null,
  ].filter(Boolean);

  return (
    <section
      aria-label="Review progress"
      className="rounded-2xl bg-white border border-[#122D30]/5 px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:gap-6"
    >
      <div className="flex flex-col gap-1.5 md:w-56 shrink-0">
        <p className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#122D30]/40">Reviewed</span>
          <span className="text-sm font-black tabular-nums text-[#122D30]">
            {targets.reviewed}
            <span className="text-[#122D30]/35">/{targets.total}</span>
          </span>
        </p>
        <div
          role="progressbar"
          aria-label="Pictures reviewed"
          aria-valuemin={0}
          aria-valuemax={targets.total}
          aria-valuenow={targets.reviewed}
          className="h-1.5 w-full rounded-full bg-[#122D30]/[0.06] overflow-hidden flex"
        >
          <span className="h-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${(targets.accepted / total) * 100}%` }} />
          <span className="h-full bg-red-400 transition-[width] duration-500" style={{ width: `${(targets.rejected / total) * 100}%` }} />
        </div>
      </div>

      <dl className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-2">
        <Stat label="Accepted" value={targets.accepted} tone="text-emerald-700" />
        <Stat label="Rejected" value={targets.rejected} tone={targets.rejected ? "text-red-700" : "text-[#122D30]"} />
        <div className="flex items-baseline gap-2">
          <dt className="text-[10px] font-black uppercase tracking-widest text-[#122D30]/40">Sent for redraw</dt>
          <dd className="flex items-baseline gap-1.5">
            <span className="text-sm font-black tabular-nums text-[#075E63]">{redraws.total}</span>
            {breakdown.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#122D30]/55 tabular-nums">
                {running > 0 && <Loader2 size={11} className="animate-spin text-[#075E63]" aria-hidden />}(
                {breakdown.join(" · ")})
              </span>
            )}
          </dd>
        </div>
      </dl>

      {onShowRedraws && redraws.total > 0 && (
        <Button size="sm" variant="tertiary" trailingIcon={<ArrowRight size={13} />} onClick={onShowRedraws}>
          See redraws
        </Button>
      )}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-[10px] font-black uppercase tracking-widest text-[#122D30]/40">{label}</dt>
      <dd className={`text-sm font-black tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}
