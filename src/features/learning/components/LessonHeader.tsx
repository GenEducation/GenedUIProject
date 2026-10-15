"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Flag, ListChecks, Timer, X } from "lucide-react";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { StudentAvatar } from "@/features/student/components/StudentAvatar";
import { isRevisiting, useLessonStore } from "../useLessonStore";
import { useUiText } from "../i18n";
import { useChapterClock } from "../activity/useChapterTime";
import { formatDuration } from "../useSessionTimer";

interface LessonHeaderProps {
  subject: string | null;
  chapterTitle: string | null;
  /** Where leaving the lesson goes: the subject's chapters, or home. */
  exitHref: string;
  /**
   * Wide layout: the panels' grid template (rail · gap · board · gap · chat),
   * so the logo sits over the rail and the student over the chat even after
   * the student resizes the columns.
   */
  gridTemplate?: string;
  /** Compact layout: opens the steps drawer (the rail isn't a column there). */
  onOpenSteps?: () => void;
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
  gridTemplate,
  onOpenSteps,
}: LessonHeaderProps) {
  const studentId = useStudentStore((s) => s.studentProfile?.user_id);
  const chapterId = useLessonStore((s) => s.instance?.chapter_id);
  // One clock: the time on this chapter across every sitting, the backend's credited figure (the same one the report
  // card and the parent portal show), running between reads. Until the server answers it reads "--:--".
  const chapterSeconds = useChapterClock(studentId, chapterId);
  const t = useUiText();
  const avatarId = useStudentStore((s) => s.avatarId);
  const done = useLessonStore((s) => s.instance?.nodes_done ?? null);
  const total = useLessonStore((s) => s.instance?.nodes_total ?? null);
  const revisiting = useLessonStore((s) => isRevisiting(s.instance));

  return (
    <header
      className={`${gridTemplate ? "grid gap-y-3" : "flex gap-3"} items-center px-4 pb-3 pt-4 [@media(max-height:500px)]:pb-2 [@media(max-height:500px)]:pt-2`}
      style={gridTemplate ? { gridTemplateColumns: gridTemplate } : undefined}
    >
      {onOpenSteps && (
        // eslint-disable-next-line no-restricted-syntax -- icon-only header control.
        <button
          type="button"
          onClick={onOpenSteps}
          aria-label="Show lesson steps"
          title="Lesson steps"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--ls-border)] bg-[var(--ls-card)] text-[var(--ls-primary)] shadow-[var(--ls-shadow)] transition-colors hover:border-[var(--ls-border-strong)]"
        >
          <ListChecks size={19} strokeWidth={2.2} />
        </button>
      )}
      <Link
        href="/student"
        aria-label="GenEd home"
        className={`shrink-0 ${gridTemplate ? "flex justify-center" : ""}`}
        style={gridTemplate ? { gridColumn: "1" } : undefined}
      >
        <Image
          src="/brand/gened-logo.png"
          alt="GenEd"
          width={352}
          height={135}
          priority
          className="h-10 w-auto sm:h-12 lg:h-14 xl:h-16 [@media(max-height:500px)]:h-8"
        />
      </Link>

      {/* Wide layout: inset like the board panel's own top row (`px-5` in BoardPanel), so the breadcrumb lines up
          with the Chat/Voice switch and the step title under it rather than with the panel's rounded outer edge. */}
      <div
        className={`flex min-w-0 flex-1 items-center gap-3 sm:gap-4 ${gridTemplate ? "self-stretch pl-5" : ""}`}
        style={gridTemplate ? { gridColumn: "3" } : undefined}
      >
        {/* Wide layout: the row is as tall as the logo; the breadcrumb sits on its baseline (the chips stay centred). */}
        <nav aria-label="Breadcrumb" className={`min-w-0 flex-1 ${gridTemplate ? "self-end pb-1" : ""}`}>
          <ol className="flex min-w-0 items-center gap-2 text-[15px] text-[var(--ls-ink-mid)] lg:text-[17px]">
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
          aria-label={`${t("chapterTime")} ${chapterSeconds === null ? "loading" : formatDuration(chapterSeconds)}`}
          icon={
            <Timer
              size={26}
              strokeWidth={2.2}
              className="text-[var(--ls-primary)]"
              aria-hidden
            />
          }
          value={chapterSeconds === null ? "--:--" : formatDuration(chapterSeconds)}
          label={t("chapterTime")}
        />
        {done !== null && total !== null && total > 0 && (
          <div className="hidden md:block [@media(max-height:500px)]:hidden">
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
              label={revisiting ? t("revisiting") : t("stepsDone")}
            />
          </div>
        )}
      </div>

      <div
        className="flex shrink-0 items-center justify-end gap-3"
        style={gridTemplate ? { gridColumn: "5" } : undefined}
      >
        <div className="relative hidden h-12 w-12 [@media(max-height:500px)]:!hidden shrink-0 overflow-hidden rounded-full border-2 border-white bg-[var(--ls-soft)] shadow-[var(--ls-shadow)] sm:block">
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
