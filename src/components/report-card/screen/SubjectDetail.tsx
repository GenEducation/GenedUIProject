"use client";

import React, { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { AnalysisPattern, AnalysisRecommendation, EvolutionAnalysisJson, ReportCardData, ReportCardUI } from "../types";
import { chapterRows, type ChapterSort, type SubjectSummary } from "../selectors";
import { BAND_TONES } from "../subjectVisuals";
import { deriveTopicInsights, testAggregate } from "../utils";
import { TopicMastery } from "../parts/TopicMastery";
import { TestItem } from "../parts/TestItem";
import { CARD, FOCUS_RING } from "./primitives";
import { Icon } from "./icons";
import { ChapterRow } from "./ChapterRow";

export type DetailTab = "chapters" | "progress" | "tests" | "insights";

const TABS: { id: DetailTab; label: string }[] = [
  { id: "chapters", label: "Chapters" },
  { id: "progress", label: "Learning Progress" },
  { id: "tests", label: "Tests" },
  { id: "insights", label: "Insights" },
];

const SORTS: { id: ChapterSort; label: string }[] = [
  { id: "order", label: "Chapter order" },
  { id: "mastery", label: "Mastery" },
  { id: "recent", label: "Recent" },
];

export function SubjectDetail({
  data, ui, summary, tab, onTab,
}: {
  data: ReportCardData;
  ui: ReportCardUI;
  summary: SubjectSummary;
  tab: DetailTab;
  onTab: (tab: DetailTab) => void;
}) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { tone } = summary;

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + TABS.length) % TABS.length;
    onTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section aria-label={`${summary.subject} details`} className={`${CARD} @container/detail p-4`}>
      <div role="tablist" aria-label="Subject sections" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-[var(--rs-line)] [scrollbar-width:none]">
        {TABS.map((t, i) => {
          const selected = t.id === tab;
          return (
            // eslint-disable-next-line no-restricted-syntax -- ARIA tab, not an action button
            <button
              key={t.id}
              ref={(el) => { tabRefs.current[i] = el; }}
              role="tab"
              id={`rc-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`rc-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onTab(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative shrink-0 whitespace-nowrap px-3.5 pb-3 pt-1 text-[14px] font-semibold transition-colors ${selected ? "text-[var(--rs-ink)]" : "text-[var(--rs-ink-soft)] hover:text-[var(--rs-ink)]"} ${FOCUS_RING}`}
            >
              {t.label}
              {selected && (
                <motion.span
                  layoutId="rc-tab-underline"
                  className="absolute inset-x-1 bottom-0 h-[3px] rounded-full"
                  style={{ background: tone.accent }}
                />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          role="tabpanel"
          id={`rc-panel-${tab}`}
          aria-labelledby={`rc-tab-${tab}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="pt-4"
        >
          {tab === "chapters" && <ChaptersTab data={data} ui={ui} subject={summary.subject} />}
          {tab === "progress" && <ProgressTab data={data} ui={ui} subject={summary.subject} />}
          {tab === "tests" && <TestsTab data={data} ui={ui} subject={summary.subject} />}
          {tab === "insights" && <InsightsTab summary={summary} />}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

// ─────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────

function ChaptersTab({ data, ui, subject }: { data: ReportCardData; ui: ReportCardUI; subject: string }) {
  const [sort, setSort] = useState<ChapterSort>("order");
  const rows = chapterRows(data, subject, sort);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="whitespace-nowrap text-[17px] font-bold text-[var(--rs-ink)]">Chapters ({rows.length})</h3>
        {rows.length > 1 && (
          <label className="flex items-center gap-2 whitespace-nowrap text-[12.5px] text-[var(--rs-ink-soft)]">
            Sort by
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as ChapterSort)}
              className={`rounded-xl border border-[var(--rs-line)] bg-white py-1.5 pl-3 pr-8 text-[13px] font-semibold text-[var(--rs-ink)] ${FOCUS_RING}`}
            >
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        )}
      </div>
      {rows.length === 0 ? (
        <Empty icon={<Icon name="session-content/reading" size={22} />} text="No chapters recorded yet. Chapter-level mastery appears once a chapter session completes." />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r, i) => <ChapterRow key={r.key} row={r} ui={ui} index={i} />)}
        </ul>
      )}
    </>
  );
}

