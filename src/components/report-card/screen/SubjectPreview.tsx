"use client";

import React from "react";
import { X } from "lucide-react";
import type { ReportCardData } from "../types";
import { chapterRows, type SubjectSummary } from "../selectors";
import { Button } from "@/components/ui/Button";
import { Icon, TintIcon } from "./icons";
import { BandChip, Bar, CARD, COVERAGE_COLOR, FOCUS_RING, Ring, SubjectGlyph, plural } from "./primitives";

const BAND_COPY: Record<string, string> = {
  Advanced: "Excellent command of this subject — keep stretching with harder problems and new chapters.",
  Proficient: "Solid understanding across chapters. A little more practice will lift this to Advanced.",
  Approaching: "Building problem-solving skills and conceptual understanding through regular practice.",
  Developing: "Early days — steady sessions on the core chapters will build a strong foundation.",
  "Not started": "No sessions yet. Chapter progress appears here after the first session.",
};

/**
 * The selected subject's summary card. In "preview" it sits in the right
 * column and offers "View details"; in "detail" the same card (shared
 * layoutId) has moved to the left column and lets you hop between subjects.
 */
export function SubjectPreview({
  data, summary, mode, subjects, onViewDetails, onBack, onSelect,
}: {
  data: ReportCardData;
  summary: SubjectSummary;
  mode: "preview" | "detail";
  subjects: SubjectSummary[];
  onViewDetails: () => void;
  onBack: () => void;
  onSelect: (subject: string) => void;
}) {
  const s = summary;
  const { tone } = s;
  const description = s.evolution?.headline || BAND_COPY[s.band];
  const top = chapterRows(data, s.subject, "recent").filter((r) => r.started).slice(0, 3);
  const minutes = chapterRows(data, s.subject).reduce((sum, r) => sum + (r.minutes ?? 0), 0);

  return (
    <section aria-label={`${s.subject} preview`} className={`${CARD} overflow-hidden`}>
      <div className="flex items-center justify-between px-5 pt-4">
        <Button variant="tertiary" size="sm" pill onClick={onBack} leadingIcon={<TintIcon name="actions/right-arrow" color="currentColor" size={12} className="rotate-180" />} className="-ml-3">
          {mode === "detail" ? "Back to Subjects" : "Back to Overview"}
        </Button>
        {mode === "preview" && (
          <Button variant="tertiary" size="sm" pill iconOnly onClick={onBack} aria-label="Close preview">
            <X size={16} />
          </Button>
        )}
      </div>

      {/* Header wash */}
      <div
        className="mx-4 mt-3 rounded-2xl border p-4"
        style={{ background: `linear-gradient(120deg, ${tone.wash[0]}, ${tone.wash[1]})`, borderColor: tone.edge }}
      >
        <div className="flex items-start gap-3.5">
          <SubjectGlyph subject={s.subject} tone={tone} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-[21px] font-bold leading-tight text-[var(--rs-ink)]">{s.subject}</h2>
              <BandChip band={s.band} tone={tone} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[12.5px] text-[var(--rs-ink-soft)]">
              <span className="inline-flex items-center gap-1"><Icon name="subject-card-stats/stat-chapters" size={14} />{plural(s.chaptersTotal, "Chapter")}</span>
              <span className="inline-flex items-center gap-1"><Icon name="subject-card-stats/stat-sessions" size={13} />{plural(s.sessions, "Session")}</span>
            </p>
          </div>
          <Ring value={s.mastery} color={tone.accent} size={78} stroke={8} label="Mastery" valueClassName="text-[18px]" />
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-[var(--rs-ink)]/80">{description}</p>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-2 px-4 pt-4">
        <MiniStat label="Coverage" value={`${s.coverage}%`} color={COVERAGE_COLOR} />
        <MiniStat label="Completed" value={`${s.chaptersCompleted}/${s.chaptersTotal}`} />
        <MiniStat label="Study time" value={minutes > 0 ? formatMinutes(minutes) : "—"} />
      </div>
      <div className="px-4 pt-3">
        <Bar value={s.coverage} color={COVERAGE_COLOR} className="h-1.5" />
      </div>

      {/* Recent chapters */}
      {top.length > 0 && (
        <div className="px-4 pt-4">
          <h3 className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--rs-ink-soft)]">Recent chapters</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {top.map((r) => (
              <li key={r.key} className="flex items-center gap-3 rounded-xl bg-[var(--rs-surface-2)] px-3 py-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: r.tone.tint, color: r.tone.ink }}>{r.n}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--rs-ink)]">{r.title}</span>
                <span className="text-[12.5px] font-bold tabular-nums" style={{ color: r.tone.ink }}>{r.mastery}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-4">
        {mode === "preview" ? (
          <Button variant="primary" size="lg" fullWidth onClick={onViewDetails} trailingIcon={<TintIcon name="actions/right-arrow" color="#fff" size={12} />}>
            View chapter breakdown
          </Button>
        ) : (
          subjects.length > 1 && (
            <div>
              <h3 className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--rs-ink-soft)]">Switch subject</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {subjects.filter((o) => o.subject !== s.subject).map((o) => (
                  // eslint-disable-next-line no-restricted-syntax -- subject chip with glyph, not a CTA
                  <button
                    key={o.subject}
                    type="button"
                    onClick={() => onSelect(o.subject)}
                    className={`inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[12.5px] font-semibold text-[var(--rs-ink)] transition-colors hover:brightness-[0.98] ${FOCUS_RING}`}
                    style={{ background: o.tone.wash[0], borderColor: o.tone.edge }}
                  >
                    <SubjectGlyph subject={o.subject} tone={o.tone} size={24} />
                    {o.subject}
                    <span className="tabular-nums" style={{ color: o.tone.ink }}>{o.mastery}%</span>
                  </button>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-[var(--rs-line)] bg-[var(--rs-surface-2)] px-2 py-2.5 text-center">
      <p className="text-[15px] font-bold tabular-nums text-[var(--rs-ink)]" style={color ? { color } : undefined}>{value}</p>
      <p className="mt-0.5 flex items-center justify-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[var(--rs-ink-soft)]">
        {label === "Study time" && <Icon name="session-content/time" size={11} />}
        {label}
      </p>
    </div>
  );
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}
