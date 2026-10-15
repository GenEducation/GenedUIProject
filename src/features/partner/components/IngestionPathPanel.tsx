"use client";

import React, { useState } from "react";
import { AlertCircle, Check, ChevronDown, Circle, Clock, Cog, FileText, Images, Info, ListTree, Minus, PenLine, Sparkles, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Subject } from "../store/usePartnerStore";
import {
  ATTENTION_COUNTS,
  NEXT_STEP_COPY,
  UPLOAD_STEPS,
  checkLabel,
  COUNT_LABELS,
  elapsed,
  milestones,
  pathSteps,
  shortTime,
  type Milestone,
  type PathStep,
} from "../utils/ingestionPath";
import { PHASES, attentionLine, runPhases, type Phase } from "../utils/ingestionPhases";

const sectionTitle = "text-[10px] lg:text-[11px] font-black text-[#122D30]/50 uppercase tracking-widest mb-2";

/** Something running now: a teal dot with a soft ping, not a spinner (which reads as a "C"). */
function LiveDot({ size = 8 }: { size?: number }) {
  return (
    <span aria-hidden className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full bg-[#075E63]/40 motion-safe:animate-ping" />
      <span className="relative inline-flex h-full w-full rounded-full bg-[#075E63]" />
    </span>
  );
}

/** The phase running now: a ring that fills with how much of the phase is done, the live dot at its centre. */
function PhaseRing({ fill }: { fill: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <span aria-hidden className="relative flex h-6 w-6 shrink-0 items-center justify-center">
      <svg viewBox="0 0 24 24" className="absolute inset-0 -rotate-90">
        <circle cx="12" cy="12" r={r} fill="white" stroke="rgb(7 94 99 / 0.15)" strokeWidth="2.5" />
        <circle
          cx="12" cy="12" r={r} fill="none" stroke="#075E63" strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0.06, Math.min(1, fill)))}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <LiveDot size={6} />
    </span>
  );
}

function StatusDot({ status }: { status: PathStep["status"] | Milestone["status"] | Phase["status"] }) {
  const base = "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border";
  if (status === "done") return <span className={`${base} border-[#075E63] bg-[#075E63] text-white`}><Check size={11} aria-hidden /></span>;
  if (status === "current") return <span className={`${base} border-[#075E63] bg-white`}><LiveDot size={6} /></span>;
  if (status === "skipped") return <span className={`${base} border-[#122D30]/15 bg-white text-[#122D30]/30`}><Minus size={11} aria-hidden /></span>;
  if (status === "stopped" || status === "problem") return <span className={`${base} border-red-400 bg-red-50 text-red-600`}><X size={11} aria-hidden /></span>;
  return <span className={`${base} border-[#122D30]/15 bg-white text-[#122D30]/20`}><Circle size={6} aria-hidden /></span>;
}

const STATUS_WORDS: Record<PathStep["status"] | Milestone["status"], string> = {
  done: "done",
  current: "in progress",
  stopped: "stopped here",
  problem: "needs attention",
  pending: "not started",
  not_reached: "not reached",
  skipped: "skipped",
};

