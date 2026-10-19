"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, HelpCircle, Loader2, Play, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { sourcesService } from "../services/sourcesService";
import type {
  QuestionsResponse,
  ReconciliationAnswer,
  ReconciliationCandidate,
  ReconciliationQuestion,
  RecordedAnswer,
} from "../types/sources";
import type { Subject } from "../store/usePartnerStore";

interface SourceQuestionsModalProps {
  /** The chapter whose questions to answer; null keeps the popup closed. */
  subject: Subject | null;
  onClose: () => void;
  /** Answers saved: the registry refreshes. */
  onSaved: () => void;
  /** Queue the chapter's next run, which takes the answers to the worker. */
  onRerun: (subject: Subject) => Promise<void>;
}

/** Most-similar candidates shown at once; the rest are one click away. */
export const SHOWN_CANDIDATES = 3;

/** A radio value: `novel`, `same_as:<proposal key>` or `match:<component id>`. */
type Choice = string;

const choiceOf = (a: RecordedAnswer | null): Choice | null =>
  !a ? null : a.decision === "novel" ? "novel" : a.decision === "same_as" ? `same_as:${a.proposal_key}` : `match:${a.component_id}`;

function answerOf(choice: Choice): RecordedAnswer {
  if (choice === "novel") return { decision: "novel" };
  const [decision, ref] = [choice.slice(0, choice.indexOf(":")), choice.slice(choice.indexOf(":") + 1)];
  return decision === "same_as" ? { decision: "same_as", proposal_key: ref } : { decision: "match", component_id: ref };
}

const percent = (x: number) => `${Math.round(x * 100)}%`;

export function SourceQuestionsModal(props: SourceQuestionsModalProps) {
  const { subject, onClose } = props;
  return (
    <Modal
      open={!!subject}
      onClose={onClose}
      size="full"
      title={subject ? `Questions about ${subject.title}` : "Questions"}
      panelStyle={{ maxWidth: "min(880px, 100%)", background: "#F8F9F8" }}
    >
      {/* Keyed so each chapter starts from its own recorded answers. */}
      {subject && <QuestionsBody key={subject.source_id} {...props} subject={subject} />}
    </Modal>
  );
}

