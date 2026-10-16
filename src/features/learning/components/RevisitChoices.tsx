"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLessonLaunch } from "@/features/student/learner/useLessonLaunch";
import { asError } from "@/utils/errors";
import { useLessonStore } from "../useLessonStore";
import type { RevisitOptions, RevisitSection } from "../types";

/** "40%" from the section's latest pass, or what stands in for a score. */
export function sectionScoreLabel(section: RevisitSection): string {
  if (section.status === "not_attempted") return "Not tried yet";
  if (section.score === null) return "Done";
  return `${Math.round(section.score * 100)}%`;
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
  const weak = section.status === "below_pass_mark" || section.status === "not_attempted";
  return (
    <li>
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--ls-border)] bg-white px-3.5 py-2.5 hover:border-[var(--ls-primary)] has-[:checked]:border-[var(--ls-primary)] has-[:checked]:bg-[var(--ls-soft)]">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="h-4 w-4 shrink-0 accent-[var(--ls-primary)]"
        />
        <span className="min-w-0 flex-1 text-[14px] leading-snug">
          <span className="font-semibold tabular-nums text-[var(--ls-ink-mid)]">Step {section.step} · </span>
          {section.title}
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold tabular-nums ${
            weak ? "bg-[var(--ls-accent)] text-[var(--ls-primary)]" : "bg-[var(--ls-soft)] text-[var(--ls-ink-mid)]"
          }`}
        >
          {sectionScoreLabel(section)}
        </span>
      </label>
    </li>
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
}: {
  options: RevisitOptions;
  /** An active chapter: close the choice and carry on. */
  onContinue?: () => void;
  /** A finished chapter: where "Back to chapters" goes. */
  exitHref?: string;
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
  return (
    <div className="flex flex-col gap-4">
      {options.weak.length > 0 ? (
        <div>
          <p className="text-[14px] text-[var(--ls-ink-mid)]">
            Looks like a few parts were tricky. Pick the ones you want to go over again to clear things up.
          </p>
          <ul className="mt-3 flex flex-col gap-2" aria-label="Sections to revisit">
            {options.weak.map((section) => (
              <SectionRow
                key={section.instance_node_id}
                section={section}
                checked={selected.includes(section.instance_node_id)}
                onToggle={() => toggle(section.instance_node_id)}
              />
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[14px] text-[var(--ls-ink-mid)]">You passed every section. Pick any you&apos;d like to go over again.</p>
      )}

      {others.length > 0 && (
        <div>
          {options.weak.length > 0 && (
            <Button
              variant="tertiary"
              size="sm"
              aria-expanded={showAll}
              onClick={() => setShowAll((v) => !v)}
              trailingIcon={<ChevronDown size={14} aria-hidden className={showAll ? "rotate-180" : undefined} />}
            >
              Pick another section
            </Button>
          )}
          {(showAll || options.weak.length === 0) && (
            <ul className="mt-2 flex max-h-56 flex-col gap-2 overflow-y-auto overscroll-contain pr-1" aria-label="Other sections">
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
      )}

      {error && (
        <p role="alert" className="text-[13px] font-semibold text-[var(--danger-ink)]">
          {error}
        </p>
      )}

      {confirmingStart ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-white p-3.5">
          <p className="text-[14px]">This starts the chapter again from step 1. Start over?</p>
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
        <div className="flex flex-wrap gap-2">
          <Button pill disabled={selected.length === 0} loading={busy} onClick={() => void review()}>
            {selected.length > 0 ? `Revisit selected (${selected.length})` : "Revisit selected"}
          </Button>
          {onContinue && resume ? (
            <Button pill variant="secondary" disabled={busy} onClick={onContinue}>
              Continue from step {resume.step} · {resume.nodes_done}/{resume.nodes_total}
            </Button>
          ) : exitHref ? (
            <Link
              href={exitHref}
              className="inline-flex items-center rounded-full border border-[var(--ls-primary)] px-4 py-2 text-[14px] font-semibold text-[var(--ls-primary)] hover:bg-[var(--ls-soft)]"
            >
              Back to chapters
            </Link>
          ) : null}
          <Button
            pill
            variant="tertiary"
            disabled={busy}
            leadingIcon={<RotateCcw size={14} aria-hidden />}
            onClick={() => setConfirmingStart(true)}
          >
            Start from the beginning
          </Button>
        </div>
      )}
    </div>
  );
}
