"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronDown, RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLessonLaunch } from "@/features/student/learner/useLessonLaunch";
import { asError } from "@/utils/errors";
import { useLessonStore } from "../useLessonStore";
import type { SkillLevel } from "@/components/report-card/types";
import type { RevisitOptions, RevisitSection } from "../types";

/**
 * The section's score from its latest pass ("80%": first tries right without help), or what stands in for one: "Done"
 * for a finished section with nothing to answer (a teach step), "Not tried yet" for one finished with nothing answered.
 */
export function sectionScoreLabel(section: RevisitSection): string {
  if (section.status === "not_attempted") return "Not tried yet";
  if (section.score === null) return "Done";
  return `${Math.round(section.score * 100)}%`;
}

/** The report card's names for a skill level (`progress_levels_v2`), so the lesson and the report say the same thing. */
const LEVEL_LABEL: Record<SkillLevel, string> = {
  strong: "Strong",
  got_it: "Got it",
  good_start: "Good start",
  getting_there: "Getting there",
  not_started: "Not started",
};

/** Citron for what's earned (got it, strong); ocean for what's on its way; a dashed outline for not started. */
const LEVEL_TONE: Record<SkillLevel, string> = {
  strong: "bg-[var(--ls-accent)] text-[var(--ls-primary)]",
  got_it: "bg-[rgb(217_242_121/0.45)] text-[var(--ls-primary)]",
  good_start: "bg-[var(--ls-primary-wash)] text-[var(--ls-primary)]",
  getting_there: "bg-[var(--ls-primary-wash)] text-[var(--ls-primary)]",
  not_started: "border border-dashed border-[var(--ls-border-strong)] text-[var(--ls-ink-mid)]",
};

/**
 * What a row's chip says. A weak section says its score (why it is offered). A passed one says the learner's mastery of
 * its skills when the backend sends it, else its score, else "Done".
 */
function sectionChip(section: RevisitSection): { label: string; tone: string; tick: boolean; detail?: string } {
  const firstTries = section.scored > 0 ? `${section.correct} of ${section.scored} right on the first try` : null;
  if (section.status === "not_attempted") {
    return { label: "Not tried yet", tone: LEVEL_TONE.not_started, tick: false };
  }
  if (section.status !== "passed") {
    return { label: sectionScoreLabel(section), tone: "bg-[var(--ls-primary-wash)] text-[var(--ls-primary)]", tick: false, detail: firstTries ?? undefined };
  }
  // A finished section whose skills nothing has measured yet (no answers anywhere) is "Done", not "Not started".
  const mastery = section.mastery?.level === "not_started" ? null : section.mastery;
  if (mastery) {
    const skills = mastery.skills.map((k) => `${k.title}: ${LEVEL_LABEL[k.level] ?? k.level}`).join("\n");
    return {
      label: LEVEL_LABEL[mastery.level] ?? "Done",
      tone: LEVEL_TONE[mastery.level] ?? LEVEL_TONE.got_it,
      tick: mastery.level === "got_it" || mastery.level === "strong",
      detail: [skills, firstTries].filter(Boolean).join("\n") || undefined,
    };
  }
  return { label: sectionScoreLabel(section), tone: LEVEL_TONE.got_it, tick: true, detail: firstTries ?? undefined };
}

