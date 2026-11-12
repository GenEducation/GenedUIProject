"use client";

import { useEffect, useRef, useState } from "react";
import type { CheckItem } from "../types";
import { useLessonStore } from "../useLessonStore";
import { useUiText, type UiKey } from "../i18n";
import { useCheckShown } from "../delivery/useCheckShown";
import { QuestionMessage, QuestionShell } from "../components/QuestionShell";
import { SketchButton } from "../components/SketchButton";
import { browserOralDeps, canCaptureAudio, INITIAL_ORAL, OralAnswerSession, type OralDeps, type OralState } from "./oralAnswer";

/**
 * A spoken answer to a rubric check (W2 P7). Real buttons (Start, Done, Try again) reachable and operable by keyboard, a polite live status for each state, the
 * words the server heard shown back (so the learner can see what was understood), authored level descriptors for a committed result, and a neutral retry
 * line (never "wrong") for a recording that could not be used. Where the browser cannot capture audio, the answer can be typed instead only if the rubric
 * allows it: a spoken rubric never reads typed words (the server refuses), so the learner is told the microphone is needed.
 */
export function SpokenAnswer({ check, deps = browserOralDeps, language = "en" }: { check: CheckItem; deps?: OralDeps; language?: string }) {
  const t = useUiText();
  const oralContext = useLessonStore((s) => s.oralContext);
  const afterOral = useLessonStore((s) => s.afterOral);
  const ref = useRef<HTMLFormElement>(null);
  useCheckShown(ref, check.id);
  const [state, setState] = useState<OralState>(INITIAL_ORAL);
  const session = useRef<OralAnswerSession | null>(null);
  const reported = useRef<string | null>(null);
  const meter = useRef<HTMLDivElement>(null);
  const seconds = useRecordingSeconds(state.phase === "recording");

  useEffect(() => {
    // The level drives the meter's style directly: a re-render per microphone frame would be wasted work.
    const mine = new OralAnswerSession(deps, setState, (level) => {
      meter.current?.style.setProperty("--level", String(level));
    });
    session.current = mine;
    return () => {
      mine.cancel();
      session.current = null;
    };
  }, [deps, check.id]);

  useEffect(() => {
    const id = state.result?.attempt_id;
    if (state.phase === "result" && id && reported.current !== id) {
      reported.current = id;
      void afterOral(id);
    }
  }, [state, afterOral]);

  const start = () => {
    const context = oralContext();
    if (context) session.current?.start({ instanceId: context.instanceId, itemId: check.id, sessionId: context.sessionId, expectedRevision: context.revision, language });
  };
  const live: UiKey | null = { starting: "spokenStarting", recording: "spokenRecording", sending: "spokenChecking" }[state.phase as "starting"] as UiKey | null;
  const feedback = state.result?.feedback;
  const retryCode = feedback?.kind === "retry" ? (feedback.code as UiKey) : null;
  const unavailable = !canCaptureAudio() && deps === browserOralDeps;

  const problemKey: UiKey | null =
    state.phase === "failed" && state.problem
      ? (["say_it_again", "make_it_shorter", "busy", "mic_denied", "no_device", "mic_busy", "connection_lost", "service"] as const).includes(state.problem as never)
        ? (`spoken_${state.problem}` as UiKey)
        : "spoken_service"
      : null;
  const canStart = state.phase === "idle" || state.phase === "failed" || state.phase === "result" || state.phase === "clarify";

  return (
    <QuestionShell
      check={check}
      formRef={ref}
      onSubmit={(e) => e.preventDefault()}
      actions={
        <>
          {canStart && (
            <SketchButton type="button" onClick={start} disabled={unavailable || (state.phase === "failed" && !state.retry)}>
              {state.phase === "failed" && state.retry ? t("writtenRetryNow") : state.phase === "idle" ? t("spokenStart") : t("spokenAgain")}
            </SketchButton>
          )}
          {state.phase === "recording" && (
            <SketchButton type="button" onClick={() => session.current?.finish()}>
              {t("spokenDone")}
            </SketchButton>
          )}
        </>
      }
      messages={
        (unavailable || live || problemKey || state.phase === "clarify" || state.phase === "result") && (
          <>
            {unavailable && <QuestionMessage tone="info">{t("spokenNoMic")}</QuestionMessage>}
            {live && <p role="status" aria-live="polite" className="lesson-hand text-[18px]">{t(live)}</p>}
            {problemKey && <QuestionMessage tone="danger" alert>{t(problemKey)}</QuestionMessage>}
            {state.phase === "clarify" && state.clarify && (
              <div role="status">
                <p className="lesson-hand text-[18px] font-bold">{state.clarify.probe}</p>
                <p className="text-[14px] text-[var(--ls-ink-mid)]">{t("spokenHeard", { text: state.clarify.heard })}</p>
              </div>
            )}
            {state.phase === "result" && state.result && (
              <div role="status">
                <p className="text-[14px] text-[var(--ls-ink-mid)]">{t("spokenHeard", { text: state.result.heard })}</p>
                {retryCode && <p className="lesson-hand text-[17px]">{t("writtenNotRated")} {t(`spoken_${retryCode}` as UiKey)}</p>}
                {feedback?.kind === "criteria" &&
                  feedback.criteria.map((c) => (
                    <div key={c.criterion}>
                      <p className="lesson-hand text-[17px]">{t("writtenShown", { text: c.shown })}</p>
                      {c.next && <p className="lesson-hand text-[17px] text-[var(--ls-ink-mid)]">{t("writtenNext", { text: c.next })}</p>}
                    </div>
                  ))}
              </div>
            )}
          </>
        )
      }
    >
      <p className="lesson-hand mt-2 text-[16px] text-[var(--ls-ink-mid)]">{t("spokenHelp")}</p>
      {state.phase === "recording" && (
        // What the microphone is hearing, and for how long: the learner can see their voice is being picked up.
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-[var(--ls-sage)] px-3 py-2">
          <span aria-hidden className="size-3 shrink-0 animate-pulse rounded-full bg-[#C2410C] motion-reduce:animate-none" />
          <div ref={meter} aria-hidden className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white" style={{ ["--level" as string]: "0" }}>
            <div className="h-full origin-left rounded-full bg-[var(--ls-primary)] transition-transform duration-75 motion-reduce:transition-none" style={{ transform: "scaleX(var(--level))" }} />
          </div>
          <span className="lesson-hand w-12 shrink-0 text-right text-[16px] tabular-nums" aria-label={t("spokenTime", { n: seconds })}>
            {formatSeconds(seconds)}
          </span>
        </div>
      )}
    </QuestionShell>
  );
}

/** m:ss */
const formatSeconds = (total: number) => `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;

/** Whole seconds since `running` became true; 0 while it is false. */
function useRecordingSeconds(running: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 250);
    return () => {
      window.clearInterval(timer);
      setSeconds(0);
    };
  }, [running]);
  return seconds;
}
