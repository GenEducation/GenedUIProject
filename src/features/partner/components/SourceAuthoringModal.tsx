"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, PenLine, Play, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { sourcesService } from "../services/sourcesService";
import { removedReason } from "../utils/ingestionPath";
import type {
  AddedAnswerKind,
  AddedQuestion,
  AuthoredQuestions,
  AuthoringConcept,
  AuthoringResponse,
  PrintedAnswer,
  RemovedQuestion,
} from "../types/sources";
import type { Subject } from "../store/usePartnerStore";

interface SourceAuthoringModalProps {
  /** The chapter whose questions to complete; null keeps the popup closed. */
  subject: Subject | null;
  onClose: () => void;
  /** Questions saved: the registry refreshes. */
  onSaved: () => void;
  /** Queue the chapter's next run, which takes the questions to the worker. */
  onRerun: (subject: Subject) => Promise<void>;
}

/** How often to look for the AI's drafts while they are being written. */
export const SUGGESTIONS_POLL_MS = 4000;

/** A printed question's key while being typed: the chosen option, a number, or accepted words (one per line). */
interface AnswerDraft {
  kind: "option" | "numeric" | "words";
  value: string;
  concept: string;
}

const KIND_LABEL: Record<AddedAnswerKind, string> = {
  numeric: "A number",
  mcq: "Multiple choice",
  string_set: "Short answer",
};

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const newId = () => (globalThis.crypto?.randomUUID?.() ?? `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

function draftOf(q: RemovedQuestion, a: PrintedAnswer | undefined): AnswerDraft {
  const concept = a?.concept_key ?? "";
  if (q.options.length) return { kind: "option", value: a?.correct_option_index?.toString() ?? "", concept };
  if (a?.accepted_answers) return { kind: "words", value: a.accepted_answers.join("\n"), concept };
  return { kind: q.reason === "answer_check_disagreed" ? "numeric" : "words", value: a?.expected_numeric ?? "", concept };
}

/** The key to save, or null while the draft is incomplete. */
export function answerOf(q: RemovedQuestion, d: AnswerDraft): PrintedAnswer | null {
  if (q.needs_concept && !d.concept) return null;
  const concept = d.concept ? { concept_key: d.concept } : {};
  if (d.kind === "option") return d.value === "" ? null : { correct_option_index: Number(d.value), ...concept };
  if (d.kind === "numeric") return d.value.trim() ? { expected_numeric: d.value.trim(), ...concept } : null;
  const words = lines(d.value);
  return words.length ? { accepted_answers: words, ...concept } : null;
}

/** Why an added question cannot be saved yet, or null when it can. */
export function addedProblem(q: AddedQuestion): string | null {
  if (!q.section_key || !q.concept_key) return "Choose the part of the chapter and the concept it checks.";
  if (q.prompt.trim().length < 3) return "Write the question.";
  if (q.answer_kind === "numeric" && !q.expected_numeric?.trim()) return "Give the number that answers it.";
  if (q.answer_kind === "mcq") {
    const options = q.options ?? [];
    if (options.length < 2 || new Set(options).size !== options.length) return "Give at least two different choices.";
    if (q.correct_option_index == null || q.correct_option_index >= options.length) return "Mark the correct choice.";
  }
  if (q.answer_kind === "string_set" && !q.accepted_answers?.length) return "Give the answers to accept.";
  return null;
}

export function SourceAuthoringModal(props: SourceAuthoringModalProps) {
  const { subject, onClose } = props;
  return (
    <Modal
      open={!!subject}
      onClose={onClose}
      size="full"
      title={subject ? `Add questions to ${subject.title}` : "Add questions"}
      panelStyle={{ maxWidth: "min(920px, 100%)", background: "#F6F7F2" }}
    >
      {/* Keyed so each chapter starts from its own saved questions. */}
      {subject && <AuthoringBody key={subject.source_id} {...props} subject={subject} />}
    </Modal>
  );
}

function AuthoringBody({ subject, onClose, onSaved, onRerun }: SourceAuthoringModalProps & { subject: Subject }) {
  const [data, setData] = useState<AuthoringResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [added, setAdded] = useState<AddedQuestion[]>([]);
  const [editing, setEditing] = useState<AddedQuestion | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [asking, setAsking] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adopt = useCallback((res: AuthoringResponse, keepWork: boolean) => {
    setData(res);
    if (keepWork) return;
    setAnswers(Object.fromEntries(res.removed.map((q) => [q.item_key, draftOf(q, res.authored.answers[q.item_key])])));
    setAdded(res.authored.added);
    setDirty(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    sourcesService
      .authoring(subject.source_id)
      .then((res) => !cancelled && adopt(res, false))
      .catch((e) => !cancelled && setLoadError(asError(e).message || "Couldn't load the chapter's questions."));
    return () => {
      cancelled = true;
    };
  }, [subject.source_id, adopt]);

  // Poll while the AI writes drafts; the partner's unsaved work is kept.
  const pending = data?.suggestions?.state === "requested" || data?.suggestions?.state === "running";
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => {
      sourcesService.authoring(subject.source_id).then((res) => adopt(res, true)).catch(() => undefined);
    }, SUGGESTIONS_POLL_MS);
    return () => clearInterval(t);
  }, [pending, subject.source_id, adopt]);

  const removed = data?.removed ?? [];
  const concepts = data?.concepts ?? [];
  const sections = data?.sections ?? [];
  const keyed = removed.flatMap((q) => {
    const a = answers[q.item_key] && answerOf(q, answers[q.item_key]);
    return a ? [[q.item_key, a] as const] : [];
  });
  const total = keyed.length + added.length;
  const savedOnce = !!data?.authored_at;
  const acceptedDrafts = new Set(added.map((q) => q.prompt.trim()));
  const drafts = (data?.suggestions?.drafts ?? []).filter((d) => !acceptedDrafts.has(d.prompt.trim()));

  const touch = () => {
    setDirty(true);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body: AuthoredQuestions = { answers: Object.fromEntries(keyed), added };
      adopt(await sourcesService.saveAuthoring(subject.source_id, body), false);
      onSaved();
    } catch (e) {
      setError(asError(e).message || "The questions weren't saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const suggest = async () => {
    setAsking(true);
    setError(null);
    try {
      adopt(await sourcesService.suggestQuestions(subject.source_id), true);
    } catch (e) {
      setError(asError(e).message || "Couldn't ask for suggestions. Please try again.");
    } finally {
      setAsking(false);
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

  const putAdded = (q: AddedQuestion) => {
    setAdded((prev) => (prev.some((x) => x.id === q.id) ? prev.map((x) => (x.id === q.id ? q : x)) : [...prev, q]));
    setEditing(null);
    touch();
  };

  return (
    <div className="flex flex-col min-h-full">
      <header className="shrink-0 flex items-start gap-4 px-5 md:px-7 pt-6 pb-4 bg-white border-b border-[#122D30]/5">
        <div className="h-11 w-11 shrink-0 rounded-2xl bg-[#075E63] text-white flex items-center justify-center">
          <PenLine size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#122D30]/40">Questions GenEd can check</p>
          <h2 className="text-lg md:text-xl font-black text-[#122D30] tracking-tight truncate">{subject.title}</h2>
          <p className="text-xs text-[#122D30]/60 mt-1 max-w-xl">
            Every concept needs questions with an answer GenEd can check, and this run found too few. Confirm the
            answers of printed questions, write your own, or let AI suggest some. Nothing reaches students until you
            review and publish the next run.
          </p>
        </div>
        <Button iconOnly variant="tertiary" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </Button>
      </header>

      <div className="flex-1 px-5 md:px-7 py-5 flex flex-col gap-6">
        {loadError ? (
          <p role="alert" className="text-sm font-bold text-[#122D30]/70 py-10 text-center">{loadError}</p>
        ) : !data ? (
          <p className="flex items-center justify-center gap-2 text-sm font-bold text-[#122D30]/40 py-10">
            <Loader2 size={16} className="animate-spin" aria-hidden /> Loading the chapter…
          </p>
        ) : (
          <>
            {removed.length > 0 && (
              <Section title="Printed questions to confirm" hint="GenEd removed these. Give the answer and they count again.">
                {removed.map((q) => (
                  <RemovedCard
                    key={q.item_key}
                    question={q}
                    concepts={concepts.filter((c) => c.section_key === q.section_key)}
                    draft={answers[q.item_key] ?? draftOf(q, undefined)}
                    onChange={(d) => {
                      setAnswers((prev) => ({ ...prev, [q.item_key]: d }));
                      touch();
                    }}
                  />
                ))}
              </Section>
            )}

            <Section title="Your questions" hint="Each question checks one concept the run found.">
              {added.length === 0 && !editing && (
                <p className="text-sm text-[#122D30]/50">No questions of your own yet.</p>
              )}
              {added.map((q) =>
                editing?.id === q.id ? null : (
                  <AddedRow
                    key={q.id}
                    question={q}
                    concept={concepts.find((c) => c.key === q.concept_key)}
                    onEdit={() => setEditing(q)}
                    onRemove={() => {
                      setAdded((prev) => prev.filter((x) => x.id !== q.id));
                      touch();
                    }}
                  />
                ),
              )}
              {editing ? (
                <QuestionForm
                  key={editing.id}
                  initial={editing}
                  sections={sections}
                  concepts={concepts}
                  onDone={putAdded}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  leadingIcon={<Plus size={14} />}
                  disabled={concepts.length === 0}
                  onClick={() => setEditing(blank(sections[0]?.key ?? "", concepts))}
                >
                  Write a question
                </Button>
              )}
            </Section>

            <Section title="Suggested by AI" hint="AI drafts questions from the chapter's text. Check each one before you accept it.">
              {data.suggestions?.state === "failed" && (
                <p className="text-sm font-bold text-red-700">{data.suggestions.detail || "The AI couldn't write suggestions this time."}</p>
              )}
              {pending ? (
                <p role="status" className="flex items-center gap-2 text-sm font-bold text-[#122D30]/50">
                  <Loader2 size={14} className="animate-spin" aria-hidden /> Writing suggestions…
                </p>
              ) : data.suggestions?.state === "ready" && drafts.length === 0 ? (
                <p className="text-sm text-[#122D30]/50">No suggestions left to review.</p>
              ) : null}
              {drafts.map((d) => (
                <AddedRow
                  key={d.id}
                  question={d}
                  concept={concepts.find((c) => c.key === d.concept_key)}
                  draft
                  onEdit={() => setEditing({ ...d, id: newId(), origin: "ai_assisted" })}
                  onAccept={() => putAdded({ ...d, id: newId(), origin: "ai_assisted" })}
                />
              ))}
              {data.can_suggest && !pending && (
                <Button variant="secondary" size="sm" leadingIcon={<Sparkles size={14} />} loading={asking} onClick={() => void suggest()}>
                  {data.suggestions ? "Suggest more questions" : "Suggest questions"}
                </Button>
              )}
            </Section>
          </>
        )}
      </div>

      {data && (
        <footer className="sticky bottom-0 shrink-0 bg-white border-t border-[#122D30]/5 px-5 md:px-7 py-4 flex flex-col gap-3">
          {error && (
            <p role="alert" className="flex items-start gap-2 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <AlertCircle size={14} className="mt-px shrink-0" aria-hidden /> {error}
            </p>
          )}
          {savedOnce && !dirty && total > 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p role="status" className="flex-1 flex items-center gap-2 text-sm font-bold text-[#122D30]">
                <CheckCircle2 size={16} className="text-emerald-600" aria-hidden />
                {total} {total === 1 ? "question" : "questions"} saved. Run the chapter again to use them.
              </p>
              <Button leadingIcon={<Play size={14} />} loading={rerunning} onClick={() => void rerun()}>
                Run with these questions
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="flex-1 text-xs font-bold text-[#122D30]/50">
                {keyed.length} printed confirmed · {added.length} of your own
              </p>
              <Button disabled={!dirty || !!editing} loading={saving} onClick={() => void save()}>
                Save questions
              </Button>
            </div>
          )}
        </footer>
      )}
    </div>
  );
}

function blank(section: string, concepts: AuthoringConcept[]): AddedQuestion {
  return {
    id: newId(),
    section_key: section,
    concept_key: concepts.find((c) => c.section_key === section)?.key ?? "",
    prompt: "",
    answer_kind: "numeric",
    origin: "partner",
  };
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-black text-[#122D30]">{title}</h3>
        <p className="text-xs text-[#122D30]/50">{hint}</p>
      </div>
      {children}
    </section>
  );
}

const field = "w-full rounded-xl border border-[#122D30]/15 bg-white px-3 py-2 text-sm text-[#122D30] focus:outline-none focus:border-[#122D30]/50";
const label = "text-[10px] font-black uppercase tracking-widest text-[#122D30]/50";

function ConceptSelect({ concepts, value, onChange }: { concepts: AuthoringConcept[]; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={label}>Concept it checks</span>
      <select className={field} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose a concept…</option>
        {concepts.map((c) => (
          <option key={c.key} value={c.key}>{c.title}</option>
        ))}
      </select>
    </label>
  );
}

function RemovedCard({
  question,
  concepts,
  draft,
  onChange,
}: {
  question: RemovedQuestion;
  concepts: AuthoringConcept[];
  draft: AnswerDraft;
  onChange: (d: AnswerDraft) => void;
}) {
  const done = !!answerOf(question, draft);
  return (
    <article aria-label={question.prompt} className="rounded-2xl bg-white border border-[#122D30]/5 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm font-bold text-[#122D30] whitespace-pre-line">{question.prompt}</p>
        {done && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" aria-label="Answered" />}
      </div>
      <p className="text-[11px] text-[#122D30]/50">
        {removedReason(question.reason)}
        {question.run_key ? ` · GenEd read “${question.run_key}”` : ""}
      </p>
      {question.options.length > 0 ? (
        <fieldset className="flex flex-col gap-1">
          <legend className={`${label} mb-1`}>Correct choice</legend>
          {question.options.map((o, i) => (
            <label key={i} className="flex items-center gap-2 text-sm text-[#122D30]">
              <input
                type="radio"
                name={`opt-${question.item_key}`}
                checked={draft.value === String(i)}
                onChange={() => onChange({ ...draft, value: String(i) })}
              />
              {o}
            </label>
          ))}
        </fieldset>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <label className="flex flex-col gap-1">
            <span className={label}>Answer type</span>
            <select className={field} value={draft.kind} onChange={(e) => onChange({ ...draft, kind: e.target.value as AnswerDraft["kind"] })}>
              <option value="numeric">A number</option>
              <option value="words">Words</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>{draft.kind === "numeric" ? "The answer" : "Answers to accept (one per line)"}</span>
            {draft.kind === "numeric" ? (
              <input className={field} value={draft.value} onChange={(e) => onChange({ ...draft, value: e.target.value })} />
            ) : (
              <textarea className={field} rows={2} value={draft.value} onChange={(e) => onChange({ ...draft, value: e.target.value })} />
            )}
          </label>
        </div>
      )}
      {question.needs_concept && (
        <ConceptSelect concepts={concepts} value={draft.concept} onChange={(concept) => onChange({ ...draft, concept })} />
      )}
    </article>
  );
}

function keyText(q: AddedQuestion): string {
  if (q.answer_kind === "numeric") return q.expected_numeric ?? "";
  if (q.answer_kind === "mcq") return q.options?.[q.correct_option_index ?? -1] ?? "";
  return (q.accepted_answers ?? []).join(" / ");
}

function AddedRow({
  question,
  concept,
  draft,
  onEdit,
  onRemove,
  onAccept,
}: {
  question: AddedQuestion;
  concept?: AuthoringConcept;
  draft?: boolean;
  onEdit: () => void;
  onRemove?: () => void;
  onAccept?: () => void;
}) {
  return (
    <article aria-label={question.prompt} className="rounded-2xl bg-white border border-[#122D30]/5 p-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-2 py-px rounded-full text-[9px] font-black uppercase tracking-widest border bg-[#DCEBE7]/40 text-[#122D30] border-[#122D30]/10">
          {concept?.title ?? question.concept_key}
        </span>
        {question.origin === "ai_assisted" && (
          <span className="px-2 py-px rounded-full text-[9px] font-black uppercase tracking-widest border bg-violet-50 text-violet-700 border-violet-200">
            {draft ? "AI draft" : "AI assisted"}
          </span>
        )}
      </div>
      <p className="text-sm font-bold text-[#122D30] whitespace-pre-line">{question.prompt}</p>
      {question.answer_kind === "mcq" && (
        <p className="text-xs text-[#122D30]/60">Choices: {question.options?.join(" · ")}</p>
      )}
      <p className="text-xs text-[#122D30]/60">
        {KIND_LABEL[question.answer_kind]} · Answer: <span className="font-bold text-[#122D30]">{keyText(question)}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {onAccept && (
          <Button size="sm" leadingIcon={<Plus size={14} />} onClick={onAccept}>
            Accept
          </Button>
        )}
        <Button size="sm" variant="outline" leadingIcon={<PenLine size={14} />} onClick={onEdit}>
          {draft ? "Edit, then accept" : "Edit"}
        </Button>
        {onRemove && (
          <Button size="sm" variant="tertiary" leadingIcon={<Trash2 size={14} />} onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
    </article>
  );
}

function QuestionForm({
  initial,
  sections,
  concepts,
  onDone,
  onCancel,
}: {
  initial: AddedQuestion;
  sections: AuthoringResponse["sections"];
  concepts: AuthoringConcept[];
  onDone: (q: AddedQuestion) => void;
  onCancel: () => void;
}) {
  const [q, setQ] = useState(initial);
  const [optionsText, setOptionsText] = useState((initial.options ?? []).join("\n"));
  const [acceptedText, setAcceptedText] = useState((initial.accepted_answers ?? []).join("\n"));
  const [tried, setTried] = useState(false);
  const section = sections.find((s) => s.key === q.section_key);
  const options = lines(optionsText);

  // Only the fields of the chosen kind are kept, so a switched kind never sends a stale key.
  const built: AddedQuestion = {
    id: q.id,
    section_key: q.section_key,
    concept_key: q.concept_key,
    prompt: q.prompt.trim(),
    answer_kind: q.answer_kind,
    origin: q.origin,
    ...(q.answer_kind === "numeric" ? { expected_numeric: q.expected_numeric?.trim() } : {}),
    ...(q.answer_kind === "mcq" ? { options, correct_option_index: q.correct_option_index } : {}),
    ...(q.answer_kind === "string_set" ? { accepted_answers: lines(acceptedText) } : {}),
  };
  const problem = addedProblem(built);

  return (
    <form
      aria-label="Write a question"
      className="rounded-2xl bg-white border border-[#122D30]/20 p-4 flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (!problem) onDone(built);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={label}>Part of the chapter</span>
          <select
            className={field}
            value={q.section_key}
            onChange={(e) => {
              const s = e.target.value;
              setQ({ ...q, section_key: s, concept_key: concepts.find((c) => c.section_key === s)?.key ?? "" });
            }}
          >
            {sections.map((s) => (
              <option key={s.key} value={s.key}>{s.title}</option>
            ))}
          </select>
        </label>
        <ConceptSelect
          concepts={concepts.filter((c) => c.section_key === q.section_key)}
          value={q.concept_key}
          onChange={(concept_key) => setQ({ ...q, concept_key })}
        />
      </div>
      {section?.text && (
        <details className="text-xs text-[#122D30]/60">
          <summary className="cursor-pointer font-bold">Read this part of the chapter</summary>
          <p className="mt-2 whitespace-pre-line max-h-48 overflow-auto">{section.text}</p>
        </details>
      )}
      <label className="flex flex-col gap-1">
        <span className={label}>Question</span>
        <textarea className={field} rows={3} value={q.prompt} onChange={(e) => setQ({ ...q, prompt: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 sm:max-w-[220px]">
        <span className={label}>Answer type</span>
        <select className={field} value={q.answer_kind} onChange={(e) => setQ({ ...q, answer_kind: e.target.value as AddedAnswerKind })}>
          {(Object.keys(KIND_LABEL) as AddedAnswerKind[]).map((k) => (
            <option key={k} value={k}>{KIND_LABEL[k]}</option>
          ))}
        </select>
      </label>
      {q.answer_kind === "numeric" && (
        <label className="flex flex-col gap-1">
          <span className={label}>The answer</span>
          <input className={field} value={q.expected_numeric ?? ""} onChange={(e) => setQ({ ...q, expected_numeric: e.target.value })} />
        </label>
      )}
      {q.answer_kind === "mcq" && (
        <>
          <label className="flex flex-col gap-1">
            <span className={label}>Choices (one per line)</span>
            <textarea className={field} rows={4} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
          </label>
          {options.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className={label}>Correct choice</span>
              <select
                className={field}
                value={q.correct_option_index ?? ""}
                onChange={(e) => setQ({ ...q, correct_option_index: e.target.value === "" ? undefined : Number(e.target.value) })}
              >
                <option value="">Choose…</option>
                {options.map((o, i) => (
                  <option key={i} value={i}>{o}</option>
                ))}
              </select>
            </label>
          )}
        </>
      )}
      {q.answer_kind === "string_set" && (
        <label className="flex flex-col gap-1">
          <span className={label}>Answers to accept (one per line)</span>
          <textarea className={field} rows={3} value={acceptedText} onChange={(e) => setAcceptedText(e.target.value)} />
        </label>
      )}
      {tried && problem && (
        <p role="alert" className="text-xs font-bold text-red-700">{problem}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          {initial.origin === "ai_assisted" ? "Accept question" : "Add question"}
        </Button>
        <Button type="button" size="sm" variant="tertiary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