function KindBadge({ kind }: { kind: PathStep["kind"] }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[9px] font-black uppercase tracking-wider ${
        kind === "ai" ? "border-violet-200 bg-violet-50 text-violet-700" : "border-[#122D30]/10 bg-[#F6F7F2] text-[#122D30]/60"
      }`}
    >
      {kind === "ai" ? <Sparkles size={9} aria-hidden /> : <Cog size={9} aria-hidden />}
      {kind === "ai" ? "AI" : "Automatic"}
    </span>
  );
}

function MilestoneRow({ m }: { m: Milestone }) {
  return (
    <li className="flex items-start gap-2.5">
      <StatusDot status={m.status} />
      <div className="min-w-0">
        <p className={`text-xs font-bold ${m.status === "pending" ? "text-[#122D30]/40" : "text-[#122D30]"}`}>
          {m.label}
          <span className="sr-only"> ({STATUS_WORDS[m.status]})</span>
          {m.at && <span className="ml-2 font-semibold text-[#122D30]/40">{shortTime(m.at)}</span>}
        </p>
        {m.note && <p className={`text-[11px] ${m.status === "problem" ? "text-red-600/80" : "text-[#122D30]/60"}`}>{m.note}</p>}
      </div>
    </li>
  );
}

/** "13:50" — the log's time column; the date is in the phase header's first entry when it matters. */
function clock(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** One line of the log: the time it started, its status, what it is and who does it, what it produced, what it does. */
function LogRow({ at, status, label, kind, does, chips }: {
  at: string | null;
  status: PathStep["status"] | Milestone["status"];
  label: string;
  kind?: PathStep["kind"];
  does?: string;
  chips?: { text: string; attention?: boolean; live?: boolean }[];
}) {
  const muted = status === "pending" || status === "not_reached" || status === "skipped";
  return (
    <li className="grid grid-cols-[3.25rem_1.25rem_minmax(0,1fr)] items-start gap-x-2.5 py-1.5">
      <span className="pt-0.5 text-right text-[11px] font-semibold tabular-nums text-[#122D30]/40">{muted ? "" : clock(at) ?? ""}</span>
      <StatusDot status={status} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className={`text-[12.5px] lg:text-[13px] font-bold ${muted ? "text-[#122D30]/40" : "text-[#122D30]"}`}>
            {label}
            <span className="sr-only"> ({STATUS_WORDS[status]})</span>
          </p>
          {kind && <KindBadge kind={kind} />}
          {chips?.map((c) => (
            <span
              key={c.text}
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                c.live ? "bg-[#075E63]/10 text-[#075E63]" : c.attention ? "bg-amber-50 text-amber-800" : "bg-[#DCEBE7]/50 text-[#122D30]/80"
              }`}
            >
              {c.text}
            </span>
          ))}
        </div>
        {does && <p className={`text-[11px] lg:text-[11.5px] ${muted ? "text-[#122D30]/35" : "text-[#122D30]/55"}`}>{does}</p>}
      </div>
    </li>
  );
}

/**
 * Every step of the run, grouped as the phases are: what happened before it (upload, queue), then each phase's
 * stages with the time each started, who does it and what it produced.
 */
function StepLog({ before, steps }: { before: Milestone[]; steps: PathStep[] }) {
  const groups = [
    { key: "before", label: "Before the run", rows: before.map((m) => <LogRow key={m.key} at={m.at} status={m.status} label={m.label} does={m.note} />) },
    ...PHASES.map((phase) => ({
      key: phase.key,
      label: phase.label,
      rows: steps
        .filter((st) => phase.stages.includes(st.stage))
        .map((st) => (
          <LogRow
            key={st.stage}
            at={st.startedAt}
            status={st.status}
            label={st.label}
            kind={st.kind}
            does={st.status === "skipped" ? "Skipped: the chapter did not pass its checks, so nothing was drawn." : st.does}
            chips={[
              ...(st.unitLine ? [{ text: st.unitLine, live: true }] : []),
              ...st.counts.map((c) => ({ text: `${c.value} ${COUNT_LABELS[c.name]}`, attention: ATTENTION_COUNTS.has(c.name) && c.value > 0 })),
            ]}
          />
        )),
    })),
  ].filter((g) => g.rows.length > 0);
  return (
    <div role="group" aria-label="Ingestion steps" className="gap-x-8 rounded-xl border border-[#122D30]/5 bg-white p-3 md:p-4 lg:columns-2">
      {groups.map((g) => (
        <section key={g.key} aria-label={g.label} className="mb-3 min-w-0 break-inside-avoid last:mb-0">
          <h5 className="mb-0.5 border-b border-[#122D30]/5 pb-1 text-[10px] lg:text-[11px] font-black uppercase tracking-widest text-[#122D30]/45">{g.label}</h5>
          <ol aria-label={g.key === "before" ? "Before the run" : `${g.label} steps`}>{g.rows}</ol>
        </section>
      ))}
    </div>
  );
}

