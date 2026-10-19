"use client";

import { Button } from "@/components/ui/Button";
import { PlacementHeader } from "./PlacementHeader";
import { PlacementStepper } from "./PlacementStepper";

/**
 * The first screen. Its whole job is to lower the stakes: mixed subjects,
 * several question types, a real (not sandbagged) time estimate, and one
 * plain warning that this sitting can't be paused once started — no score
 * preview, no "get them all right!" framing, no mention of difficulty.
 */
export function PlacementIntro({
  totalItems,
  subjects,
  grade,
  board,
  isStarting,
  onStart,
}: {
  totalItems: number;
  subjects: string[];
  grade: number | null;
  board: string | null;
  isStarting: boolean;
  onStart: () => void;
}) {
  // The bank's own pacing estimate is roughly 45 s an item; rounded to the
  // nearest 5 so it reads as the guess it is.
  const minutes = Math.max(5, Math.round((totalItems * 45) / 60 / 5) * 5);

  return (
    <div className="px-6 sm:px-10 py-7 flex flex-col h-full">
      <div className="space-y-4">
        <PlacementHeader />
        <PlacementStepper currentStep={1} />
      </div>

      <div
        className="mt-6 flex-1 grid gap-6 items-stretch"
        style={{ gridTemplateColumns: "2fr 3fr" }}
      >
        <div
          className="rounded-2xl overflow-hidden flex items-center justify-center p-4"
          style={{ background: "var(--pl-surface)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a small vendored decorative SVG, not a page asset next/image needs to optimize. */}
          <img
            src="/placement/icons/before-test-illustration.png"
            alt=""
            className="w-full h-full object-contain"
          />
        </div>

        <div>
          <h3
            className="m-0 font-extrabold text-[22px]"
            style={{ color: "var(--pl-primary)", fontFamily: "var(--font-display)" }}
          >
            Let&apos;s find your current level
          </h3>
          <p className="mt-2 mb-0 text-[14px] leading-relaxed" style={{ color: "var(--pl-ink-mid)" }}>
            This test will help us understand what you already know
            {subjects.length ? ` across ${formatList(subjects)}` : " across all your subjects"}.
            You&apos;ll answer a few questions, and we&apos;ll use your responses to suggest the
            right learning path for you.
          </p>

          <ul className="mt-5 mb-0 p-0 list-none space-y-3">
            <Feature
              icon="subjects-icon"
              title="Mixed subjects"
              subtitle="Questions from all your subjects"
            />
            <Feature
              icon="questions-icon"
              title="Multiple question types"
              subtitle="MCQs, charts, maps, and more"
            />
            <Feature
              icon="time-icon"
              title={`Takes around ${minutes} minutes`}
              subtitle="You can do it at your own pace"
            />
          </ul>
        </div>
      </div>

      <div
        className="mt-6 rounded-xl p-3.5 flex items-start gap-2.5"
        style={{ background: "var(--pl-surface)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a small vendored decorative SVG, not a page asset next/image needs to optimize. */}
        <img src="/placement/icons/info-icon.png" alt="" className="w-5 h-5 shrink-0 mt-0.5" />
        <p className="m-0 text-[12.5px] leading-relaxed" style={{ color: "var(--pl-ink-mid)" }}>
          <span className="font-semibold" style={{ color: "var(--pl-ink)" }}>
            Once you start, you&apos;ll need to complete the test in one go.
          </span>{" "}
          Make sure you&apos;re in a quiet place and have a stable internet connection.
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <span
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ color: "var(--pl-ink-faint)" }}
        >
          {grade ? `Grade ${grade}` : "—"} {board ? `· ${board}` : ""}
        </span>

        <Button
          variant="primary"
          size="lg"
          loading={isStarting}
          onClick={onStart}
          trailingIcon={
            // eslint-disable-next-line @next/next/no-img-element -- a small vendored decorative SVG, not a page asset next/image needs to optimize.
            <img src="/placement/icons/arrow-right.png" alt="" className="w-4 h-4" />
          }
        >
          {isStarting ? "Getting ready" : "Start Test"}
        </Button>
      </div>
    </div>
  );
}

function Feature({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <li className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- a small vendored decorative SVG, not a page asset next/image needs to optimize. */}
      <img src={`/placement/icons/${icon}.png`} alt="" className="w-9 h-9 shrink-0" />
      <div>
        <p className="m-0 text-[13.5px] font-bold" style={{ color: "var(--pl-ink)" }}>
          {title}
        </p>
        <p className="m-0 text-[12px]" style={{ color: "var(--pl-ink-mid)" }}>
          {subtitle}
        </p>
      </div>
    </li>
  );
}

function formatList(items: string[]) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
