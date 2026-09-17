"use client";

import { Button } from "@/components/ui/Button";
import { Compass } from "lucide-react";

/**
 * The first screen. Its whole job is to lower the stakes.
 *
 * Three promises, because they are the three things a child worries about
 * before a test: there is no clock, nothing is graded against them, and they
 * can stop. All three are literally true of this form — there is no timer in
 * the API, no mastery is written from the result, and `start` resumes from
 * wherever they left off.
 *
 * Deliberately no score preview, no "get them all right!" framing, and no
 * mention of difficulty.
 */
export function PlacementIntro({
  totalItems,
  subjects,
  isStarting,
  onStart,
}: {
  totalItems: number;
  subjects: string[];
  isStarting: boolean;
  onStart: () => void;
}) {
  // The bank's own pacing estimate is roughly 45 s an item; rounded to the
  // nearest 5 so it reads as the guess it is.
  const minutes = Math.max(5, Math.round((totalItems * 45) / 60 / 5) * 5);

  return (
    <div className="px-6 sm:px-10 py-10 sm:py-12 text-center flex flex-col items-center">
      <div
        className="flex items-center justify-center rounded-[22px] mb-6"
        style={{ width: 68, height: 68, background: "var(--pl-primary)", color: "var(--pl-accent)" }}
      >
        <Compass size={32} strokeWidth={2.2} />
      </div>

      <h2
        className="m-0 font-extrabold text-[26px] sm:text-[30px]"
        style={{ color: "var(--pl-primary)", fontFamily: "var(--font-display)" }}
      >
        Let&apos;s find your starting point
      </h2>

      <p
        className="mt-3 mb-0 max-w-[46ch] text-[15px] leading-relaxed"
        style={{ color: "var(--pl-ink-mid)" }}
      >
        A few questions across{" "}
        {subjects.length ? formatList(subjects) : "your subjects"}, so we know where to begin.
        It isn&apos;t an exam, and it doesn&apos;t go on your report.
      </p>

      <ul className="mt-8 mb-0 p-0 list-none grid gap-3 w-full max-w-[420px] text-left">
        <Promise text={`${totalItems} questions, about ${minutes} minutes`} />
        <Promise text="No timer — take as long as you like" />
        <Promise text="Stop any time; you'll come back to the same place" />
      </ul>

      <div className="mt-9 w-full max-w-[320px]">
        <Button variant="primary" size="lg" fullWidth loading={isStarting} onClick={onStart}>
          {isStarting ? "Getting ready" : "Start"}
        </Button>
      </div>
    </div>
  );
}

function Promise({ text }: { text: string }) {
  return (
    <li
      className="flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium"
      style={{ background: "var(--pl-surface)", color: "var(--pl-ink)" }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: "var(--pl-primary)" }}
        aria-hidden="true"
      />
      {text}
    </li>
  );
}

function formatList(items: string[]) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