function SectionRow({
  section,
  checked,
  onToggle,
}: {
  section: RevisitSection;
  checked: boolean;
  onToggle: () => void;
}) {
  const chip = sectionChip(section);
  return (
    <li>
      <label className="group flex cursor-pointer items-center gap-3.5 rounded-[18px] border border-[var(--ls-border)] bg-[var(--ls-card)] px-4 py-3 transition-colors hover:border-[var(--ls-border-strong)] has-[:checked]:border-[var(--ls-primary)] has-[:checked]:bg-[var(--ls-primary-soft)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--ls-ring)]">
        <input type="checkbox" checked={checked} onChange={onToggle} className="peer sr-only" />
        {/* The same round marker as the summary's outcomes: filled ocean with a tick once chosen. */}
        <span
          aria-hidden
          className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2 border-[var(--ls-border-strong)] text-white transition-colors group-hover:border-[var(--ls-primary)] peer-checked:border-[var(--ls-primary)] peer-checked:bg-[var(--ls-primary)]"
        >
          {checked && <Check size={13} strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1 leading-snug">
          <span className="block text-[11px] font-bold uppercase tracking-[0.12em] tabular-nums text-[var(--ls-ink-faint)]">
            Step {section.step}
          </span>
          <span className="sr-only"> · </span>
          <span className="block text-[14.5px] font-semibold text-[var(--ls-ink)]">{section.title}</span>
        </span>
        <span
          title={chip.detail}
          className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-[12.5px] font-bold tabular-nums ${chip.tone}`}
        >
          {chip.tick && <Check size={13} strokeWidth={3} aria-hidden />}
          {chip.label}
        </span>
      </label>
    </li>
  );
}

/** A soft sage leaf for the dialog's lower corners. */
function Leaf({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 60 80" className={`pointer-events-none absolute text-[var(--ls-soft)] ${className}`} fill="currentColor">
      <path d="M30 78 C 6 60, 2 26, 30 2 C 58 26, 54 60, 30 78 Z" />
    </svg>
  );
}

/**
 * Coming back to a chapter: the sections that went badly (below 60%, or finished with nothing answered), to tick and
 * replay; any other finished section on request; carrying on where the learner was (an active chapter) or leaving (a
 * finished one); and starting over, behind a confirm. Every score is the backend's (`revisit-options`).
 */
export function RevisitChoices({
  options,
  onContinue,
  exitHref,
  inDialog = false,
}: {
  options: RevisitOptions;
  /** An active chapter: close the choice and carry on. */
  onContinue?: () => void;
  /** A finished chapter: where "Back to chapters" goes. */
  exitHref?: string;
  /** In the "welcome back" dialog: the buttons stay pinned to its foot while a long list scrolls behind them. */
  inDialog?: boolean;
}) {
  const router = useRouter();
  const reviewSections = useLessonStore((s) => s.reviewSections);
  const startOver = useLessonStore((s) => s.startOver);
  const busy = useLessonStore((s) => s.reviewBusy);
  const [selected, setSelected] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [confirmingStart, setConfirmingStart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weakIds = new Set(options.weak.map((s) => s.instance_node_id));
  const others = options.sections.filter(
    (s) => s.status !== "not_reached" && !weakIds.has(s.instance_node_id) && !s.in_review,
  );
  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((c) => c !== id) : [...current, id]));

  const review = async () => {
    setError(null);
    try {
      await reviewSections(selected);
    } catch (e) {
      setError(asError(e).message ?? "Those sections couldn't be opened. Try again.");
    }
  };

  const restart = async () => {
    setError(null);
    try {
      const fresh = await startOver();
      if (!fresh) return;
      const launch = useLessonLaunch.getState();
      if (launch.instanceId === options.instance_id && launch.chapter && launch.subject) {
        launch.launch(fresh, launch.chapter, launch.subject);
      }
      router.replace(`/student/lesson/${encodeURIComponent(fresh)}`);
    } catch (e) {
      setError(asError(e).message ?? "The chapter couldn't be started over. Try again.");
    }
  };

  const resume = options.resume;
  const hasWeak = options.weak.length > 0;
  const othersShown = showAll || !hasWeak;
  return (
    <div className="flex flex-col gap-4">
      {/* The dialog's header already says what this is; the finished chapter's summary says it here. */}
      {!inDialog && (
        <p className="text-[14px] text-[var(--ls-ink-mid)]">
          {hasWeak
            ? "Looks like a few parts were tricky. Pick the ones you want to go over again to clear things up."
            : "You passed every section. Pick any you'd like to go over again."}
        </p>
      )}

      <div>
        {hasWeak && others.length > 0 ? (
          // eslint-disable-next-line no-restricted-syntax -- a section heading that folds the list open, not an action button.
          <button
            type="button"
            aria-expanded={showAll}
            onClick={() => setShowAll((v) => !v)}
            className="mb-2.5 inline-flex items-center gap-1.5 rounded-lg text-[16px] font-bold text-[var(--ls-primary)] hover:text-[var(--ls-primary-hover)]"
          >
            Pick another section
            <ChevronDown size={18} strokeWidth={2.4} aria-hidden className={`transition-transform ${showAll ? "rotate-180" : ""}`} />
          </button>
        ) : (
          <h3 className="mb-2.5 text-[16px] font-bold text-[var(--ls-primary)]">
            {hasWeak ? "Sections to go over" : "Pick a section to go over"}
          </h3>
        )}

        {hasWeak && (
          <ul className="flex flex-col gap-2" aria-label="Sections to revisit">
            {options.weak.map((section) => (
              <SectionRow
                key={section.instance_node_id}
                section={section}
                checked={selected.includes(section.instance_node_id)}
                onToggle={() => toggle(section.instance_node_id)}
              />
            ))}
          </ul>
        )}
        {others.length > 0 && othersShown && (
          <ul className={`flex flex-col gap-2 ${hasWeak ? "mt-2" : ""}`} aria-label="Other sections">
            {others.map((section) => (
              <SectionRow
                key={section.instance_node_id}
                section={section}
                checked={selected.includes(section.instance_node_id)}
                onToggle={() => toggle(section.instance_node_id)}
              />
            ))}
          </ul>
        )}
      </div>

      <div
        className={
          inDialog
            ? "sticky bottom-0 -mx-5 -mb-5 flex flex-col gap-3 overflow-hidden border-t border-[var(--ls-border)] bg-[var(--ls-card-warm)] px-5 pb-5 pt-4 sm:-mx-6 sm:-mb-6 sm:px-6 sm:pb-6"
            : "flex flex-col gap-3"
        }
      >
        {inDialog && (
          <>
            <Leaf className="-bottom-7 -left-3 h-20 w-14 -rotate-[24deg] opacity-70" />
            <Leaf className="-bottom-6 right-3 h-14 w-10 rotate-[28deg] opacity-60" />
          </>
        )}

        {error && (
          <p role="alert" className="relative text-[13px] font-semibold text-[var(--danger-ink)]">
            {error}
          </p>
        )}

        {confirmingStart ? (
          <div className="relative flex flex-col gap-2 rounded-2xl border border-[var(--ls-border)] bg-[var(--ls-card)] p-3.5">
            <p className="text-[14px] text-[var(--ls-ink)]">This starts the chapter again from step 1. Start over?</p>
            <div className="flex flex-wrap gap-2">
              <Button pill loading={busy} onClick={() => void restart()}>
                Yes, start over
              </Button>
              <Button pill variant="outline" disabled={busy} onClick={() => setConfirmingStart(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative flex flex-wrap items-center gap-2">
            <Button
              pill
              disabled={selected.length === 0}
              loading={busy}
              leadingIcon={<RotateCw size={16} strokeWidth={2.4} aria-hidden />}
              onClick={() => void review()}
            >
              {selected.length > 0 ? `Revisit selected (${selected.length})` : "Revisit selected"}
            </Button>
            {onContinue && resume ? (
              <Button
                pill
                variant="secondary"
                disabled={busy}
                trailingIcon={<ArrowRight size={16} strokeWidth={2.4} aria-hidden />}
                onClick={onContinue}
              >
                Continue from step {resume.step} · {resume.nodes_done}/{resume.nodes_total}
              </Button>
            ) : exitHref ? (
              <Link
                href={exitHref}
                className="inline-flex items-center rounded-full border border-[var(--ls-primary)] px-4 py-2 text-[14px] font-semibold text-[var(--ls-primary)] hover:bg-[var(--ls-primary-soft)]"
              >
                Back to chapters
              </Link>
            ) : null}
            <span aria-hidden className="hidden h-7 w-px bg-[var(--ls-border-strong)] sm:block" />
            <Button
              pill
              size="sm"
              variant="tertiary"
              disabled={busy}
              leadingIcon={<RotateCcw size={15} aria-hidden />}
              onClick={() => setConfirmingStart(true)}
            >
              Start from the beginning
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
