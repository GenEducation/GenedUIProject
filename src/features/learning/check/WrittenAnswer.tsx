"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { CheckItem, WrittenResult } from "../types";
import { useLessonStore } from "../useLessonStore";
import { useUiText, type UiKey } from "../i18n";
import { useCheckShown } from "../delivery/useCheckShown";

/**
 * A written answer to a rubric check (W2 P6). A real labelled textarea (screen readers hear the question as its group name), a live character
 * count against the check's own length band, and a Send button; Ctrl/Cmd+Enter sends too. States: idle, sending (the field and button are
 * disabled and a polite status says it is being checked), failed (an alert; the SAME request id is kept, so pressing Try again after a dropped
 * connection can never evaluate or count the answer twice), unscorable (a neutral note and the learner may answer again: never "wrong"),
 * needs a reply (the rubric's one neutral question, answered in a second box and sent with the first answer as the same attempt) and committed
 * (the authored level descriptors). Nothing here decides correctness or progression: the server does, and an uncertain or failed evaluation
 * never moves the lesson on.
 */
export function WrittenAnswer({ check, onResult }: { check: CheckItem; onResult: (result: WrittenResult) => void }) {
  const t = useUiText();
  const writtenAnswer = useLessonStore((s) => s.answerWritten);
  const ref = useRef<HTMLFormElement>(null);
  useCheckShown(ref, check.id);
  const min = check.task?.min_chars ?? 1;
  const max = check.task?.max_chars ?? 2000;
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<UiKey | null>(null);
  const [result, setResult] = useState<WrittenResult | null>(null);
  // One request id per (answer, reply): kept across failed sends so a retry is the same request, renewed when the words change.
  const request = useRef<{ key: string; id: string } | null>(null);
  const idFor = (key: string) => {
    if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
    return request.current.id;
  };
  const probe = result?.status === "needs_clarification" ? result.clarification : null;
  const length = text.trim().length;
  const ready = !busy && length >= min && length <= max && (!probe || reply.trim().length > 0);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const done = await writtenAnswer(check.id, text.trim(), { clarification: probe ? reply.trim() : "", requestId: idFor(`${text.trim()}\n${probe ? reply.trim() : ""}`) });
      if (!done) return;
      setResult(done);
      if (done.status === "committed") {
        request.current = null;
        onResult(done);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setError(/evaluator_busy|in_progress/.test(message) ? "writtenBusy" : "writtenFailed");
    } finally {
      setBusy(false);
    }
  };
  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") void send();
  };
  const feedback = result?.status === "committed" ? result.feedback : null;
  const retryCode = feedback?.kind === "retry" ? (feedback.code as UiKey) : null;

  return (
    <form ref={ref} onSubmit={send} className="lesson-rise lesson-sketch shrink-0 p-5 text-[var(--ls-ink)]" aria-labelledby={`check-${check.id}`}>
      <h2 id={`check-${check.id}`} className="lesson-hand text-[21px] font-bold leading-snug">
        {check.prompt}
      </h2>
      <label htmlFor={`written-${check.id}`} className="lesson-hand mt-3 block text-[17px] text-[var(--ls-ink-mid)]">
        {t("writtenAnswer")}
      </label>
      <textarea
        id={`written-${check.id}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        disabled={busy}
        rows={5}
        maxLength={max}
        aria-describedby={`written-help-${check.id} written-count-${check.id}`}
        className="mt-1 w-full rounded-md border border-[var(--ls-ink-faint)] bg-white p-2 text-[18px]"
      />
      <p id={`written-help-${check.id}`} className="lesson-hand text-[15px] text-[var(--ls-ink-mid)]">{t("writtenHelp")}</p>
      <p id={`written-count-${check.id}`} className="text-[13px] text-[var(--ls-ink-mid)]">{t("writtenCount", { n: length, m: max })}</p>

      {probe && (
        <div className="mt-3">
          <p className="lesson-hand text-[18px] font-bold" id={`probe-${check.id}`}>{probe.probe}</p>
          <label htmlFor={`reply-${check.id}`} className="sr-only">{t("writtenProbeLabel")}</label>
          <textarea
            id={`reply-${check.id}`}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            disabled={busy}
            rows={2}
            maxLength={1000}
            aria-describedby={`probe-${check.id}`}
            className="mt-1 w-full rounded-md border border-[var(--ls-ink-faint)] bg-white p-2 text-[18px]"
          />
        </div>
      )}

      {busy && <p role="status" aria-live="polite" className="lesson-hand mt-3 text-[17px]">{t("writtenChecking")}</p>}
      {error && (
        <p role="alert" className="mt-3 text-[15px] text-[#9A2E1E]">
          {t(error)}
        </p>
      )}
      {retryCode && (
        <p role="status" className="lesson-hand mt-3 text-[17px] text-[var(--ls-ink)]">
          {t("writtenNotRated")} {t(retryCode)}
        </p>
      )}
      {feedback?.kind === "criteria" &&
        feedback.criteria.map((c) => (
          <div key={c.criterion} role="status" className="mt-3">
            <p className="lesson-hand text-[17px]">{t("writtenShown", { text: c.shown })}</p>
            {c.next && <p className="lesson-hand text-[17px] text-[var(--ls-ink-mid)]">{t("writtenNext", { text: c.next })}</p>}
          </div>
        ))}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {/* eslint-disable-next-line no-restricted-syntax -- the board's send button for a written answer. */}
        <button type="submit" disabled={!ready} aria-busy={busy || undefined} className="lesson-sketch-sm lesson-hand px-4 py-1.5 text-[18px] font-bold disabled:opacity-45">
          {error ? t("writtenRetryNow") : t("writtenSend")}
        </button>
      </div>
    </form>
  );
}
