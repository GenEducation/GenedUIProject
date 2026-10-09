"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Timer, X } from "lucide-react";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { StudentAvatar } from "@/features/student/components/StudentAvatar";
import { formatDuration, useSessionTimer } from "../useSessionTimer";

interface LessonHeaderProps {
  subject: string | null;
  chapterTitle: string | null;
  /** Where leaving the lesson goes: the subject's chapters, or home. */
  exitHref: string;
}

/**
 * The lesson's top bar: brand, where you are (subject › chapter), the session
 * clock, and the student. No points chip: the backend doesn't compute points,
 * and the UI never invents numbers.
 */
export function LessonHeader({ subject, chapterTitle, exitHref }: LessonHeaderProps) {
  const seconds = useSessionTimer();
  const avatarId = useStudentStore((s) => s.avatarId);

  return (
    <header className="flex items-center gap-3 sm:gap-6 px-4 sm:px-6 pt-4 pb-3">
      <Link href="/student" aria-label="GenEd home" className="shrink-0">
        <Image src="/GenEd Logo Colored.svg" alt="GenEd" width={104} height={32} priority className="h-7 w-auto sm:h-8" />
      </Link>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-[14px] text-[var(--ls-ink-mid)] min-w-0">
          {subject && (
            <>
              <li className="hidden sm:block shrink-0">
                <Link href={exitHref} className="hover:text-[var(--ls-primary)] transition-colors">
                  {subject}
                </Link>
              </li>
              <li aria-hidden className="hidden sm:block shrink-0">
                <ChevronRight size={15} />
              </li>
            </>
          )}
          <li aria-current="page" className="truncate font-semibold text-[var(--ls-ink)]">
            {chapterTitle ?? "Lesson"}
          </li>
        </ol>
      </nav>

      <div
        className="flex items-center gap-2.5 rounded-2xl border border-[var(--ls-border)] bg-[var(--ls-card)] px-3 py-2 shadow-[var(--ls-shadow)]"
        role="timer"
        aria-label={`Session time ${formatDuration(seconds)}`}
      >
        <Timer size={20} className="text-[var(--ls-primary)]" aria-hidden />
        <div className="leading-tight">
          <div className="text-[15px] font-bold tabular-nums">{formatDuration(seconds)}</div>
          <div className="hidden sm:block text-[11px] text-[var(--ls-ink-mid)]">Session time</div>
        </div>
      </div>

      <div className="hidden sm:block relative shrink-0 w-10 h-10 rounded-full ring-2 ring-[var(--ls-soft)] overflow-hidden">
        <StudentAvatar id={avatarId} size={40} />
      </div>

      <Link
        href={exitHref}
        aria-label="Leave lesson"
        className="shrink-0 grid place-items-center w-10 h-10 rounded-full text-[var(--ls-ink-mid)] hover:bg-[var(--ls-primary-soft)] hover:text-[var(--ls-primary)] transition-colors"
      >
        <X size={20} />
      </Link>
    </header>
  );
}
