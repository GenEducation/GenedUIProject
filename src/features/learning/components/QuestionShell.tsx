"use client";

import { useEffect, useRef, type FormEvent, type ReactNode, type RefObject } from "react";
import { CircleCheck, Lightbulb } from "lucide-react";
import type { CheckItem } from "../types";
import { useUiText } from "../i18n";
import type { ProgressNote } from "../check/progress";
import { BoardFigure } from "./BoardFigure";
import { SketchButton } from "./SketchButton";

export const questionCardClass = "lesson-rise lesson-sketch @container shrink-0 p-5 text-[var(--ls-ink)]";

/** The id of a question's progress line, for its Check button's `aria-describedby`. */
export const progressIdFor = (checkId: string) => `progress-${checkId}`;

/**
 * Every question card's frame, whatever its format: the kind of check, the question (which names the card and its controls), its
 * pictures, the answer controls, what the card has to say (errors, feedback), and a footer that stays in view at the foot of the
 * dock however tall the card is. The footer's progress line says what is still missing, so a Check button that cannot be pressed
 * yet always has its reason beside it. `nudge` changing (above 0) shakes the answer once: an answer to change.
 */
export function QuestionShell({
  check,
  formRef,
  onSubmit,
  children,
  messages,
  progress,
  actions,
  onHint,
  nudge = 0,
  promptHidden,
}: {
  check: CheckItem;
  formRef: RefObject<HTMLFormElement | null>;
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
  messages?: ReactNode;
  progress?: ProgressNote | null;
  actions?: ReactNode;
  onHint?: () => void;
  nudge?: number;
  /** What a screen reader hears as the question when the answer draws the question itself (blanks in their sentence). */
  promptHidden?: string;
}) {
  const t = useUiText();
  const answerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = answerRef.current;
    if (!el || nudge === 0) return;
    // Restart the animation even when the class is already on.
    el.classList.remove("lesson-nudge");
    void el.offsetWidth;
    el.classList.add("lesson-nudge");
  }, [nudge]);

  return (
    <form ref={formRef} onSubmit={onSubmit} className={questionCardClass} aria-labelledby={`check-${check.id}`}>
      <p className="lesson-hand lesson-underline inline-block text-[18px] font-bold text-[var(--ls-primary)]">
        {check.role === "checkpoint" ? t("checkpoint") : t("quickCheck")}
      </p>
      <h2 id={`check-${check.id}`} className={promptHidden ? "sr-only" : "lesson-hand mt-2 text-[21px] font-bold leading-snug"}>
        {promptHidden ?? check.prompt}
      </h2>
      {check.figure_groups.map((group) => (
        <div key={group.id} className="mt-3">
          <BoardFigure figureGroupId={group.id} />
        </div>
      ))}

      <div ref={answerRef} onAnimationEnd={(e) => e.currentTarget.classList.remove("lesson-nudge")}>
        {children}
      </div>

      {messages && <div className="mt-3 grid gap-2">{messages}</div>}

      {(actions || onHint || progress) && (
        <div className="sticky bottom-0 z-[1] -mx-5 -mb-5 mt-4 rounded-b-[18px] border-t border-dashed border-[var(--ls-ink-faint)] bg-[var(--ls-paper)] px-5 pb-4 pt-2.5">
          {progress && (
            <p
              id={progressIdFor(check.id)}
              className={`lesson-hand mb-1.5 flex items-center gap-1.5 text-[16px] ${progress.ready ? "text-[var(--ls-primary)]" : "text-[var(--ls-ink-mid)]"}`}
            >
              {progress.ready && <CircleCheck size={16} aria-hidden />}
              {t(progress.key, progress.vars)}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {actions}
            {onHint && (
              <SketchButton type="button" variant="tertiary" onClick={onHint}>
                <Lightbulb size={16} aria-hidden /> {t("hint")}
              </SketchButton>
            )}
          </div>
        </div>
      )}
    </form>
  );
}

/** A message on a question card. `danger`: something failed to send; `warn`: change the answer and check again; `info`: neutral. */
export function QuestionMessage({ tone, children, alert = false }: { tone: "danger" | "warn" | "info"; children: ReactNode; alert?: boolean }) {
  const look =
    tone === "danger"
      ? "rounded-lg border-l-4 border-[var(--ls-danger)] bg-[var(--ls-danger-soft)] px-3 py-2 text-[var(--ls-danger)]"
      : tone === "warn"
        ? "rounded-lg border-l-4 border-[var(--ls-warn)] bg-[var(--ls-warn-soft)] px-3 py-2 text-[var(--ls-warn)]"
        : "text-[var(--ls-ink-mid)]";
  return (
    <p role={alert ? "alert" : "status"} className={`lesson-hand text-[16px] leading-snug ${look}`}>
      {children}
    </p>
  );
}
