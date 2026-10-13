"use client";

import React, { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, MessageCircleQuestion } from "lucide-react";
import { BAND_TONES } from "@/components/report-card/subjectVisuals";
import { BandTrack } from "./BandTrack";
import { bandOf, type ConceptInsight, type ObjectiveInsight, type SkillArea } from "./insights";
import { BandChip } from "./parts";

/** One skill area: a band track at a glance, its concepts on demand. */
export function SkillAreaRow({ area }: { area: SkillArea }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const panelId = useId();
  const band = area.assessed ? bandOf(area.score) : "Not started";
  const tone = BAND_TONES[band];
  const canOpen = area.concepts.length > 0;
  const checks = area.assessments;

  return (
    <li className="overflow-hidden rounded-2xl border border-white/90 bg-white/60 transition-shadow hover:shadow-[0_12px_28px_-20px_rgba(19,41,61,0.35)]">
      <button // eslint-disable-line no-restricted-syntax -- disclosure row with a grid layout, not an action button
        type="button"
        onClick={() => canOpen && setOpen((o) => !o)}
        aria-expanded={canOpen ? open : undefined}
        aria-controls={canOpen ? panelId : undefined}
        disabled={!canOpen}
        className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2.5 px-4 py-3.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--pp-green)] disabled:cursor-default sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto] sm:px-5"
      >
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-bold text-[var(--pp-ink)]" title={area.name}>{area.name}</span>
          <span className="mt-0.5 block text-[12px] text-[var(--pp-ink-soft)]">
            {area.concepts.length > 0 && `${area.concepts.length} concept${area.concepts.length === 1 ? "" : "s"}`}
            {area.concepts.length > 0 && checks > 0 && " · "}
            {checks > 0 && `${checks} check${checks === 1 ? "" : "s"}`}
            {area.concepts.length === 0 && checks === 0 && (area.assessed ? "Overall score" : "Not checked yet")}
          </span>
        </span>

        <span className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-1 sm:col-start-2">
          <BandTrack score={area.assessed ? area.score : null} label={`${area.name}: ${area.assessed ? `${area.score} out of 100` : "not checked yet"}`} />
        </span>

        <span className="flex items-center gap-2.5 sm:col-start-3">
          <span className="w-9 text-right text-[18px] font-extrabold tabular-nums" style={{ color: tone.ink }}>
            {area.assessed ? area.score : "—"}
          </span>
          <span className="hidden w-[92px] lg:block"><BandChip band={band} size="sm" /></span>
          <ChevronDown
            size={18}
            aria-hidden
            className={`text-[var(--pp-ink-soft)] transition-transform duration-300 ${open ? "rotate-180" : ""} ${canOpen ? "" : "invisible"}`}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <ul className="space-y-3 border-t border-[var(--pp-line)] bg-[var(--pp-bg)]/60 px-4 py-4 sm:px-5">
              {area.concepts.map((c) => (
                <ConceptBlock key={c.id} concept={c} />
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function ConceptBlock({ concept }: { concept: ConceptInsight }) {
  const [why, setWhy] = useState<number | null>(null);
  const shown = why !== null ? concept.objectives[why] : null;
  return (
    <li className="rounded-xl bg-white/80 p-3.5 ring-1 ring-[var(--pp-line)]">
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,200px)_auto]">
        <p className="min-w-0 text-[13.5px] font-bold text-[var(--pp-ink)]">{concept.name}</p>
        <span className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-1 sm:col-start-2">
          <BandTrack score={concept.score} size="sm" marker={false} label={`${concept.name}: ${concept.score ?? "not checked"}`} />
        </span>
        <span className="text-right text-[13px] font-extrabold tabular-nums text-[var(--pp-ink)] sm:col-start-3">
          {concept.score ?? "—"}
        </span>
      </div>

      {concept.objectives.length > 0 && (
        <>
          <p className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--pp-ink-soft)]">What was checked</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {concept.objectives.map((o, i) => (
              <ObjectiveChip key={i} objective={o} active={why === i} onWhy={o.why ? () => setWhy(why === i ? null : i) : undefined} />
            ))}
          </ul>
        </>
      )}

      <AnimatePresence initial={false}>
        {shown?.why && (
          <motion.div
            key={why}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2.5 rounded-xl border-l-[3px] border-[var(--pp-green)] bg-[var(--pp-mint)]/60 px-3.5 py-2.5"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--pp-green-deep)]">Why this score · {shown.name}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--pp-ink)]">{shown.why}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function ObjectiveChip({ objective, active, onWhy }: { objective: ObjectiveInsight; active: boolean; onWhy?: () => void }) {
  const checked = objective.assessments > 0 || (objective.score ?? 0) > 0;
  const band = checked && objective.score !== null ? bandOf(objective.score) : "Not started";
  const tone = BAND_TONES[band];
  const body = (
    <>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: tone.accent }} />
      <span className="max-w-[260px] truncate">{objective.name}</span>
      <span className="font-extrabold tabular-nums" style={{ color: tone.ink }}>{checked ? objective.score : "—"}</span>
      {onWhy && <MessageCircleQuestion size={13} className="shrink-0 opacity-70" aria-hidden />}
    </>
  );
  const cls = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold text-[var(--pp-ink)]";
  const style = { background: active ? tone.tint : `${tone.wash[0]}`, borderColor: active ? tone.accent : tone.edge };
  return (
    <li>
      {onWhy ? (
        <button // eslint-disable-line no-restricted-syntax -- toggle chip coloured by mastery band
          type="button"
          onClick={onWhy}
          aria-pressed={active}
          title={`${band}. Tap to see why`}
          className={`${cls} transition-colors hover:brightness-[0.98] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--pp-green)]`}
          style={style}
        >
          {body}
        </button>
      ) : (
        <span className={cls} style={style} title={band}>{body}</span>
      )}
    </li>
  );
}