function ProgressTab({ data, ui, subject }: { data: ReportCardData; ui: ReportCardUI; subject: string }) {
  const insights = deriveTopicInsights(data.skillTree, subject);
  if (insights.cgs.length === 0) {
    return <Empty icon={<Icon name="session-content/practice" size={22} />} text="Topic-level mastery appears once learning outcomes in this subject have been assessed in sessions." />;
  }
  // The topic tree is the whole tab here, so its outer expander starts open.
  const topicsKey = `${subject}::topics`;
  const tabUi: ReportCardUI = { ...ui, isExpOpen: (k) => k === topicsKey || ui.isExpOpen(k), toggleExp: (k) => k !== topicsKey && ui.toggleExp(k) };
  return (
    <div className="rc-legacy rc-legacy--flush">
      <TopicMastery subject={subject} data={data} ui={tabUi} />
    </div>
  );
}

function TestsTab({ data, ui, subject }: { data: ReportCardData; ui: ReportCardUI; subject: string }) {
  const tests = data.testSubmissions.filter((t) => t.subject === subject);
  const agg = testAggregate(tests);
  if (tests.length === 0) {
    return <Empty icon={<Icon name="metrics/tests" size={22} />} text="No chapter tests taken yet. Take a test from any completed chapter to see scores and a section-by-section breakdown here." />;
  }
  return (
    <div className="rc-legacy">
      {agg && agg.total >= 2 && (
        <p className="mb-2 text-[13px] font-semibold text-[var(--rs-ink-soft)]">
          Average {Math.round(agg.avg * 100)}% · {agg.passed}/{agg.total} passed
        </p>
      )}
      {tests.map((t) => <TestItem key={t.submission_id} t={t} ui={ui} />)}
    </div>
  );
}

function InsightsTab({ summary }: { summary: SubjectSummary }) {
  const evo = summary.evolution;
  if (!evo) {
    return <Empty icon={<Icon name="insights/ai-insight" size={22} />} text="Subject trend analysis appears after studying 2+ chapters in this subject — it compares performance chapter to chapter." />;
  }
  const json: EvolutionAnalysisJson = evo.analysis_json ?? {};
  const strengths = json.universal_strengths ?? json.subject_strengths ?? [];
  const weaknesses = json.universal_weaknesses ?? json.subject_weaknesses ?? [];
  const recs: (string | AnalysisRecommendation)[] = json.recommendations ?? [];
  const patterns: AnalysisPattern[] = json.cross_chapter_patterns ?? [];
  const good = BAND_TONES.Advanced;
  const warn = BAND_TONES.Developing;

  return (
    <div className="flex flex-col gap-4">
      {evo.headline && (
        <blockquote className="rounded-2xl border-l-4 bg-[var(--rs-surface-2)] px-4 py-3 text-[15px] font-semibold leading-snug text-[var(--rs-ink)]" style={{ borderColor: summary.tone.accent }}>
          {evo.headline}
        </blockquote>
      )}
      {evo.subject_skill_trajectory && (
        <p className="text-[13.5px] leading-relaxed text-[var(--rs-ink)]/85">{evo.subject_skill_trajectory}</p>
      )}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="grid gap-3 @[640px]/detail:grid-cols-2">
          {strengths.length > 0 && <ListCard title="Strengths" items={strengths} bg={good.wash[0]} edge={good.edge} ink={good.ink} />}
          {weaknesses.length > 0 && <ListCard title="To work on" items={weaknesses} bg={warn.wash[0]} edge={warn.edge} ink={warn.ink} />}
        </div>
      )}
      {recs.length > 0 && (
        <div>
          <h4 className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--rs-ink-soft)]">Recommendations</h4>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-[13px] leading-relaxed text-[var(--rs-ink)]">
            {recs.map((r, i) => <li key={i}>{typeof r === "string" ? r : (r.action ?? r.recommendation ?? r.text ?? "")}</li>)}
          </ul>
        </div>
      )}
      {patterns.length > 0 && (
        <div className="grid gap-2.5 @[640px]/detail:grid-cols-2">
          {patterns.slice(0, 4).map((p, i) => (
            <div key={i} className="rounded-2xl border border-[var(--rs-line)] bg-[var(--rs-surface-2)] p-3.5">
              <p className="text-[13px] font-bold text-[var(--rs-ink)]">{p.pattern_name}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--rs-ink-soft)]">{p.summary ?? p.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ListCard({ title, items, bg, edge, ink }: { title: string; items: string[]; bg: string; edge: string; ink: string }) {
  return (
    <div className="rounded-2xl border p-4" style={{ background: bg, borderColor: edge }}>
      <h4 className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: ink }}>{title}</h4>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-[13px] leading-relaxed text-[var(--rs-ink)]">
        {items.map((x, i) => <li key={i}>{x}</li>)}
      </ul>
    </div>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dashed border-[var(--rs-line-strong)] p-5">
      <span className="mt-0.5 shrink-0 text-[var(--rs-ink-soft)]">{icon}</span>
      <p className="text-[13.5px] leading-relaxed text-[var(--rs-ink-soft)]">{text}</p>
    </div>
  );
}