function QuestionsBody({ subject, onClose, onSaved, onRerun }: SourceQuestionsModalProps & { subject: Subject }) {
  const [data, setData] = useState<QuestionsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [saving, setSaving] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAll, setSavedAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    sourcesService
      .questions(subject.source_id)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setChoices(Object.fromEntries(res.questions.flatMap((q) => (q.answer ? [[q.key, choiceOf(q.answer)!]] : []))));
        setSavedAll(res.questions.length > 0 && res.questions.every((q) => q.answer));
      })
      .catch((e) => !cancelled && setLoadError(asError(e).message || "Couldn't load the questions."));
    return () => {
      cancelled = true;
    };
  }, [subject.source_id]);

  const questions = useMemo(() => data?.questions ?? [], [data]);
  const allowed = data?.allowed_answers ?? [];
  const answered = questions.filter((q) => choices[q.key]).length;
  const changed = questions.some((q) => choices[q.key] && choices[q.key] !== choiceOf(q.answer));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const decisions = Object.fromEntries(
        questions.filter((q) => choices[q.key]).map((q) => [q.key, answerOf(choices[q.key])]),
      );
      const res = await sourcesService.answerQuestions(subject.source_id, decisions);
      setData(res);
      setSavedAll(res.questions.every((q) => q.answer));
      onSaved();
    } catch (e) {
      setError(asError(e).message || "The answers weren't saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const rerun = async () => {
    setRerunning(true);
    setError(null);
    try {
      await onRerun(subject);
      onClose();
    } catch (e) {
      setError(asError(e).message || "The chapter didn't start. Please try again.");
      setRerunning(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <header className="shrink-0 flex items-start gap-4 px-5 md:px-7 pt-6 pb-4 bg-white border-b border-[#1A3D2C]/5">
        <div className="h-11 w-11 shrink-0 rounded-2xl bg-[#1A3D2C] text-white flex items-center justify-center">
          <HelpCircle size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#1A3D2C]/40">Concepts that look alike</p>
          <h2 className="text-lg md:text-xl font-black text-[#1A3D2C] tracking-tight truncate">{subject.title}</h2>
          <p className="text-xs text-[#1A3D2C]/60 mt-1 max-w-xl">
            The run found concepts that look like others. It never decides on its own whether two concepts are the
            same, so tell it: is each one new, or the same as another concept in this chapter?
          </p>
        </div>
        <Button iconOnly variant="tertiary" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </Button>
      </header>

      <div className="flex-1 px-5 md:px-7 py-5 flex flex-col gap-4">
        {loadError ? (
          <p role="alert" className="text-sm font-bold text-[#1A3D2C]/70 py-10 text-center">{loadError}</p>
        ) : !data ? (
          <p className="flex items-center justify-center gap-2 text-sm font-bold text-[#1A3D2C]/40 py-10">
            <Loader2 size={16} className="animate-spin" aria-hidden /> Loading the questions…
          </p>
        ) : (
          questions.map((q, i) => (
            <QuestionCard
              key={q.key}
              index={i + 1}
              question={q}
              allowed={allowed}
              choice={choices[q.key] ?? null}
              onChoose={(c) => {
                setChoices((prev) => ({ ...prev, [q.key]: c }));
                setSavedAll(false);
              }}
            />
          ))
        )}
      </div>

      {data && (
        <footer className="sticky bottom-0 shrink-0 bg-white border-t border-[#1A3D2C]/5 px-5 md:px-7 py-4 flex flex-col gap-3">
          {error && (
            <p role="alert" className="flex items-start gap-2 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <AlertCircle size={14} className="mt-px shrink-0" aria-hidden /> {error}
            </p>
          )}
          {savedAll && !changed ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p role="status" className="flex-1 flex items-center gap-2 text-sm font-bold text-[#1A3D2C]">
                <CheckCircle2 size={16} className="text-emerald-600" aria-hidden />
                Answers saved. Run the chapter again to use them.
              </p>
              <Button leadingIcon={<Play size={14} />} loading={rerunning} onClick={() => void rerun()}>
                Run the chapter again
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="flex-1 text-xs font-bold text-[#1A3D2C]/50">
                {answered} of {questions.length} answered
              </p>
              <Button disabled={answered === 0 || !changed} loading={saving} onClick={() => void save()}>
                Save answers
              </Button>
            </div>
          )}
        </footer>
      )}
    </div>
  );
}

function QuestionCard({
  index,
  question,
  allowed,
  choice,
  onChoose,
}: {
  index: number;
  question: ReconciliationQuestion;
  allowed: ReconciliationAnswer[];
  choice: Choice | null;
  onChoose: (choice: Choice) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const group = useId();
  const ranked = [...question.candidates].sort((a, b) => b.similarity - a.similarity);
  const p = question.proposal;

  const pickable = (c: ReconciliationCandidate) =>
    c.where === "this_chapter" ? allowed.includes("same_as") && !!c.proposal_key : allowed.includes("match") && !!c.component_id;
  const valueOf = (c: ReconciliationCandidate) => (c.where === "this_chapter" ? `same_as:${c.proposal_key}` : `match:${c.component_id}`);
  // An answer that picks a less similar concept keeps the full list open, so the choice is never hidden.
  const choiceHidden = !!choice && choice !== "novel" && !ranked.slice(0, SHOWN_CANDIDATES).some((c) => valueOf(c) === choice);
  const expanded = showAll || choiceHidden;
  const shown = expanded ? ranked : ranked.slice(0, SHOWN_CANDIDATES);

  return (
    <section aria-label={`Question ${index}: ${p.title}`} className="rounded-2xl bg-white border border-[#1A3D2C]/5 p-4 md:p-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#1A3D2C]/40">Question {index}</p>
      <h3 className="mt-1 text-base font-black text-[#1A3D2C]">{p.title}</h3>
      <p className="mt-1 text-sm text-[#1A3D2C]/70 leading-relaxed">{p.definition}</p>
      <p className="mt-1.5 text-[10px] font-black uppercase tracking-widest text-[#1A3D2C]/35">{p.lo_code}</p>

      <fieldset className="mt-4">
        <legend className="text-[10px] font-black uppercase tracking-widest text-[#1A3D2C]/50 mb-2">Is it…</legend>
        <div className="flex flex-col gap-1.5">
          <Option group={group} value="novel" checked={choice === "novel"} onChoose={onChoose}>
            <span className="text-sm font-bold text-[#1A3D2C]">It&apos;s a new concept</span>
          </Option>

          {shown.map((c) => {
            const canPick = pickable(c);
            const label = (
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                {canPick && <span className="text-sm text-[#1A3D2C]/60">Same as</span>}
                <span className="text-sm font-bold text-[#1A3D2C]">{c.title}</span>
                <span className="text-[10px] font-black tabular-nums text-[#1A3D2C]/50">{percent(c.similarity)} alike</span>
                <span
                  className={`px-2 py-px rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    c.where === "this_chapter" ? "bg-[#D1E6D9]/40 text-[#1A3D2C] border-[#1A3D2C]/10" : "bg-sky-50 text-sky-700 border-sky-200"
                  }`}
                >
                  {c.where === "this_chapter" ? "This chapter" : "Catalogue"}
                </span>
              </span>
            );
            return canPick ? (
              <Option key={valueOf(c)} group={group} value={valueOf(c)} checked={choice === valueOf(c)} onChoose={onChoose}>
                {label}
              </Option>
            ) : (
              <div key={valueOf(c)} className="flex items-start gap-3 rounded-xl px-3 py-2 bg-[#F8F9F8]">
                <span className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                <div className="min-w-0">
                  {label}
                  <p className="text-[11px] text-[#1A3D2C]/50 mt-0.5">
                    Already published. Only a GenEd admin can match a concept to it.
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {ranked.length > SHOWN_CANDIDATES && !choiceHidden && (
          <Button variant="tertiary" size="sm" className="mt-2" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show fewer" : `Show ${ranked.length - SHOWN_CANDIDATES} less similar`}
          </Button>
        )}
      </fieldset>
    </section>
  );
}

function Option({
  group,
  value,
  checked,
  onChoose,
  children,
}: {
  group: string;
  value: Choice;
  checked: boolean;
  onChoose: (choice: Choice) => void;
  children: React.ReactNode;
}) {
  return (
    // `relative` keeps the hidden radio inside its row; see LearningOutcomePicker for why that matters in a modal.
    <label
      className={`relative flex items-start gap-3 rounded-xl px-3 py-2 cursor-pointer border transition-colors ${
        checked ? "border-[#1A3D2C] bg-[#D1E6D9]/30" : "border-transparent hover:bg-[#F8F9F8]"
      }`}
    >
      <input type="radio" name={group} value={value} checked={checked} onChange={() => onChoose(value)} className="peer sr-only" />
      <span
        aria-hidden
        className={`mt-1 h-4 w-4 shrink-0 rounded-full border-[1.5px] flex items-center justify-center peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#1A3D2C]/40 ${
          checked ? "border-[#1A3D2C]" : "border-[#1A3D2C]/30"
        }`}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-[#1A3D2C]" />}
      </span>
      {children}
    </label>
  );
}
