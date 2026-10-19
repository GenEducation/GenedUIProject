"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Flag, Timer, X } from "lucide-react";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { StudentAvatar } from "@/features/student/components/StudentAvatar";
import { useLessonStore } from "../useLessonStore";
import { formatDuration, useSessionTimer } from "../useSessionTimer";
import { LESSON_COLUMNS } from "./layout";

interface LessonHeaderProps {
  subject: string | null;
  chapterTitle: string | null;
  /** Where leaving the lesson goes: the subject's chapters, or home. */
  exitHref: string;
}

function Chip({
  icon,
  value,
  label,
  ...rest
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className="flex items-center gap-3 rounded-[18px] border border-[var(--ls-border)] bg-[var(--ls-card)] px-3.5 py-2 shadow-[var(--ls-shadow)] sm:px-4"
      {...rest}
    >
      {icon}
      <div className="leading-tight">
        <div className="lesson-display text-[17px] font-semibold tabular-nums">
          {value}
        </div>
        <div className="hidden text-[12px] text-[var(--ls-ink-mid)] sm:block">
          {label}
        </div>
      </div>
    </div>
  );
}

/**
 * The lesson's top bar: the GenEd logo, where you are (subject › chapter),
 * the session clock and the steps done, and the student. No points chip: the
 * backend doesn't compute points, and the UI never invents numbers; steps are
 * real progress, so they take that place.
 */
export function LessonHeader({
  subject,
  chapterTitle,
  exitHref,
}: LessonHeaderProps) {
  const seconds = useSessionTimer();
  const avatarId = useStudentStore((s) => s.avatarId);
  const done = useLessonStore((s) => s.instance?.nodes_done ?? null);
  const total = useLessonStore((s) => s.instance?.nodes_total ?? null);

  return (
    <header
      className={`flex items-center gap-3 px-4 pb-3 pt-4 lg:grid lg:gap-4 ${LESSON_COLUMNS}`}
    >
      <Link
        href="/student"
        aria-label="GenEd home"
        className="shrink-0 lg:flex lg:justify-center"
      >
        <Image
          src="/brand/gened-logo.png"
          alt="GenEd"
          width={352}
          height={135}
          priority
          className="h-10 w-auto sm:h-12 lg:h-14 xl:h-16"
        />
      </Link>

      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
          <ol className="flex min-w-0 items-center gap-2 text-[15px] text-[var(--ls-ink-mid)]">
            {subject && (
              <>
                <li className="hidden shrink-0 sm:block">
                  <Link
                    href={exitHref}
                    className="transition-colors hover:text-[var(--ls-primary)]"
                  >
                    {subject}
                  </Link>
                </li>
                <li aria-hidden className="hidden shrink-0 sm:block">
                  <ChevronRight size={16} />
                </li>
              </>
            )}
            <li
              aria-current="page"
              className="truncate font-semibold text-[var(--ls-ink)]"
            >
              {chapterTitle ?? "Lesson"}
            </li>
          </ol>
        </nav>
        <Chip
          role="timer"
          aria-label={`Session time ${formatDuration(seconds)}`}
          icon={
            <Timer
              size={26}
              strokeWidth={2.2}
              className="text-[var(--ls-primary)]"
              aria-hidden
            />
          }
          value={formatDuration(seconds)}
          label="Session time"
        />
        {done !== null && total !== null && total > 0 && (
          <div className="hidden md:block">
            <Chip
              icon={
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--ls-accent)]">
                  <Flag
                    size={16}
                    strokeWidth={2.4}
                    className="text-[var(--ls-primary)]"
                    aria-hidden
                  />
                </span>
              }
              value={`${done}/${total}`}
              label="Steps done"
            />
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-3">
        <div className="relative hidden h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-white bg-[var(--ls-soft)] shadow-[var(--ls-shadow)] sm:block">
          <StudentAvatar id={avatarId} size={48} />
        </div>
        <Link
          href={exitHref}
          aria-label="Leave lesson"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--ls-border)] bg-[var(--ls-card)] text-[var(--ls-ink-mid)] transition-colors hover:border-[var(--ls-border-strong)] hover:text-[var(--ls-primary)]"
        >
          <X size={18} />
        </Link>
      </div>
    </header>
  );
}
