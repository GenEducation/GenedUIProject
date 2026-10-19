"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import type { ReportCardData, ReportCardUI } from "../types";
import type { OverallSummary, SubjectSummary } from "../selectors";
import { toneFor } from "../subjectVisuals";
import { CARD, FOCUS_RING, Ring } from "./primitives";
import { Icon, TintIcon } from "./icons";

export function SummaryHeader({
  data, ui, overall, onOpenSubject,
}: {
  data: ReportCardData;
  ui: ReportCardUI;
  overall: OverallSummary;
  onOpenSubject: (subject: string) => void;
}) {
  const masteryTone = toneFor(overall.avgMastery, overall.sessions > 0 || overall.avgMastery > 0);
  const meta = [
    data.displayGrade != null ? `Grade ${data.displayGrade}` : null,
    data.displayBoard ? `${data.displayBoard} Board` : null,
  ].filter(Boolean);

  return (
    // Lays itself out by its own width (it sits in the left column on wide
    // screens): stacked → identity/ring/stats over a callout row → one row.
    <div className="@container/hdr">
    <section aria-label="Report summary" className={`${CARD} rc-rise grid grid-cols-[auto_minmax(0,1fr)] gap-5 p-5 @[540px]/hdr:grid-cols-[minmax(0,1fr)_auto_auto] @[540px]/hdr:items-center @[540px]/hdr:gap-x-0 @[540px]/hdr:p-6 @[980px]/hdr:grid-cols-[minmax(0,0.9fr)_auto_auto_minmax(0,1.3fr)] @[980px]/hdr:gap-y-0`}>
      {/* Identity */}
      <div className="col-span-2 min-w-0 @[540px]/hdr:col-span-1 @[540px]/hdr:pr-6">
        <h1 className="truncate text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--rs-ink)] @[700px]/hdr:text-[30px]">
          {data.displayName}
        </h1>
        {meta.length > 0 && (
          <p className="mt-1 text-[14.5px] font-medium text-[var(--rs-ink-soft)]">{meta.join("  •  ")}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rs-line-strong)] bg-[var(--rs-mint)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--rs-brand-deep)]">
            <Icon name="filters/date-filter" size={15} />
            {data.reportPeriod}
          </span>
          {ui.canDownload && ui.onPrint && (
            <Button variant="outline" size="sm" pill onClick={ui.onPrint} loading={ui.isPdfGenerating} leadingIcon={<Icon name="misc/download" size={15} />}>
              Download PDF
            </Button>
          )}
        </div>
      </div>

      {/* Overall progress ring */}
      <div className="flex items-center @[540px]/hdr:border-l @[540px]/hdr:border-[var(--rs-line)] @[540px]/hdr:px-6">
        <Ring value={overall.progress} color="var(--rs-brand)" size={118} stroke={12}>
          <div className="text-center leading-none">
            <div className="text-[30px] font-extrabold tabular-nums tracking-[-0.03em] text-[var(--rs-ink)]">{overall.progress}%</div>
            <div className="mt-1.5 text-[11.5px] font-medium text-[var(--rs-ink-soft)]">Overall<br />Progress</div>
          </div>
        </Ring>
      </div>

      {/* Stat stack */}
      <div className="grid content-center gap-3 @[540px]/hdr:gap-3.5 @[540px]/hdr:border-l @[540px]/hdr:border-[var(--rs-line)] @[540px]/hdr:pl-6 @[980px]/hdr:pr-6">
        <HeaderStat
          icon={<Icon name="metrics/average-mastery" size={26} />}
          value={<span style={{ color: masteryTone.ink }}>{overall.avgMastery}%</span>}
          label="Average Mastery"
        />
        <HeaderStat
          icon={<Icon name="metrics/chapters-completed" size={26} />}
          value={<>{overall.chaptersCompleted} <span className="text-[var(--rs-ink-soft)]">/ {overall.chaptersTotal}</span></>}
          label="Chapters Completed"
        />
        <HeaderStat icon={<Icon name="metrics/tests" size={26} />} value={overall.tests} label={overall.tests === 1 ? "Test" : "Tests"} />
      </div>

      {/* Strongest / needs attention */}
      <div className="col-span-2 grid gap-3 @[540px]/hdr:col-span-3 @[540px]/hdr:mt-5 @[540px]/hdr:grid-cols-2 @[980px]/hdr:col-span-1 @[980px]/hdr:mt-0 @[980px]/hdr:grid-cols-1 @[980px]/hdr:border-l @[980px]/hdr:border-[var(--rs-line)] @[980px]/hdr:pl-6">
        {overall.strongest && overall.weakest ? (
          <>
            <Callout kind="strong" subject={overall.strongest} onOpen={onOpenSubject} />
            <Callout kind="attention" subject={overall.weakest} onOpen={onOpenSubject} />
          </>
        ) : (
          <p className="col-span-full rounded-2xl border border-dashed border-[var(--rs-line-strong)] px-4 py-5 text-[13px] leading-relaxed text-[var(--rs-ink-soft)]">
            Strongest and weakest subjects appear once {data.firstName} has studied two or more subjects.
          </p>
        )}
      </div>
    </section>
    </div>
  );
}

function HeaderStat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="hidden shrink-0 text-[var(--rs-ink)] @[480px]/hdr:block">{icon}</span>
      <div className="leading-tight">
        <p className="text-[18px] font-extrabold tabular-nums text-[var(--rs-ink)]">{value}</p>
        <p className="mt-0.5 text-[12px] text-[var(--rs-ink-soft)]">{label}</p>
      </div>
    </div>
  );
}

function Callout({
  kind, subject, onOpen,
}: {
  kind: "strong" | "attention";
  subject: SubjectSummary;
  onOpen: (subject: string) => void;
}) {
  const { tone } = subject;
  return (
    // eslint-disable-next-line no-restricted-syntax -- composite tinted card that opens a subject, not a CTA
    <button
      type="button"
      onClick={() => onOpen(subject.subject)}
      className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-[transform,box-shadow] duration-300 motion-safe:hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-20px_rgba(19,41,61,0.4)] ${FOCUS_RING}`}
      style={{ background: `linear-gradient(135deg, ${tone.wash[0]}, ${tone.wash[1]})`, borderColor: tone.edge }}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white" style={{ background: tone.accent }}>
        <TintIcon name={kind === "strong" ? "insights/positive-insight" : "insights/needs-attention"} color="#fff" size={15} />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-[12px] font-medium text-[var(--rs-ink-soft)]">{kind === "strong" ? "Strongest Subject" : "Needs Attention"}</span>
        <span className="mt-1 block text-[16px] font-bold leading-snug text-[var(--rs-ink)]">
          {subject.subject} <span style={{ color: tone.ink }}>({subject.mastery}%)</span>
        </span>
      </span>
      <TintIcon name="actions/right-arrow" color="var(--rs-ink-soft)" size={13} className="transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