/** One phase: its status, how long it took, what it produced; the phase running now lists its stages. */
function PhaseRow({ phase, running }: { phase: Phase; running: boolean }) {
  const muted = phase.status === "pending" || phase.status === "not_reached";
  const took = phase.status === "done" ? elapsed(phase.startedAt, phase.endedAt) : null;
  return (
    <li className="flex items-start gap-2.5">
      {phase.status === "current" ? <PhaseRing fill={phase.fill} /> : <span className="flex h-6 w-6 items-center justify-center"><StatusDot status={phase.status} /></span>}
      <div className="min-w-0 flex-1 pt-0.5">
        <p className={`text-[13px] lg:text-[14px] font-black ${muted ? "text-[#122D30]/40" : "text-[#122D30]"}`}>
          {phase.label}
          <span className="sr-only"> ({STATUS_WORDS[phase.status]})</span>
          {took && <span className="ml-2 text-[11px] font-semibold text-[#122D30]/40">{took}</span>}
          {phase.status === "current" && running && <span className="ml-2 text-[11px] font-semibold tabular-nums text-[#075E63]">{Math.round(phase.fill * 100)}% of this phase</span>}
          {phase.status === "stopped" && <span className="ml-2 text-[11px] font-semibold text-red-600">stopped here</span>}
        </p>
        <p className={`text-[11px] lg:text-[12px] ${muted ? "text-[#122D30]/35" : "text-[#122D30]/70"}`}>{phase.summary ?? phase.does}</p>
        {(phase.status === "current" || phase.status === "stopped") && (
          <ul className="mt-1.5 flex flex-col gap-1" aria-label={`${phase.label}: steps`}>
            {phase.steps.map((s) => {
              const active = s.status === "current" || s.status === "stopped";
              return (
                <li key={s.stage} className={`flex flex-wrap items-center gap-1.5 text-[11px] ${active ? "font-bold text-[#122D30]" : s.status === "done" ? "text-[#122D30]/60" : "text-[#122D30]/35"}`}>
                  {s.status === "done" ? <Check size={11} aria-hidden className="text-[#075E63]" /> : active ? (s.status === "stopped" ? <X size={11} aria-hidden className="text-red-600" /> : <span className="mx-[1.5px] inline-flex"><LiveDot size={8} /></span>) : <Circle size={6} aria-hidden className="mx-[2.5px]" />}
                  {s.label}
                  {active && <KindBadge kind={s.kind} />}
                  {active && s.unitLine && <span className="rounded-md bg-[#075E63]/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#075E63]">{s.unitLine}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </li>
  );
}

const BANNER_TONE = {
  action: "border-[#075E63]/20 bg-[#075E63]/5",
  problem: "border-red-200 bg-red-50/70",
  info: "border-[#122D30]/10 bg-white",
  done: "border-[#122D30]/10 bg-[#DCEBE7]/40",
} as const;

/**
 * What the chapter needs from the partner now, first thing in the panel: nothing while it runs (and that leaving is
 * safe), else the server's next step, the action for it, and the failed checks behind it with who can fix each.
 */
function NextStepBanner({ subject, onUploadAgain, onReviewVisuals, onAddQuestions }: {
  subject: Subject;
  onUploadAgain?: () => void;
  onReviewVisuals?: () => void;
  onAddQuestions?: () => void;
}) {
  if (subject.state === "queued" || subject.state === "running") {
    return (
      <div role="note" aria-label="What to do next" className="flex items-start gap-2 rounded-xl border border-[#075E63]/15 bg-[#075E63]/5 px-3 py-2.5 text-[12px] lg:text-[13px] text-[#122D30]">
        <Info size={14} aria-hidden className="mt-px shrink-0 text-[#075E63]" />
        <p>
          <b>Nothing to do yet.</b> {subject.state === "queued" ? "It starts as soon as a worker is free" : "It keeps running if you leave this page"}; this
          row says what to do once it finishes.
        </p>
      </div>
    );
  }
  const outcome = subject.outcome;
  if (!outcome || outcome.next_step === "wait" || outcome.next_step === "start") return null;
  const copy = NEXT_STEP_COPY[outcome.next_step];
  const yours = outcome.findings.filter((f) => f.owner === "partner");
  const ours = outcome.findings.filter((f) => f.owner === "gened");
  return (
    <div role="note" aria-label="What to do next" className={`rounded-xl border p-3 ${BANNER_TONE[copy.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#122D30]/50">What to do next</p>
          <p className="text-sm font-black text-[#122D30]">{copy.title}</p>
          <p className="text-[11px] text-[#122D30]/70">{copy.body}</p>
        </div>
        {outcome.next_step === "add_questions" && onAddQuestions && (
          <Button size="sm" pill leadingIcon={<PenLine size={13} />} onClick={onAddQuestions}>
            Add questions
          </Button>
        )}
        {UPLOAD_STEPS.has(outcome.next_step) && onUploadAgain && (
          <Button size="sm" pill leadingIcon={<Upload size={13} />} onClick={onUploadAgain}>
            Upload again
          </Button>
        )}
        {outcome.next_step === "review_visuals" && onReviewVisuals && (
          <Button size="sm" pill leadingIcon={<Images size={13} />} onClick={onReviewVisuals}>
            Review pictures
          </Button>
        )}
      </div>
      {(yours.length > 0 || ours.length > 0) && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Checks that did not pass">
          {yours.map((f) => (
            <li key={f.check} className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
              {checkLabel(f.check)}{f.count > 1 ? ` (${f.count})` : ""} · you can fix this
            </li>
          ))}
          {ours.map((f) => (
            <li key={f.check} className="rounded-md bg-[#122D30]/5 px-1.5 py-0.5 text-[10px] font-bold text-[#122D30]/60" title={f.check}>
              {checkLabel(f.check)}{f.count > 1 ? ` (${f.count})` : ""} · GenEd will look at this
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The run's headline numbers so far; a dash until the stage that makes one has finished. */
function FoundSoFar({ subject }: { subject: Subject }) {
  const counts = subject.progress?.counts;
  const visualsSent = subject.visuals?.submitted ?? 0;
  const tiles: { label: string; value: number | undefined }[] = [
    { label: "Pages", value: counts?.pages },
    { label: "Concepts", value: counts?.components },
    { label: "Questions", value: counts?.questions },
    { label: "Figures", value: counts?.figure_groups },
  ];
  if (visualsSent > 0) tiles.push({ label: "Teaching visuals", value: visualsSent });
  return (
    <dl className="grid grid-cols-2 gap-2">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl bg-white px-3 py-2">
          <dt className="text-[10px] lg:text-[11px] font-bold uppercase tracking-wider text-[#122D30]/45">{t.label}</dt>
          <dd className="text-lg lg:text-xl font-black tabular-nums text-[#122D30]">{typeof t.value === "number" ? t.value : <span className="text-[#122D30]/25">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-[#122D30]/40">{label}</dt>
      <dd className="break-words text-xs font-semibold text-[#122D30]">{children}</dd>
    </div>
  );
}

/**
 * A chapter's run, for its partner: what it needs from them first, the run in four phases (every stage, who does it
 * and when, one click away), what it has found so far and anything that needs attention, and where the result goes,
 * up to students. The upload's own details are one line, opened on demand.
 */
export function IngestionPathPanel({ subject, onOpenReport, onUploadAgain, onReviewVisuals, onAddQuestions }: {
  subject: Subject;
  onOpenReport?: () => void;
  onUploadAgain?: () => void;
  onReviewVisuals?: () => void;
  onAddQuestions?: () => void;
}) {
  const [allSteps, setAllSteps] = useState(false);
  const [uploadDetails, setUploadDetails] = useState(false);
  const running = subject.state === "running";
  const phases = runPhases(subject.state, subject.progress, subject.visuals?.submitted ?? 0);
  const steps = pathSteps(subject.state, subject.progress);
  const { before, after } = milestones(subject);
  const pages = subject.last_pdf_page - subject.first_pdf_page + 1;
  const cut = subject.excluded_pages && subject.excluded_pages.status !== "included" ? subject.excluded_pages : null;
  const counts = subject.progress?.counts;
  const aiCalls = counts?.model_calls;
  const took = elapsed(subject.started_at, running ? subject.progress?.updated_at ?? null : subject.finished_at);
  const ranBefore = subject.progress && !running;
  const attention = ([...ATTENTION_COUNTS] as (keyof NonNullable<typeof counts>)[])
    .map((name) => ({ name, value: counts?.[name] ?? 0 }))
    .filter((c) => c.value > 0);

  return (
    <section
      aria-label={`${subject.title}: ingestion path`}
      onClick={(e) => e.stopPropagation()}
      className="mx-1 mb-1 -mt-1 flex flex-col gap-4 rounded-b-2xl border border-t-0 border-[#122D30]/5 bg-[#F6F7F2]/70 p-4"
    >
      <NextStepBanner subject={subject} onUploadAgain={onUploadAgain} onReviewVisuals={onReviewVisuals} onAddQuestions={onAddQuestions} />

      <div className="grid gap-5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* THE RUN */}
        <div className="min-w-0">
          <h4 className={sectionTitle}>
            The run
            {ranBefore && <span className="ml-2 normal-case tracking-normal font-semibold text-[#122D30]/40">last run</span>}
          </h4>
          <ol className="space-y-3" aria-label="Run phases">
            {phases.map((p) => <PhaseRow key={p.key} phase={p} running={running} />)}
          </ol>
          <p className="mt-3 flex flex-wrap items-center gap-x-1 text-[10px] text-[#122D30]/50">
            <Sparkles size={9} aria-hidden className="text-violet-600" />
            AI steps only propose content; nothing reaches students until you review and publish it.
            {typeof aiCalls === "number" && ` ${aiCalls} AI requests so far.`}
            {took && <span className="inline-flex items-center gap-1"><Clock size={9} aria-hidden />{running ? "Running for" : "Took"} {took}.</span>}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {/* FOUND SO FAR */}
          <div>
            <h4 className={sectionTitle}>{running || subject.state === "queued" ? "Found so far" : "What it found"}</h4>
            <FoundSoFar subject={subject} />
            {(attention.length > 0 || cut) && (
              <ul className="mt-2 flex flex-col gap-1.5" aria-label="Needs your attention">
                {attention.map((c) => (
                  <li key={c.name} className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900">
                    <AlertCircle size={12} aria-hidden className="mt-px shrink-0" />
                    {attentionLine(c.name, c.value)}
                  </li>
                ))}
                {cut && (
                  <li className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900">
                    <AlertCircle size={12} aria-hidden className="mt-px shrink-0" />
                    Pages {cut.first_page}–{cut.last_page} left out as the solutions appendix
                    {cut.status === "pending" ? " (waiting for your answer)" : ""}.
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* WHERE IT GOES */}
          <div>
            <h4 className={sectionTitle}>Where it goes</h4>
            <ol className="space-y-2.5" aria-label="Where the result goes">
              {after.map((m) => <MilestoneRow key={m.key} m={m} />)}
            </ol>
            {subject.has_report && onOpenReport && (
              <Button size="sm" variant="outline" pill className="mt-3" leadingIcon={<FileText size={14} aria-hidden />} onClick={onOpenReport}>
                Full report of this run
              </Button>
            )}
          </div>

          {/* YOUR UPLOAD */}
          <div className="border-t border-[#122D30]/5 pt-3">
            <h4 className={sectionTitle}>Your upload</h4>
            <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-[#122D30]/70">
              <FileText size={12} aria-hidden className="shrink-0 text-[#122D30]/40" />
              <span className="font-semibold text-[#122D30]">{subject.pdf_file_name}</span>
              <span>·</span>
              <span>{`PDF pages ${subject.first_pdf_page}–${subject.last_pdf_page} (${pages})`}</span>
              <span>·</span>
              <span>{subject.lo_codes.length ? `${subject.lo_codes.length} learning outcomes` : "No learning outcomes chosen"}</span>
            </p>
            <p className="mt-1 text-[10px] text-[#122D30]/45">Stored privately on GenEd&apos;s servers; only you and GenEd admins can open it.</p>
          </div>
        </div>
      </div>

      {/* The detail behind both columns, on one footer row: the step-by-step log, and the upload as entered. */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#122D30]/5 pt-3">
        <Button size="sm" variant="outline" pill aria-expanded={allSteps} leadingIcon={<ListTree size={14} aria-hidden />} onClick={() => setAllSteps((v) => !v)}>
          {allSteps ? "Hide the step-by-step log" : `Show all ${steps.length} steps with times`}
          <ChevronDown size={14} aria-hidden className={`transition-transform ${allSteps ? "rotate-180" : ""}`} />
        </Button>
        <Button size="sm" variant="outline" pill aria-expanded={uploadDetails} leadingIcon={<FileText size={14} aria-hidden />} onClick={() => setUploadDetails((v) => !v)}>
          {uploadDetails ? "Hide upload details" : "Upload details"}
          <ChevronDown size={14} aria-hidden className={`transition-transform ${uploadDetails ? "rotate-180" : ""}`} />
        </Button>
      </div>
      {uploadDetails && (
        <dl aria-label="Upload details" className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-[#122D30]/5 bg-white p-3 md:p-4 sm:grid-cols-3 lg:grid-cols-6">
          <Fact label="Book">{subject.book_title}</Fact>
          <Fact label="Edition">{subject.edition_label}</Fact>
          <Fact label="Chapter">{`${subject.chapter_ordinal}. ${subject.title}`}</Fact>
          <Fact label="Subject">{`${subject.subject} · Grade ${subject.grade}`}</Fact>
          <Fact label="Board">{subject.board}</Fact>
          <Fact label="Strand">{subject.strand}</Fact>
        </dl>
      )}
      {allSteps && <StepLog before={before} steps={steps} />}
    </section>
  );
}
