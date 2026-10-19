"use client";

import { Button } from "@/components/ui/Button";
import { PlacementHeader } from "./PlacementHeader";
import { PlacementStepper } from "./PlacementStepper";

/** Fixed, hand-placed to match the vendored illustration's burst layout — decorative, aria-hidden. */
const CONFETTI_POSITIONS = [
  { top: "4%", left: "8%", size: 22, rotate: -18 },
  { top: "2%", left: "78%", size: 18, rotate: 12 },
  { top: "20%", left: "2%", size: 16, rotate: 30 },
  { top: "18%", left: "90%", size: 20, rotate: -25 },
  { top: "78%", left: "4%", size: 18, rotate: 15 },
  { top: "82%", left: "86%", size: 22, rotate: -10 },
];

/**
 * The last screen of the flow — no score, no correctness, nothing about how
 * the student did. This form never reveals correctness (see
 * `types/placement.ts`), and there is no separate results screen after this
 * one either: what happens with the attempt from here is between the
 * platform and the student's learning path, not something surfaced back to
 * them as a report card.
 *
 * `formatElapsed` is a genuine client-side stopwatch (`completedAt -
 * startedAt`, both wall-clock timestamps this store stamps itself — see
 * `usePlacementStore.ts`), not a guess. There is deliberately no "out of N
 * min" comparison next to it any more: that figure was this session's own
 * `totalItems * 45s` estimate, not a real pacing target from the backend, and
 * showing it beside a real number implied a comparison that didn't exist.
 * Under a minute it reads in seconds — rounding straight to minutes would
 * floor every sub-90-second run to the same "1 min", which reads as a stuck
 * value rather than the genuinely fast attempt it is.
 */
function formatElapsed(startedAt: number | null, completedAt: number | null): string | null {
  if (!startedAt || !completedAt) return null;
  const totalSeconds = Math.max(1, Math.round((completedAt - startedAt) / 1000));
  if (totalSeconds < 60) return `${totalSeconds} sec`;
  return `${Math.round(totalSeconds / 60)} min`;
}
export function PlacementCompleteView({
  subjectCount,
  totalItems,
  grade,
  board,
  startedAt,
  completedAt,
  onContinue,
}: {
  subjectCount: number;
  totalItems: number;
  grade: number | null;
  board: string | null;
  startedAt: number | null;
  completedAt: number | null;
  onContinue: () => void;
}) {
  const elapsed = formatElapsed(startedAt, completedAt);
  const completedOn = completedAt
    ? new Date(completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="px-6 sm:px-10 py-7 flex flex-col h-full">
      <div className="space-y-4">
        <PlacementHeader />
        <PlacementStepper currentStep={3} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
        <div className="relative" style={{ width: 180, height: 180 }}>
          {CONFETTI_POSITIONS.map((c, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- a small vendored decorative SVG, not a page asset next/image needs to optimize.
            <img
              key={i}
              src="/placement/icons/confetti.png"
              alt=""
              aria-hidden="true"
              className="absolute"
              style={{ top: c.top, left: c.left, width: c.size, height: c.size, transform: `rotate(${c.rotate}deg)` }}
            />
          ))}
          {/* eslint-disable-next-line @next/next/no-img-element -- a small vendored decorative SVG, not a page asset next/image needs to optimize. */}
          <img src="/placement/icons/after-test-illustration.png" alt="" className="w-full h-full" />
        </div>

        <h3
          className="mt-6 mb-0 font-extrabold text-[24px]"
          style={{ color: "var(--pl-primary)", fontFamily: "var(--font-display)" }}
        >
          Test Completed!
        </h3>
        <p className="mt-2 mb-0 max-w-[42ch] text-[14px] leading-relaxed" style={{ color: "var(--pl-ink-mid)" }}>
          Great job! You&apos;ve finished the onboarding test. We&apos;ll use this to
          personalize your learning journey.
        </p>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-[560px]">
          <Metric icon="subjects-icon" label="Subjects" value={String(subjectCount)} caption="assessed" />
          <Metric icon="questions-icon" label="Total Questions" value={String(totalItems)} />
          <Metric icon="time-icon" label="Time Taken" value={elapsed ?? "—"} />
          <Metric icon="status-icon" label="Status" value="Completed" caption={completedOn ? `on ${completedOn}` : undefined} />
        </div>
      </div>

      <div className="flex justify-center">
        <div className="w-full max-w-[320px]">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={onContinue}
            trailingIcon={
              // eslint-disable-next-line @next/next/no-img-element -- a small vendored decorative SVG, not a page asset next/image needs to optimize.
              <img src="/placement/icons/arrow-right.png" alt="" className="w-4 h-4" />
            }
          >
            Start Learning
          </Button>
        </div>
      </div>

      <div className="mt-4 text-center">
        <span
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ color: "var(--pl-ink-faint)" }}
        >
          {grade ? `Grade ${grade}` : "—"} {board ? `· ${board}` : ""}
        </span>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  caption,
}: {
  icon: string;
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div
      className="rounded-xl p-3 text-left"
      style={{ background: "var(--pl-surface)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a small vendored decorative SVG, not a page asset next/image needs to optimize. */}
      <img src={`/placement/icons/${icon}.png`} alt="" className="w-7 h-7 mb-2" />
      <p className="m-0 text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--pl-ink-faint)" }}>
        {label}
      </p>
      <p className="m-0 text-[16px] font-extrabold" style={{ color: "var(--pl-ink)" }}>
        {value}
      </p>
      {caption && (
        <p className="m-0 text-[11px]" style={{ color: "var(--pl-ink-faint)" }}>
          {caption}
        </p>
      )}
    </div>
  );
}
