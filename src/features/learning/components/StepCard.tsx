"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { asError } from "@/utils/errors";
import { AnimatePresence, motion } from "framer-motion";
import { useLessonStore } from "../useLessonStore";
import { useUiText, type UiKey } from "../i18n";
import { calculation, numericAnswerToSend } from "../check/arithmetic";
import { formatOf, initialArrangement, isArranged, isComplete, responseFromArrangement, type Arrangement } from "../check/formats";
import { Matching } from "../check/Matching";
import { BlankFiller } from "../check/BlankFiller";
import { GroupSorter } from "../check/GroupSorter";
import { LineInput } from "../check/LineInput";
import { MultiSelect } from "../check/MultiSelect";
import { Sequencing } from "../check/Sequencing";
import { SingleChoice } from "../check/SingleChoice";
import { TileBuilder } from "../check/TileBuilder";
import { useCheckShown } from "../delivery/useCheckShown";
import { WrittenAnswer } from "../check/WrittenAnswer";
import { SpokenAnswer } from "../check/SpokenAnswer";
import { progressNote } from "../check/progress";
import { blankPieces } from "../check/blankText";
import type { AnswerResponse, AnswerResult, CheckItem } from "../types";
import { SketchButton } from "./SketchButton";
import { progressIdFor, QuestionMessage, QuestionShell, questionCardClass } from "./QuestionShell";
import { MathField, type MathFieldHandle } from "../math/MathField";
import { answerFromField, calcTextFromField } from "../math/latex";
import { isMathsSubject } from "./ChatInput";

/** The structured answer each check type is scored from (backend `gened_assessment/scorer.py`). */
export function responseFor(check: CheckItem, value: string): AnswerResponse {
  if (check.response_type === "numeric") return { kind: "numeric", value: value.trim() };
  return { kind: "text", text: value.trim() };
}

/** Ordering and matching need drag-and-drop answers the board doesn't draw yet; the chat accepts them as text. */
const TYPED_TYPES = new Set<CheckItem["response_type"]>(["numeric", "numeric_set", "symbolic", "string_set"]);

const RESULT_COPY: Record<AnswerResult["outcome"], { tone: "good" | "try" | "info"; key: UiKey } | null> = {
  correct: { tone: "good", key: "correct" },
  incorrect: { tone: "try", key: "notQuite" },
  unscorable: { tone: "info", key: "unreadable" },
  quarantined: { tone: "info", key: "lookingAtIt" },
  needs_confirmation: null,
};

/** How long a result note stays before it slips away. */
const NOTE_MS = 3200;

function ResultNote({ result }: { result: AnswerResult }) {
  const t = useUiText();
  const copy = RESULT_COPY[result.outcome];
  if (!copy) return null;
  const tone =
    copy.tone === "good"
      ? "bg-[var(--ls-accent)] text-[var(--ls-ink)]"
      : copy.tone === "try"
        ? "bg-[#FBEFE6] text-[#7A3B12]"
        : "bg-[var(--ls-soft)] text-[var(--ls-ink)]";
  return (
    <motion.p
      role="status"
      initial={{ opacity: 0, y: 10, scale: 0.96, rotate: -1.5 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: -1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ type: "spring", duration: 0.45, bounce: 0.25 }}
      className={`lesson-sketch-sm lesson-hand flex items-center gap-2 px-3 py-2 text-[18px] font-bold ${tone}`}>
      {copy.tone === "good" ? <Check size={16} aria-hidden /> : copy.tone === "try" ? <X size={16} aria-hidden /> : null}
      {t(copy.key)}
    </motion.p>
  );
}

const cardClass = questionCardClass;

/** Outcomes after which the learner should change the answer on the card and check it again (the server keeps the check open). */
const TRY_AGAIN = new Set<AnswerResult["outcome"]>(["incorrect"]);

