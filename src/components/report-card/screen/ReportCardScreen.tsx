"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "framer-motion";
import type { ReportCardData, ReportCardUI } from "../types";
import { overallSummary, subjectSummaries, type SubjectSummary } from "../selectors";
import { Button } from "@/components/ui/Button";
import { BandChip, CARD, SubjectGlyph } from "./primitives";
import { Icon, TintIcon } from "./icons";
import { SummaryHeader } from "./SummaryHeader";
import { SubjectList } from "./SubjectList";
import { InsightsPanel } from "./InsightsPanel";
import { SubjectPreview } from "./SubjectPreview";
import { SubjectDetail, type DetailTab } from "./SubjectDetail";

/**
 * The on-screen report card. Three levels, stepped through like cascading
 * panels:
 *
 *   overview  [ subject list ][ key insights + trends ]
 *   preview   [ subject list ][ subject preview       ]
 *   detail    [ preview      ][ chapter breakdown     ]
 *
 * Below WIDE px of available width the columns stack and each level is a page.
 */
export type ScreenView =
  | { level: "overview" }
  | { level: "preview"; subject: string }
  | { level: "detail"; subject: string; tab: DetailTab };

const WIDE = 1000;
const EASE = [0.22, 1, 0.36, 1] as const;

export function ReportCardScreen({ data, ui }: { data: ReportCardData; ui: ReportCardUI }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const wide = useWidthAtLeast(rootRef, WIDE);
  const [view, setView] = useState<ScreenView>({ level: "overview" });

  const subjects = useMemo(() => subjectSummaries(data), [data]);
  const overall = useMemo(() => overallSummary(data, subjects), [data, subjects]);
  const isBrandNew = data.totalSessions === 0 && data.subjects.length === 0 && !data.progressReport;

  // A subject can vanish when the dataset changes (child switch, simulation).
  const current = view.level === "overview" ? null : subjects.find((s) => s.subject === view.subject) ?? null;
  const level = current ? view.level : "overview";

  const openSubject = useCallback((subject: string) => {
    setView((v) => {
      if (v.level === "detail") return { ...v, subject };
      if (v.level === "preview" && v.subject === subject) return { level: "overview" };
      return { level: "preview", subject };
    });
  }, []);
  const back = useCallback(() => {
    setView((v) => (v.level === "detail" ? { level: "preview", subject: v.subject } : { level: "overview" }));
  }, []);
  const viewDetails = () => current && setView({ level: "detail", subject: current.subject, tab: "chapters" });
  const setTab = (tab: DetailTab) => setView((v) => (v.level === "detail" ? { ...v, tab } : v));

  // Esc steps back one level (unless focus is in a form control).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || level === "overview") return;
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
      back();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [level, back]);

  // Moving between levels from far down the page: bring the panels into view.
  const gridRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const top = gridRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [level, current?.subject]);

  const preview = current && (
    <SubjectPreview
      data={data}
      summary={current}
      mode={level === "detail" ? "detail" : "preview"}
      subjects={subjects}
      onViewDetails={viewDetails}
      onBack={back}
      onSelect={openSubject}
    />
  );
  const header = <SummaryHeader data={data} ui={ui} overall={overall} onOpenSubject={openSubject} />;
  const list = (
    <SubjectList
      subjects={subjects}
      active={level === "preview" ? current?.subject ?? null : null}
      onSelect={openSubject}
      firstName={data.firstName}
    />
  );
  const detail = current && view.level === "detail" && (
    <SubjectDetail data={data} ui={ui} summary={current} tab={view.tab} onTab={setTab} />
  );

  return (
    <MotionConfig reducedMotion="user">
      <div ref={rootRef} data-ready="true" className="report-root rc-screen @container/rc min-h-full px-4 pb-12 pt-5 sm:px-6 sm:pt-6">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5">
          {isBrandNew ? (
            <>
              {header}
              <BrandNew firstName={data.firstName} onStart={ui.onStartSession} />
            </>
          ) : wide ? (
            <>
            {header}
            <LayoutGroup>
              <div
                ref={gridRef}
                className="grid scroll-mt-4 items-start gap-5"
                style={{
                  gridTemplateColumns:
                    level === "detail" ? "minmax(340px, 0.82fr) minmax(0, 1.6fr)" : "minmax(0, 1.6fr) minmax(360px, 1fr)",
                }}
              >
                {/* The summary sits full-width above this grid at every level;
                    only the subject list on the left swaps out. */}
                <div className="min-w-0">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {level !== "detail" ? (
                      <motion.div
                        key="list"
                        initial={{ opacity: 0, x: -48 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -64 }}
                        transition={{ duration: 0.4, ease: EASE }}
                      >
                        {list}
                      </motion.div>
                    ) : (
                      <motion.div key="preview" layoutId="rc-preview" transition={{ duration: 0.5, ease: EASE }} className="sticky top-4">
                        {preview}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="min-w-0">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {level === "overview" && (
                      <motion.div
                        key="insights"
                        initial={{ opacity: 0, x: 32 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 32 }}
                        transition={{ duration: 0.35, ease: EASE }}
                      >
                        <InsightsPanel data={data} subjects={subjects} />
                      </motion.div>
                    )}
                    {level === "preview" && (
                      <motion.div
                        key="preview"
                        layoutId="rc-preview"
                        initial={{ opacity: 0, x: 32 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 32 }}
                        transition={{ duration: 0.45, ease: EASE }}
                      >
                        {preview}
                      </motion.div>
                    )}
                    {level === "detail" && (
                      <motion.div
                        key="detail"
                        initial={{ opacity: 0, x: 72 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 72 }}
                        transition={{ duration: 0.45, ease: EASE, delay: 0.05 }}
                      >
                        {detail}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </LayoutGroup>
            </>
          ) : (
            <>
            {header}
            <div ref={gridRef} className="scroll-mt-4">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${level}-${current?.subject ?? ""}`}
                  initial={{ opacity: 0, x: level === "overview" ? -24 : 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: level === "overview" ? 24 : -24 }}
                  transition={{ duration: 0.28, ease: EASE }}
                  className="flex flex-col gap-5"
                >
                  {level === "overview" && (
                    <>
                      {list}
                      <InsightsPanel data={data} subjects={subjects} />
                    </>
                  )}
                  {level === "preview" && preview}
                  {level === "detail" && current && (
                    <>
                      <CompactSubjectBar summary={current} onBack={back} />
                      {detail}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            </>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}

/** Narrow-screen stand-in for the preview card while the chapter breakdown is open. */
function CompactSubjectBar({ summary: s, onBack }: { summary: SubjectSummary; onBack: () => void }) {
  return (
    <div
      className="sticky top-2 z-10 flex items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-[0_10px_24px_-18px_rgba(19,41,61,0.5)] backdrop-blur-md"
      style={{ background: `linear-gradient(110deg, ${s.tone.wash[0]}F2, ${s.tone.wash[1]}F2)`, borderColor: s.tone.edge }}
    >
      <Button variant="tertiary" size="sm" pill iconOnly onClick={onBack} aria-label="Back to subject preview">
        <TintIcon name="actions/right-arrow" color="var(--rs-ink)" size={12} className="rotate-180" />
      </Button>
      <SubjectGlyph subject={s.subject} tone={s.tone} size={34} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-[var(--rs-ink)]">{s.subject}</p>
        <p className="text-[11.5px] text-[var(--rs-ink-soft)]">{s.chaptersCompleted}/{s.chaptersTotal} chapters completed</p>
      </div>
      <BandChip band={`${s.mastery}%`} tone={s.tone} />
    </div>
  );
}

function BrandNew({ firstName, onStart }: { firstName: string; onStart?: () => void }) {
  const steps = [
    <><b>1 session</b> → subject &amp; chapter scores appear</>,
    <><b>2+ sessions on a chapter</b> → its learning-arc analysis unlocks</>,
    <><b>2+ chapters in a subject</b> → subject learning trends</>,
    <><b>An analysed subject</b> → cross-subject AI insights</>,
  ];
  return (
    <section className={`${CARD} rc-rise mx-auto w-full max-w-[720px] p-6 sm:p-8`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--rs-mint)] text-[var(--rs-brand-deep)]">
        <Icon name="session-content/achievement" size={26} />
      </span>
      <h2 className="mt-4 text-[22px] font-bold text-[var(--rs-ink)]">No sessions yet</h2>
      <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--rs-ink-soft)]">
        {firstName}&apos;s report fills in after the first learning session — every score and insight here comes from
        real session activity.
      </p>
      <h3 className="mt-6 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--rs-ink-soft)]">How this report builds</h3>
      <ol className="mt-3 flex flex-col gap-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3 rounded-2xl border border-[var(--rs-line)] bg-[var(--rs-surface-2)] px-4 py-3 text-[13.5px] text-[var(--rs-ink)]">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--rs-brand)] text-[12px] font-bold text-white">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      {onStart && (
        <Button variant="primary" size="lg" onClick={onStart} className="mt-6">
          Start your first session
        </Button>
      )}
    </section>
  );
}

/** Tracks whether an element's width is at least `min` px. */
function useWidthAtLeast(ref: React.RefObject<HTMLElement | null>, min: number): boolean {
  const [ok, setOk] = useState(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setOk(el.getBoundingClientRect().width >= min);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, min]);
  return ok;
}
