"use client";

import { useEffect, useRef, useState } from "react";
import type { CheckItem } from "../types";
import { useLessonStore } from "../useLessonStore";
import { useUiText, type UiKey } from "../i18n";
import { useCheckShown } from "../delivery/useCheckShown";
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

  useEffect(() => {
    const mine = new OralAnswerSession(deps, setState);
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

  return (
    <form ref={ref} onSubmit={(e) => e.preventDefault()} className="lesson-rise lesson-sketch shrink-0 p-5 text-[var(--ls-ink)]" aria-labelledby={`check-${check.id}`}>
      <h2 id={`check-${check.id}`} className="lesson-hand text-[21px] font-bold leading-snug">
        {check.prompt}
      </h2>
      <p className="lesson-hand mt-2 text-[16px] text-[var(--ls-ink-mid)]">{t("spokenHelp")}</p>
      {unavailable && <p role="status" className="mt-3 text-[15px]">{t("spokenNoMic")}</p>}
      {live && <p role="status" aria-live="polite" className="lesson-hand mt-3 text-[18px]">{t(live)}</p>}
      {state.phase === "failed" && state.problem && (
        <p role="alert" className="mt-3 text-[15px] text-[#9A2E1E]">
          {t((["say_it_again", "make_it_shorter", "busy", "mic_denied", "no_device", "mic_busy", "connection_lost", "service"] as const).includes(state.problem as never) ? (`spoken_${state.problem}` as UiKey) : "spoken_service")}
        </p>
      )}
      {state.phase === "clarify" && state.clarify && (
        <div role="status" className="mt-3">
          <p className="lesson-hand text-[18px] font-bold">{state.clarify.probe}</p>
          <p className="text-[14px] text-[var(--ls-ink-mid)]">{t("spokenHeard", { text: state.clarify.heard })}</p>
        </div>
      )}
      {state.phase === "result" && state.result && (
        <div role="status" className="mt-3">
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
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {(state.phase === "idle" || state.phase === "failed" || state.phase === "result" || state.phase === "clarify") && (
          // eslint-disable-next-line no-restricted-syntax -- the board's button to start a spoken answer.
          <button type="button" onClick={start} disabled={unavailable || (state.phase === "failed" && !state.retry)} className="lesson-sketch-sm lesson-hand px-4 py-1.5 text-[18px] font-bold disabled:opacity-45">
            {state.phase === "failed" && state.retry ? t("writtenRetryNow") : state.phase === "idle" ? t("spokenStart") : t("spokenAgain")}
          </button>
        )}
        {state.phase === "recording" && (
          // eslint-disable-next-line no-restricted-syntax -- the board's button to end a spoken answer.
          <button type="button" onClick={() => session.current?.finish()} className="lesson-sketch-sm lesson-hand px-4 py-1.5 text-[18px] font-bold">
            {t("spokenDone")}
          </button>
        )}
      </div>
    </form>
  );
}
