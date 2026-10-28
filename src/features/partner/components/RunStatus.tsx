"use client";

import React from "react";
import type { Subject } from "../store/usePartnerStore";
import { NEXT_STEP_COPY, checkLabel, elapsed } from "../utils/ingestionPath";
import { nowLine, runPhases, type Phase } from "../utils/ingestionPhases";
import { shownPercent } from "../utils/ingestionProgress";

/** A running chapter whose worker has said nothing for this long is probably lost. */
export const STALE_AFTER_MS = 10 * 60 * 1000;

/** "No update since 10:42" when a running run's last report is older than `STALE_AFTER_MS`; null otherwise. */
export function staleLine(state: Subject["state"], progress: Subject["progress"], now = Date.now()): string | null {
  if (state !== "running" || !progress?.updated_at) return null;
  const last = Date.parse(progress.updated_at);
  if (Number.isNaN(last) || now - last <= STALE_AFTER_MS) return null;
  return `No update since ${new Date(last).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

/** A phase's segment of the bar: full when done, part-filled while it runs, red where a run stopped. */
function Segment({ phase, queued }: { phase: Phase; queued: boolean }) {
  const color = phase.status === "stopped" ? "bg-red-400" : phase.status === "waiting" || queued ? "bg-amber-400" : "bg-[#075E63]";
  return (
    <div className="h-1.5 lg:h-2 flex-1 overflow-hidden rounded-full bg-[#122D30]/10">
      <div
        className={`h-full rounded-full transition-[width] duration-[1200ms] ease-out ${color} ${phase.status === "current" && phase.fill === 0 ? "w-1.5 motion-safe:animate-pulse" : ""}`}
        style={phase.status === "current" && phase.fill === 0 ? undefined : { width: `${Math.round(phase.fill * 100)}%` }}
      />
    </div>
  );
}

/**
 * A queued or running chapter, in its row: the phase and step it is on, the percent (how long it has run is in the
 * opened view, and on hover), and one bar in four phases. The run's one progress indicator. No time-left guess: the
 * backend sends none, and stages run at too different speeds to extrapolate one.
 */
export function RunProgress({ subject }: { subject: Subject }) {
  const queued = subject.state === "queued";
  const phases = runPhases(subject.state, subject.progress);
  const percent = shownPercent(subject.state, subject.progress);
  const now = subject.progress?.updated_at ?? null;
  const ran = queued ? null : elapsed(subject.started_at, now);
  const stale = staleLine(subject.state, subject.progress);
  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5">
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <p role="status" className="flex min-w-0 items-center gap-2 text-[13px] lg:text-[14.5px] font-semibold text-[#122D30]">
          <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full motion-safe:animate-pulse ${queued ? "bg-amber-500" : "bg-[#075E63]"}`} />
          <span className="truncate">{nowLine(subject.state, subject.progress)}</span>
        </p>
        <p className="shrink-0 text-[11.5px] lg:text-[12.5px] font-semibold tabular-nums text-[#122D30]/50" title={ran ? `Running for ${ran}` : undefined}>
          {percent !== null && <span className="text-[#075E63]">{percent}%</span>}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={`${subject.title} ingestion progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        aria-valuetext={percent !== null ? `${percent}%` : nowLine(subject.state, subject.progress)}
        className="flex gap-1"
      >
        {phases.map((p) => <Segment key={p.key} phase={p} queued={queued} />)}
      </div>
      {stale && <p className="text-[11px] lg:text-[12px] font-semibold text-amber-700">{stale}</p>}
      <div className="flex gap-1 text-[10px] lg:text-[11px] font-bold uppercase tracking-wider" aria-hidden>
        {phases.map((p) => (
          <span key={p.key} className={`min-w-0 flex-1 truncate ${p.status === "current" ? "text-[#075E63]" : p.status === "done" ? "text-[#122D30]/50" : "text-[#122D30]/25"}`}>
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The middle's sentence: a title with its state's dot, and a line under it; both a step larger on wide screens. */
const titleClass = "flex min-w-0 items-center gap-2 text-[13px] lg:text-[14.5px] font-semibold text-[#122D30]";
const bodyClass = "line-clamp-2 pl-4 text-[11.5px] lg:text-[12.5px] text-[#122D30]/60";

const TONE_DOT = { action: "bg-[#075E63]", problem: "bg-red-500", info: "bg-[#122D30]/40", done: "bg-emerald-500" } as const;

/**
 * A finished chapter, in its row: what the run means for the partner (the server's next step) and the first reason
 * behind it, so nothing needs opening to know what to do. Null when there is nothing to say (not started, or a server
 * without outcomes and no detail).
 */
export function RunOutcome({ subject }: { subject: Subject }) {
  // A server without outcomes still says a finished chapter is ready (or live).
  const next = subject.outcome?.next_step ?? (subject.state === "ready" ? (subject.release?.state === "published" ? "none" : "review_release") : undefined);
  const awaitingAnswers = subject.state === "review_needed" && subject.questions > 0;
  if (subject.state === "registered" || next === "start") {
    return (
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className={titleClass}><span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-[#122D30]/30" /><span className="truncate">Not started</span></p>
        <p className={bodyClass}>{NEXT_STEP_COPY.start.body}</p>
      </div>
    );
  }
  if (!next || next === "wait") {
    if (!subject.detail || !["failed", "invalid", "review_needed"].includes(subject.state)) return null;
    return (
      <p className={`${titleClass} items-start`}>
        <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
        <span className="line-clamp-2" title={subject.detail}>{subject.detail}</span>
      </p>
    );
  }
  const copy = awaitingAnswers ? NEXT_STEP_COPY.answer_questions : NEXT_STEP_COPY[next];
  const first = subject.outcome?.findings[0];
  const why = first ? `${checkLabel(first.check)} · ${first.owner === "partner" ? "you can fix this" : "GenEd will look at this"}` : copy.body;
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className={titleClass}>
        <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[copy.tone]}`} />
        <span className="truncate">{copy.title}</span>
      </p>
      <p className={bodyClass}>{why}</p>
    </div>
  );
}
