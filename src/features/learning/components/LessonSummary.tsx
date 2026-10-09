"use client";

import Link from "next/link";
import { Check, RotateCcw } from "lucide-react";
import { useLessonLaunch } from "@/features/student/learner/useLessonLaunch";
import { useLessonStore } from "../useLessonStore";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
      <div className="text-[24px] font-extrabold tabular-nums text-[var(--ls-primary)]">{value}</div>
      <div className="text-[12px] text-[var(--ls-ink-mid)]">{label}</div>
    </div>
  );
}

/**
 * The finished chapter, from the backend's report: steps done, answers right,
 * each learning outcome's status, and the skills still worth practising. Every
 * figure is the report's; nothing here is computed or invented.
 */
export function LessonSummary() {
  const report = useLessonStore((s) => s.report);
  const instanceId = useLessonStore((s) => s.instanceId);
  const subject = useLessonLaunch((s) => (s.instanceId === instanceId ? s.subject : null));
  const exitHref = subject ? `/student/subjects/${encodeURIComponent(subject)}` : "/student";

  return (
    <section aria-labelledby="lesson-summary-heading" className="lesson-rise overflow-hidden rounded-[24px] bg-[var(--ls-soft)]">
      <div className="relative bg-[var(--ls-primary)] px-6 py-6 text-white">
        <div aria-hidden className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[var(--ls-accent)] opacity-40 blur-2xl" />
        <p className="relative text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ls-accent)]">Chapter complete</p>
        <h2 id="lesson-summary-heading" className="lesson-hand relative mt-1 text-[30px] leading-tight">
          You did it!
        </h2>
      </div>

      {report ? (
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-3">
            <Stat value={`${report.nodes_done}/${report.nodes_total}`} label="Steps done" />
            <Stat value={`${report.answers.correct}/${report.answers.answered}`} label="Answers right" />
          </div>

          {report.outcomes.length > 0 && (
            <div>
              <h3 className="text-[13px] font-semibold text-[var(--ls-ink-mid)]">What you learned</h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {report.outcomes.map((outcome) => (
                  <li key={outcome.lo_id} className="flex items-start gap-2 text-[14px]">
                    <span
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                        outcome.mastered ? "bg-[var(--ls-primary)] text-white" : "border-2 border-[var(--ls-border-strong)]"
                      }`}
                    >
                      {outcome.mastered && <Check size={12} strokeWidth={3} aria-hidden />}
                    </span>
                    <span>
                      {outcome.title}
                      <span className="sr-only">{outcome.mastered ? " (mastered)" : " (still learning)"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.keep_practising.length > 0 && (
            <div>
              <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ls-ink-mid)]">
                <RotateCcw size={13} aria-hidden /> Keep practising
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {report.keep_practising.map((skill) => (
                  <li key={skill.component_id} className="rounded-full bg-white px-3 py-1 text-[13px]">
                    {skill.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link
            href={exitHref}
            className="self-start rounded-full bg-[var(--ls-primary)] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[var(--ls-primary-hover)]"
          >
            Back to chapters
          </Link>
        </div>
      ) : (
        <div className="p-6" aria-busy="true">
          <div className="h-20 animate-pulse rounded-2xl bg-white/70" />
        </div>
      )}
    </section>
  );
}
