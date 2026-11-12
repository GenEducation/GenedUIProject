"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { VisualReviewSummary } from "../../types/visuals";

interface RedrawTallyBarProps {
  summary: VisualReviewSummary;
  /**
   * Open the chapter's list of redraws. With it, "N ready to review" becomes the way in, and (when `showLink`)
   * a "See redraws" link follows while nothing is ready yet.
   */
  onShowRedraws?: () => void;
  /** The trailing "See redraws" link. Off where a Redraws tab sits right below, which would say the same. */
  showLink?: boolean;
  /**
   * Say that these counts are per picture, not per version. On where tabs below count every version of every
   * picture, so their numbers run higher than these.
   */
  explainCounts?: boolean;
}

// #122D30 at 65% on white is 4.7:1: the lightest ink that still meets WCAG AA for small text.
const LABEL =
  "text-[10px] font-black uppercase tracking-widest text-[#122D30]/65";

/**
 * Where the review of one chapter's visuals stands, at a glance:
 * "Pictures reviewed 42/50 · Accepted 30 · Rejected 12 · Sent for redraw 9
 * (6 drawing · 3 ready to review)". Counts picture slots, each at its newest
 * version: a slot whose redraw landed counts as to review again, so "reviewed"
 * can go down as redraws arrive.
 */
export function RedrawTallyBar({
  summary,
  onShowRedraws,
  showLink = true,
  explainCounts = false,
}: RedrawTallyBarProps) {
  const { targets, redraws } = summary;
  const total = Math.max(targets.total, 1);
  const running = redraws.queued + redraws.drawing;
  const readyAction = !!onShowRedraws && redraws.ready > 0;
  // Sums to "sent for redraw", so the parts explain the whole.
  const breakdown = [
    running ? `${running} drawing` : null,
    redraws.ready && !readyAction ? `${redraws.ready} ready to review` : null,
    redraws.failed ? `${redraws.failed} failed` : null,
    redraws.reviewed ? `${redraws.reviewed} reviewed` : null,
  ].filter(Boolean);
  const progressText =
    `${targets.reviewed} of ${targets.total} pictures reviewed: ${targets.accepted} accepted, ${targets.rejected} rejected` +
    (redraws.total ? `, ${redraws.total} sent for redraw` : "");

  return (
    <section
      aria-label="Review progress"
      className="rounded-2xl bg-white border border-[#122D30]/5 px-4 py-3 flex flex-col gap-2.5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <div className="flex flex-col gap-1.5 md:w-60 shrink-0">
          <p className="flex items-baseline justify-between gap-2">
            <span className={LABEL}>Pictures reviewed</span>
            <span className="text-sm font-black tabular-nums text-[#122D30]">
              {targets.reviewed}
              <span className="text-[#122D30]/65">/{targets.total}</span>
            </span>
          </p>
          <div
            role="progressbar"
            aria-label="Pictures reviewed"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={Math.min(targets.reviewed, total)}
            aria-valuetext={progressText}
            className="h-2 w-full rounded-full bg-[#122D30]/[0.07] overflow-hidden flex gap-px"
          >
            <span
              className="h-full bg-emerald-500 transition-[width] duration-500"
              style={{ width: `${(targets.accepted / total) * 100}%` }}
            />
            <span
              className="h-full bg-red-500 transition-[width] duration-500"
              style={{ width: `${(targets.rejected / total) * 100}%` }}
            />
          </div>
        </div>

        <dl className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-2">
          <Stat
            label="Accepted"
            value={targets.accepted}
            tone="text-emerald-700"
            swatch="bg-emerald-500"
          />
          <Stat
            label="Rejected"
            value={targets.rejected}
            tone={targets.rejected ? "text-red-700" : "text-[#122D30]"}
            swatch="bg-red-500"
          />
          <div className="flex items-baseline gap-2">
            <dt className={LABEL}>Sent for redraw</dt>
            <dd className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
              <span className="text-sm font-black tabular-nums text-[#075E63]">
                {redraws.total}
              </span>
              {breakdown.length > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#122D30]/70 tabular-nums">
                  {running > 0 && (
                    <Loader2
                      size={11}
                      className="animate-spin text-[#075E63]"
                      aria-hidden
                    />
                  )}
                  ({breakdown.join(" · ")})
                </span>
              )}
              {readyAction && (
                <Button
                  size="sm"
                  variant="tertiary"
                  trailingIcon={<ArrowRight size={13} />}
                  onClick={onShowRedraws}
                >
                  {redraws.ready} redrawn, ready to review
                </Button>
              )}
            </dd>
          </div>
        </dl>

        {showLink && onShowRedraws && !readyAction && redraws.total > 0 && (
          <Button
            size="sm"
            variant="tertiary"
            trailingIcon={<ArrowRight size={13} />}
            onClick={onShowRedraws}
          >
            See redraws
          </Button>
        )}
      </div>

      {explainCounts && (
        <p className="text-[11px] font-semibold text-[#122D30]/65">
          Counts each picture once, at its newest version. The tabs below count
          every version, so their numbers can be higher.
        </p>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
  swatch,
}: {
  label: string;
  value: number;
  tone: string;
  swatch: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className={`${LABEL} flex items-center gap-1.5`}>
        {/* Keys the bar's colours. */}
        <span className={`h-2 w-2 rounded-full ${swatch}`} aria-hidden />
        {label}
      </dt>
      <dd className={`text-sm font-black tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}
