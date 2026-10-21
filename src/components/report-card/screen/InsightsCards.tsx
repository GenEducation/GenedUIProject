"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import type { ReportCardData } from "../types";
import { relativeDay } from "../selectors";
import { BAND_TONES } from "../subjectVisuals";
import { useReportExtras } from "../sections/ReportExtras";
import type { InsightItem, InsightView } from "../sections/reportSections";
import { CARD, ComingSoon } from "./primitives";
import { Icon, TintIcon } from "./icons";
import { SectionHeader } from "./SectionCards";

// The written note on the card (backend `GET /v1/learner/insights`): a headline, what is working well, what needs
// attention and what to do next. It is written by a model from the measured figures after a session ends, held to fixed
// rules by the backend, and says so. The figures themselves are on the rest of the page, so the note stays short prose.

/** Key Insights on the overview: loading, a note, or what to expect when there is none. */
export function KeyInsightsCard() {
  const { insights } = useReportExtras();
  if (!insights) return null;
  const { state, retry, reload } = insights;
  const data = state.status === "ready" ? state.data : null;
  const note = data?.insight ?? null;
  const subtitle = data?.refreshing
    ? <span role="status">Updating…</span>
    : note ? `By GenEd AI · updated ${relativeDay(note.generated_at).toLowerCase()}` : "A short summary of how things are going";

  return (
    <section aria-labelledby="rc-insights-title" className={`${CARD} p-5`}>
      <SectionHeader
        id="rc-insights-title"
        icon="insights/key-insight"
        title="Key Insights"
        subtitle={subtitle}
        action={data?.can_reload && (
          <Button variant="tertiary" size="sm" pill onClick={reload} disabled={data.refreshing} leadingIcon={<TintIcon name="misc/refresh" color="currentColor" size={13} />}>
            Reload
          </Button>
        )}
      />

      <div className="mt-4">
        {state.status === "loading" && <p className="text-[13px] text-[var(--rs-ink-soft)]">Loading…</p>}
        {state.status === "error" && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[13px] text-[var(--rs-ink-soft)]">Couldn&apos;t load the insights.</p>
            <Button variant="outline" size="sm" pill onClick={retry}>Retry</Button>
          </div>
        )}
        {data?.status === "disabled" && (
          <ComingSoon
            compact
            icon={<Icon name="insights/ai-insight" size={20} />}
            title="AI learning insights"
            text="What's working well, what needs attention and where to focus next, written from the measured figures."
          />
        )}
        {data && data.status !== "disabled" && !note && <NoNote status={data.status} refreshing={data.refreshing} />}
        {note && <Note note={note} />}
      </div>
    </section>
  );
}

function NoNote({ status, refreshing }: { status: "ready" | "none" | "unavailable"; refreshing: boolean }) {
  const text = refreshing
    ? "A note is being written from the latest figures. It will appear here in a moment."
    : status === "unavailable"
      ? "A note couldn't be written just now. The figures on this page are all still up to date; try again a little later."
      : "A note appears here once a few questions have been answered: what's working well, what needs attention and what to do next.";
  return <p className="text-[13px] leading-relaxed text-[var(--rs-ink-soft)]" role={refreshing ? "status" : undefined}>{text}</p>;
}

function Note({ note }: { note: InsightView }) {
  return (
    <div>
      <Headline text={note.headline} />
      <Groups
        groups={[
          { title: "Working well", kind: "good", items: note.working_well },
          { title: "Needs attention", kind: "warn", items: note.needs_attention },
          { title: "Next steps", kind: "next", items: note.next_steps },
        ]}
      />
    </div>
  );
}

/** The note's one-line summary, as the card's lead sentence. */
function Headline({ text }: { text: string }) {
  return <p className="text-[16px] font-semibold leading-snug text-[var(--rs-ink)]">{text}</p>;
}

const KINDS = {
  good: { icon: "marks/check", tone: BAND_TONES.Advanced },
  warn: { icon: "marks/flag", tone: BAND_TONES.Approaching },
  next: { icon: "actions/right-arrow", tone: BAND_TONES.Proficient },
} as const;

type Group = { title: string; kind: keyof typeof KINDS; items: InsightItem[] };

/** One row per group, divided: its mark in a small well, its title, then its sentences under the title. */
function Groups({ groups }: { groups: Group[] }) {
  const shown = groups.filter((g) => g.items.length > 0);
  if (shown.length === 0) return null;
  return (
    <div className="mt-3 divide-y divide-[var(--rs-line)] border-t border-[var(--rs-line)]">
      {shown.map(({ title, kind, items }) => {
        const { icon, tone } = KINDS[kind];
        return (
          <div key={title} className="flex gap-3 py-3.5 last:pb-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: tone.tint }}>
              <TintIcon name={icon} color={tone.ink} size={15} />
            </span>
            <div className="min-w-0 pt-1">
              <h3 className="text-[13.5px] font-bold leading-tight text-[var(--rs-ink)]">{title}</h3>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {items.map((item, i) => (
                  <li key={i} className="text-[13.5px] leading-snug text-[var(--rs-ink-soft)]">{item.text}</li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** A subject's own insight, for its Insights tab. A note about several subjects has an entry for each; a note about one has
 *  none (the overview is already about it), so that subject's tab shows the overview's sentences that rest on its facts. */
export function SubjectInsight({ data, subject }: { data: ReportCardData; subject: string }) {
  const { insights } = useReportExtras();
  if (!insights) return null;
  const response = insights.state.status === "ready" ? insights.state.data : null;
  const note = response?.insight ?? null;
  const code = data.chapters.find((c) => c.subject === subject)?.subject_code;
  const none = (
    <ComingSoon
      icon={<Icon name="insights/ai-insight" size={22} />}
      title="Subject insights"
      text={!response || response.status === "disabled"
        ? "An analysis of strengths, what to work on and how this subject is going chapter to chapter."
        : "A note for this subject appears here once there are enough answers in it."}
    />
  );
  if (!note) return none;

  const entry = note.subjects.find((s) => s.subject_code === code);
  const own = new Set(note.facts.filter((f) => f.subject_code === code).map((f) => f.id));
  const about = (items: InsightItem[]) => items.filter((i) => i.evidence.some((e) => own.has(e)));
  const headline = entry?.headline ?? (note.subjects.length === 0 && note.headline_evidence.some((e) => own.has(e)) ? note.headline : null);
  const working = entry ? entry.working_well : note.subjects.length === 0 ? about(note.working_well) : [];
  const attention = entry ? entry.needs_attention : note.subjects.length === 0 ? about(note.needs_attention) : [];
  if (!headline && working.length === 0 && attention.length === 0) return none;

  return (
    <div>
      {headline && <Headline text={headline} />}
      <Groups
        groups={[
          { title: "Working well", kind: "good", items: working },
          { title: "Needs attention", kind: "warn", items: attention },
        ]}
      />
    </div>
  );
}