function CheckCard({ check, onResult, subject }: { check: CheckItem; onResult: (r: AnswerResult) => void; subject: string | null }) {
  const t = useUiText();
  const answer = useLessonStore((s) => s.answer);
  const askHint = useLessonStore((s) => s.askHint);
  const notDelivered = useLessonStore((s) => s.notDeliveredItemId === check.id);
  const cardRef = useRef<HTMLFormElement>(null);
  // The delivery is confirmed once the card is actually on screen.
  useCheckShown(cardRef, check.id);
  const [selected, setSelected] = useState<string | null>(null);
  const format = formatOf(check);
  const arrangedFormat = isArranged(format);
  // What the learner has built for a multiple-select, matching or sequencing check (the board draws these itself).
  const [arranged, setArranged] = useState<Arrangement>(() => initialArrangement(check));
  const [typed, setTyped] = useState("");
  // A maths lesson's answer box is typed like any other, with maths from its `/` menu: it holds LaTeX, and `typed` is
  // what is sent (the words as typed, the maths in the checker's form). Other subjects keep the plain box.
  const [answerLatex, setAnswerLatex] = useState("");
  const isMath = isMathsSubject(subject);
  // The field's value as of the last key, so an Enter typed right after it sends what is in the box.
  const latexNow = useRef("");
  const mathRef = useRef<MathFieldHandle>(null);
  const onMath = (latex: string) => {
    setTried(false);
    latexNow.current = latex;
    setAnswerLatex(latex);
    setTyped(answerFromField(latex));
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The last check of this answer came back to change (the card is still open): it stays marked, with a note, until the learner
  // changes something. `nudge` shakes the answer once each time.
  const [tried, setTried] = useState(false);
  const [nudge, setNudge] = useState(0);
  /** A change to the answer: what was marked to change no longer is. */
  const edited = <T,>(set: (value: T) => void) => (value: T) => {
    setTried(false);
    set(value);
  };
  const arrange = (patch: Partial<Arrangement>) => edited(setArranged)({ ...arranged, ...patch });
  const isChoice = format === "single_choice";
  const isTyped = TYPED_TYPES.has(check.response_type) && !arrangedFormat; // a line, slider or tiles replaces the typed box
  // A calculation typed as the answer ("540 * 40", "sqrt(144)") is worked out as they type. There are no
  // calculator keys: whatever they type (2^3, pi, log 100, sin 30…) is worked out. For a number answer its
  // result is what's sent; for an expression or words, what they typed is (√2 stays √2), and the result only helps.
  const sum = isTyped ? calculation(isMath && answerLatex ? calcTextFromField(answerLatex) : typed) : null;

  useEffect(() => {
    setSelected(null);
    setArranged(initialArrangement(check));
    setTyped("");
    setAnswerLatex("");
    latexNow.current = "";
    setError(null);
    setTried(false);
    // A new question starts at its top, whatever the dock was scrolled to for the last one.
    cardRef.current?.closest<HTMLElement>("[data-no-pan]")?.scrollTo?.({ top: 0 });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reset per question (`check.id`), not on every payload refresh
  }, [check.id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    // A maths answer is read from the field as it is now, not from the last render.
    const answerNow = isMath ? answerFromField(latexNow.current) : typed;
    const sumNow = isMath ? calculation(latexNow.current ? calcTextFromField(latexNow.current) : "") : sum;
    const response: AnswerResponse | null = arrangedFormat
      ? responseFromArrangement(check, arranged)
      : isChoice
      ? selected ? { kind: "choice", option_ids: [selected] } : null
      : answerNow.trim() ? responseFor(check, check.response_type === "numeric" ? numericAnswerToSend(answerNow, sumNow) : answerNow) : null;
    if (!response) return;
    setBusy(true);
    setError(null);
    try {
      const result = await answer(check.id, response);
      if (result) {
        onResult(result);
        if (TRY_AGAIN.has(result.outcome)) {
          setTried(true);
          setNudge((n) => n + 1);
        }
      }
    } catch (e) {
      setError(asError(e).message || "That answer couldn't be sent.");
    } finally {
      setBusy(false);
    }
  };

  const tone = tried ? ("try" as const) : null;
  const progress = progressNote(check, { arranged, selected, typed });
  const canCheck = isChoice || isTyped || arrangedFormat;
  // Blanks drawn inside their sentence: the sentence is the question on screen, and a screen reader hears it with each blank named.
  const pieces = format === "blanks" ? blankPieces(check.prompt, check.left_entries ?? []) : null;
  const spokenPrompt = pieces
    ? pieces.map((piece) => ("blank" in piece ? ` ${t("blankN", { n: piece.blank })} ` : piece.text)).join("").replace(/\s+/g, " ").replace(/ ([,.;:!?])/g, "$1").trim()
    : undefined;

  return (
    <QuestionShell
      check={check}
      formRef={cardRef}
      onSubmit={submit}
      nudge={nudge}
      promptHidden={spokenPrompt}
      progress={canCheck ? progress : null}
      onHint={() => void askHint(check.id)}
      actions={
        canCheck && (
          <SketchButton
            type="submit"
            disabled={busy || (arrangedFormat ? !isComplete(check, arranged) : isChoice ? !selected : !typed.trim())}
            loading={busy}
            aria-describedby={progress ? progressIdFor(check.id) : undefined}
          >
            {t("checkAnswer")}
          </SketchButton>
        )
      }
      messages={
        (error || notDelivered || tried) && (
          <>
            {error && <QuestionMessage tone="danger" alert>{error}</QuestionMessage>}
            {/* The answer wasn't counted because the question hadn't reached your tutor's session yet: neutral, never "incorrect". */}
            {notDelivered && !error && <QuestionMessage tone="info">{t("gettingReady")}</QuestionMessage>}
            {tried && !error && <QuestionMessage tone="warn">{t("tryChange")}</QuestionMessage>}
          </>
        )
      }
    >
      {isChoice && <SingleChoice check={check} selected={selected} onSelect={edited(setSelected)} tone={tone} disabled={busy} />}

      {format === "multiple_select" && (
        // No tone per option: the server says only that the set is not right, never which option, so none is marked as the one to change.
        <MultiSelect check={check} chosen={arranged.chosen} onChange={(chosen) => arrange({ chosen })} disabled={busy} />
      )}
      {format === "sequencing" && (
        <Sequencing check={check} order={arranged.order} onChange={(order) => arrange({ order })} disabled={busy} />
      )}
      {(format === "number_line" || format === "slider") && (
        <LineInput check={check} number={arranged.number} onChange={(number) => arrange({ number })} disabled={busy} />
      )}
      {format === "tile_builder" && (
        <TileBuilder check={check} built={arranged.built} onChange={(built) => arrange({ built })} disabled={busy} />
      )}
      {format === "grouping" && (
        <GroupSorter check={check} pairs={arranged.pairs} onChange={(pairs) => arrange({ pairs })} disabled={busy} />
      )}
      {format === "blanks" && (
        <BlankFiller check={check} pairs={arranged.pairs} onChange={(pairs) => arrange({ pairs })} disabled={busy} />
      )}
      {format === "matching_pairs" && (
        <Matching check={check} pairs={arranged.pairs} onChange={(pairs) => arrange({ pairs })} disabled={busy} />
      )}

      {isTyped && (
        <div className="mt-4">
          {isMath ? (
            <>
              {/* The field is named by its own label for assistive tech; this is the same name, shown. */}
              <p aria-hidden className="lesson-hand mb-1 text-[16px] text-[var(--ls-ink-mid)]">{t("yourAnswer")}</p>
              {/* The whole answer line takes a click, its padding and dashed rule too, not only the field inside it. */}
              <div
                onMouseDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  e.preventDefault();
                  mathRef.current?.focus();
                }}
                className="lesson-answer-field cursor-text border-b-2 border-dashed border-[var(--ls-ink-faint)] px-1 py-2 text-[20px] text-[var(--ls-ink)] focus-within:border-solid focus-within:border-[var(--ls-primary)]"
              >
                <MathField
                  ref={mathRef}
                  value={answerLatex}
                  onChange={onMath}
                  onEnter={(now) => { latexNow.current = now; cardRef.current?.requestSubmit(); }}
                  disabled={busy}
                  ariaLabel={t("yourAnswer")}
                  placeholder={`${t("yourAnswer")} ( / for maths )`}
                />
              </div>
              {sum && (
                <p id={`sum-${check.id}`} aria-live="polite" className="lesson-hand mt-1.5 px-1 text-[18px] text-[var(--ls-primary)]">
                  = {sum}
                </p>
              )}
            </>
          ) : (
          <>
          <label htmlFor={`answer-${check.id}`} className="lesson-hand mb-1 block text-[16px] text-[var(--ls-ink-mid)]">{t("yourAnswer")}</label>
          <div className="relative">
            <input
              id={`answer-${check.id}`}
              value={typed}
              onChange={(e) => edited(setTyped)(e.target.value)}
              inputMode="text"
              maxLength={check.response_type === "numeric" ? 64 : 500}
              autoComplete="off"
              aria-describedby={sum ? `sum-${check.id}` : undefined}
              className="lesson-hand w-full border-0 border-b-2 border-dashed border-[var(--ls-ink-faint)] bg-transparent px-1 py-2 text-[20px] text-[var(--ls-ink)] outline-none placeholder:text-[var(--ls-ink-faint)] focus:border-solid focus:border-[var(--ls-primary)]"
            />
            {/* The worked-out result, written on just after what they typed, like a calculator's ghost. */}
            <AnimatePresence>
              {sum && (
                <motion.p
                  id={`sum-${check.id}`}
                  aria-live="polite"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="lesson-hand pointer-events-none absolute inset-y-0 left-0 flex items-center overflow-hidden whitespace-pre px-1 text-[20px]"
                >
                  <span className="invisible">{typed}</span>
                  <span className="text-[var(--ls-primary)]"> = {sum}</span>
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          </>
          )}
        </div>
      )}

      {!canCheck && (
        <p className="lesson-hand mt-3 text-[17px] text-[var(--ls-ink-mid)]">{t("typeInChat")}</p>
      )}
    </QuestionShell>
  );
}

function ConfirmReading({ check, original, suggestion }: { check: CheckItem; original: string; suggestion: string }) {
  const answer = useLessonStore((s) => s.answer);
  const [busy, setBusy] = useState(false);
  const resubmit = async (value: string) => {
    setBusy(true);
    try {
      await answer(check.id, responseFor(check, value), { confirmedReading: true });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={cardClass}>
      <h2 className="lesson-hand text-[21px] font-bold">
        Did you mean <span className="lesson-hand text-[20px] text-[var(--ls-primary)]">{suggestion}</span>?
      </h2>
      <p className="lesson-hand mt-1 text-[17px] text-[var(--ls-ink-mid)]">You wrote “{original}”.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <SketchButton disabled={busy} onClick={() => void resubmit(suggestion)}>Yes, {suggestion}</SketchButton>
        <SketchButton variant="secondary" disabled={busy} onClick={() => void resubmit(original)}>No, keep “{original}”</SketchButton>
      </div>
    </div>
  );
}

/**
 * What the learner can do on the board right now, read off the lesson state:
 * a check to answer, a reading to confirm, a choice after a failed round, or
 * (on a teach step where the backend allows it) moving on. Nothing here decides correctness
 * or progression; every outcome comes back from the backend.
 */
export function StepCard({ subject = null }: { subject?: string | null }) {
  const t = useUiText();
  const instance = useLessonStore((s) => s.instance);
  const payload = useLessonStore((s) => s.payload);
  const done = useLessonStore((s) => s.done);
  const choose = useLessonStore((s) => s.choose);
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null);
  const [resultKey, setResultKey] = useState(0);
  const showResult = (result: AnswerResult) => {
    setLastResult(result);
    setResultKey((k) => k + 1);
  };
  // A result pops up for a moment, then slips away.
  useEffect(() => {
    if (!lastResult) return;
    const timer = window.setTimeout(() => setLastResult(null), NOTE_MS);
    return () => window.clearTimeout(timer);
  }, [lastResult, resultKey]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const node = instance?.active_node;
  // A result belongs to the step it was given on.
  useEffect(() => setLastResult(null), [node?.instance_node_id]);
  if (!instance || instance.state !== "active" || !node || !payload) return null;

  const checks = new Map(payload.node.check_items.map((c) => [c.id, c]));
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(asError(e).message || "That didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  };

  let body: React.ReactNode = null;
  const reading = node.pending_reading;
  const unanswered = node.check_item_ids.filter((id) => !node.answered_item_ids.includes(id));

  if (instance.next_action === "choose" && node.choice) {
    body = (
      <div className={cardClass}>
        <h2 className="lesson-hand text-[21px] font-bold">{t("roundTricky")}</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {node.choice.options.map((option) => (
            <SketchButton
              key={option}
              variant={option === node.choice!.recommended ? "primary" : "secondary"}
              disabled={busy}
              onClick={() => void run(() => choose(option))}
            >
              {option === "try_now" ? t("tryNew") : t("keepGoing")}
            </SketchButton>
          ))}
        </div>
      </div>
    );
  } else if (reading && checks.get(reading.item_id)) {
    body = <ConfirmReading check={checks.get(reading.item_id)!} original={reading.original} suggestion={reading.suggestion} />;
  } else if (node.check_presented !== false && unanswered.some((id) => checks.has(id))) {
    // On a W2 lesson the check is on screen only once the tutor has presented it (backend ADR 0045).
    // A compliant (rule R) lesson's payload carries only the check the application selected next, which need not be the first unanswered one.
    const current = checks.get(unanswered.find((id) => checks.has(id))!)!;
    body =
      formatOf(current) === "written_response" ? (
        <WrittenAnswer check={current} onResult={(r) => showResult({ attempt_id: r.attempt_id, outcome: r.outcome ?? "unscorable", correct: r.correct, eligibility_reason: null, round_id: null, round_state: r.round_state, replayed: r.replayed, instance: r.instance })} />
      ) : formatOf(current) === "spoken_response" ? (
        <SpokenAnswer check={current} />
      ) : (
        <CheckCard key={current.id} check={current} onResult={showResult} subject={subject} />
      );
  } else if (node.type === "teach" && node.done_available) {
    // Only a legacy plan still advertises a learner's done (backend ADR 0038 decision 6). A W2 part never does: it moves on only by
    // the evidence of its checks (ADR 0045). No count of replies is ever shown.
    body = (
      <div className={`${cardClass} flex flex-wrap items-center gap-4`}>
        <p className="lesson-hand flex-1 text-[20px] font-bold">{t("moveOn")}</p>
        <SketchButton disabled={busy} loading={busy} onClick={() => void run(done)}>
          {t("nextStep")} <ArrowRight size={16} aria-hidden />
        </SketchButton>
      </div>
    );
  }

  // Nothing to do or say on this step: render nothing, so the board's docked card disappears.
  if (!lastResult && !body && !error) return null;

  return (
    // `mt-auto` sits the card at the foot of its dock; when taller than the dock, it scrolls from the top.
    <div className="mt-auto flex shrink-0 flex-col gap-3">
      <AnimatePresence>{lastResult && <ResultNote key={resultKey} result={lastResult} />}</AnimatePresence>
      {body}
      {error && <QuestionMessage tone="danger" alert>{error}</QuestionMessage>}
    </div>
  );
}
