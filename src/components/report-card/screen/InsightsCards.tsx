"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ReportCardData } from "../types";
import { relativeDay } from "../selectors";
import { BAND_TONES } from "../subjectVisuals";
import { useReportExtras } from "../sections/ReportExtras";
import { factText, type InsightFact, type InsightItem, type InsightView } from "../sections/reportSections";
import { CARD, ComingSoon } from "./primitives";
import { Icon, TintIcon } from "./icons";

// The written note on the card (backend `GET /v1/learner/insights`): a headline, what is working well, what needs
// attention and what to do next, each sentence with the measured figures it rests on beside it. It is written by a model
// after a session ends, held to fixed rules by the backend, and says so.

/** Key Insights on the overview: loading, a note, or what to expect when there is none. */
export function KeyInsightsCard() {
  const { insights } = useReportExtras();
  if (!insights) return null;
  const { state, retry, reload } = insights;
  const data = state.status === "ready" ? state.data : null;
  const note = data?.insight ?? null;

  return (
    <section aria-labelledby="rc-insights-title" className={`${CARD} p-5`}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="rc-insights-title" className="flex items-center gap-2.5 text-[18px] font-bold text-[var(--rs-ink)]">
          <Icon name="insights/key-insight" size={26} />
          Key Insights
        </h2>
        {data && (
          <div className="flex items-center gap-2.5">
            {data.refreshing ? (
              <span className="text-[12px] font-medium text-[var(--rs-ink-soft)]" role="status">Updating…</span>
            ) : note ? (
              <span className="text-[12px] text-[var(--rs-ink-soft)]">Updated {relativeDay(note.generated_at).toLowerCase()}</span>
            ) : null}
            {data.can_reload && (
              <Button variant="outline" size="sm" pill onClick={reload} disabled={data.refreshing} leadingIcon={<RefreshCw size={14} aria-hidden />}>
                Reload
              </Button>
            )}
          </div>
        )}
      </header>

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
  const facts = new Map(note.facts.map((f) => [f.id, f]));
  const good = BAND_TONES.Advanced;
  const warn = BAND_TONES.Approaching;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border-l-4 bg-[var(--rs-surface-2)] px-4 py-3" style={{ borderColor: "var(--rs-brand)" }}>
        <p className="text-[15px] font-semibold leading-snug text-[var(--rs-ink)]">{note.headline}</p>
        <Chips ids={note.headline_evidence} facts={facts} />
      </div>
      {note.working_well.length > 0 && (
        <Block title="What's working well" icon={<TintIcon name="insights/positive-insight" color="#fff" size={14} />} bg={good.wash[0]} edge={good.edge} accent={good.accent}>
          <Items items={note.working_well} facts={facts} />
        </Block>
      )}
      {note.needs_attention.length > 0 && (
        <Block title="Needs attention" icon={<TintIcon name="insights/needs-attention" color="#fff" size={14} />} bg={warn.wash[0]} edge={warn.edge} accent={warn.accent}>
          <Items items={note.needs_attention} facts={facts} />
        </Block>
      )}
      {note.next_steps.length > 0 && (
        <Block title="Next steps" icon={<TintIcon name="actions/right-arrow" color="#fff" size={12} />} bg="var(--rs-surface-2)" edge="var(--rs-line-strong)" accent="var(--rs-brand)">
          <Items items={note.next_steps} facts={facts} />
        </Block>
      )}
      <p className="px-1 text-[11.5px] leading-snug text-[var(--rs-ink-soft)]">
        Written by AI from the figures on this page and checked against them. It is a summary of what was measured, not a judgement of the child.
      </p>
    </div>
  );
}

function Block({ title, icon, bg, edge, accent, children }: { title: string; icon: React.ReactNode; bg: string; edge: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-4" style={{ background: bg, borderColor: edge }}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ background: accent }}>{icon}</span>
        <h3 className="text-[14px] font-bold text-[var(--rs-ink)]">{title}</h3>
      </div>
      <div className="mt-2.5 pl-[38px]">{children}</div>
    </div>
  );
}

/** Each sentence with the measured figures it rests on, as small chips. */
function Chips({ ids, facts }: { ids: string[]; facts: Map<string, InsightFact> }) {
  const shown = ids.map((id) => facts.get(id)).filter((f): f is InsightFact => !!f);
  if (shown.length === 0) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1.5">
      {shown.map((f) => (
        <span key={f.id} className="rounded-full border border-[var(--rs-line)] bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--rs-ink-soft)]">
          {factText(f)}
        </span>
      ))}
    </span>
  );
}

function Items({ items, facts }: { items: InsightItem[]; facts: Map<string, InsightFact> }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <li key={i} className="text-[13px] leading-relaxed text-[var(--rs-ink)]">
          {item.text}
          <Chips ids={item.evidence} facts={facts} />
        </li>
      ))}
    </ul>
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

  const facts = new Map(note.facts.map((f) => [f.id, f]));
  const entry = note.subjects.find((s) => s.subject_code === code);
  const own = new Set(note.facts.filter((f) => f.subject_code === code).map((f) => f.id));
  const about = (items: InsightItem[]) => items.filter((i) => i.evidence.some((e) => own.has(e)));
  const headline = entry?.headline ?? (note.subjects.length === 0 && note.headline_evidence.some((e) => own.has(e)) ? note.headline : null);
  const working = entry ? entry.working_well : note.subjects.length === 0 ? about(note.working_well) : [];
  const attention = entry ? entry.needs_attention : note.subjects.length === 0 ? about(note.needs_attention) : [];
  if (!headline && working.length === 0 && attention.length === 0) return none;

  const good = BAND_TONES.Advanced;
  const warn = BAND_TONES.Approaching;
  return (
    <div className="flex flex-col gap-3">
      {headline && <p className="rounded-2xl border-l-4 bg-[var(--rs-surface-2)] px-4 py-3 text-[15px] font-semibold leading-snug text-[var(--rs-ink)]" style={{ borderColor: "var(--rs-brand)" }}>{headline}</p>}
      {working.length > 0 && (
        <Block title="What's working well" icon={<TintIcon name="insights/positive-insight" color="#fff" size={14} />} bg={good.wash[0]} edge={good.edge} accent={good.accent}>
          <Items items={working} facts={facts} />
        </Block>
      )}
      {attention.length > 0 && (
        <Block title="Needs attention" icon={<TintIcon name="insights/needs-attention" color="#fff" size={14} />} bg={warn.wash[0]} edge={warn.edge} accent={warn.accent}>
          <Items items={attention} facts={facts} />
        </Block>
      )}
    </div>
  );
}
