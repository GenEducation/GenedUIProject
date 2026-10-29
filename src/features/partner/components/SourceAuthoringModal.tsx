"use client";

import { useCallback, useEffect, useId, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  PenLine,
  Play,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { enterToSubmit } from "@/utils/enterToSubmit";
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

/** The three ways to give a chapter questions, one tab each; AI first, as the quickest. */
type Tab = "ai" | "own" | "printed";

/** A question open in the form; `draftId` when it started as an AI draft, so the form opens in that draft's place. */
interface Editing {
  question: AddedQuestion;
  draftId?: string;
}

const KIND_LABEL: Record<AddedAnswerKind, string> = {
  numeric: "A number",
  mcq: "Multiple choice",
  string_set: "Short answer",
};

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const newId = () => (globalThis.crypto?.randomUUID?.() ?? `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

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
  const [editing, setEditing] = useState<Editing | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("ai");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [asking, setAsking] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tabsId = useId();

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
  const fromAi = added.filter((q) => q.origin === "ai_assisted").length;
  const own = added.length - fromAi;
  const total = keyed.length + added.length;
  const savedOnce = !!data?.authored_at;
  const acceptedDrafts = new Set(added.map((q) => q.prompt.trim()));
  const drafts = (data?.suggestions?.drafts ?? []).filter((d) => !acceptedDrafts.has(d.prompt.trim()) && !skipped.has(d.id));
  const writingOwn = editing && !editing.draftId;

  const touch = () => {
    setDirty(true);
    setError(null);
  };

  /** True once the questions are stored. */
  const save = async (): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const body: AuthoredQuestions = { answers: Object.fromEntries(keyed), added };
      adopt(await sourcesService.saveAuthoring(subject.source_id, body), false);
      onSaved();
      return true;
    } catch (e) {
      setError(asError(e).message || "The questions weren't saved. Please try again.");
      return false;
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

  const saveAndRun = async () => {
    if (await save()) await rerun();
  };

  const putAdded = (q: AddedQuestion) => {
    setAdded((prev) => (prev.some((x) => x.id === q.id) ? prev.map((x) => (x.id === q.id ? q : x)) : [...prev, q]));
    setEditing(null);
    touch();
  };

  /** Take a draft, as it is or edited: it leaves the suggestions even when its wording changed. */
  const acceptDraft = (draftId: string, q: AddedQuestion) => {
    setSkipped((prev) => new Set(prev).add(draftId));
    putAdded(q);
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: string | null; show: boolean }[] = [
    { key: "ai", label: "Suggested by AI", icon: <Sparkles size={15} />, count: drafts.length ? String(drafts.length) : null, show: true },
    { key: "own", label: "Your questions", icon: <PenLine size={15} />, count: added.length ? String(added.length) : null, show: true },
    {
      key: "printed",
      label: "Printed questions",
      icon: <FileText size={15} />,
      count: `${keyed.length}/${removed.length}`,
      show: removed.length > 0,
    },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <header className="shrink-0 bg-white border-b border-[#122D30]/5">
        <div className="flex items-start gap-4 px-5 md:px-7 pt-6">
          <div className="h-11 w-11 shrink-0 rounded-2xl bg-[#075E63] text-white flex items-center justify-center">
            <PenLine size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#122D30]/40">Add questions GenEd can check</p>
            <h2 className="text-lg md:text-xl font-black text-[#122D30] tracking-tight truncate">{subject.title}</h2>
            <p className="text-xs text-[#122D30]/60 mt-1 max-w-xl">
              This run found too few questions to teach every concept. Add some in any of the three ways below, then
              run the chapter again. Nothing reaches students until you review and publish.
            </p>
          </div>
          <Button iconOnly variant="tertiary" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        {data && (
          <div role="tablist" aria-label="Ways to add questions" className="flex gap-1 overflow-x-auto px-5 md:px-7 mt-4">
            {tabs
              .filter((t) => t.show)
              .map((t) => {
                const active = tab === t.key;
                return (
                  // eslint-disable-next-line no-restricted-syntax -- a tab with an underline, not an action button.
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    id={`${tabsId}-${t.key}`}
                    aria-selected={active}
                    aria-controls={`${tabsId}-${t.key}-panel`}
                    onClick={() => setTab(t.key)}
                    className={`relative flex shrink-0 items-center gap-2 px-3.5 pt-2 pb-3 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075E63]/40 rounded-t-lg ${
                      active ? "text-[#075E63]" : "text-[#122D30]/50 hover:text-[#122D30]"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                    {t.count && (
                      <span
                        className={`min-w-5 rounded-full px-1.5 py-px text-[10.5px] font-black tabular-nums ${
                          active ? "bg-[#075E63] text-white" : "bg-[#122D30]/8 text-[#122D30]/60"
                        }`}
                      >
                        {t.count}
                      </span>
                    )}
                    <span aria-hidden className={`absolute inset-x-2 bottom-0 h-[3px] rounded-full ${active ? "bg-[#075E63]" : "bg-transparent"}`} />
                  </button>
                );
              })}
          </div>
        )}
      </header>

      <div className="flex-1 px-5 md:px-7 py-5">
        {loadError ? (
          <p role="alert" className="text-sm font-bold text-[#122D30]/70 py-10 text-center">{loadError}</p>
        ) : !data ? (
          <p className="flex items-center justify-center gap-2 text-sm font-bold text-[#122D30]/40 py-10">
            <Loader2 size={16} className="animate-spin" aria-hidden /> Loading the chapter…
          </p>
        ) : (
          <>
            {/* Every panel stays mounted, so a half-written answer survives a switch of tab. */}
            <Panel id={`${tabsId}-ai`} hidden={tab !== "ai"}>
              <PanelIntro>
                AI drafts questions from the chapter&rsquo;s text. Check each one: accept it as it is, edit it first, or
                skip it.
              </PanelIntro>

              {fromAi > 0 && (
                <Notice>
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" aria-hidden />
                  <span className="flex-1">{plural(fromAi, "suggestion")} accepted. You can find them in Your questions.</span>
                  <Button size="sm" variant="tertiary" trailingIcon={<ArrowRight size={13} />} onClick={() => setTab("own")}>
                    Open
                  </Button>
                </Notice>
              )}

              {data.suggestions?.state === "failed" && (
                <Notice tone="problem">
                  <AlertCircle size={15} className="shrink-0" aria-hidden />
                  <span>{data.suggestions.detail || "The AI couldn't write suggestions this time."}</span>
                </Notice>
              )}

              {pending ? (
                <div role="status" className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 px-5 py-8 flex flex-col items-center gap-2 text-center">
                  <Loader2 size={20} className="animate-spin text-violet-600" aria-hidden />
                  <p className="text-sm font-bold text-[#122D30]">Writing suggestions…</p>
                  <p className="text-xs text-[#122D30]/50">This takes a minute. You can answer printed questions or write your own meanwhile.</p>
                </div>
              ) : !data.suggestions ? (
                <EmptyState
                  icon={<Sparkles size={20} />}
                  title="Let AI draft questions for you"
                  body="It reads the chapter and writes questions with answers GenEd can check, one concept at a time."
                />
              ) : data.suggestions.state === "ready" && drafts.length === 0 ? (
                <EmptyState icon={<Check size={20} />} title="No suggestions left to review" body="Ask for more, or write your own." />
              ) : null}

              {drafts.map((d) =>
                editing?.draftId === d.id ? (
                  <QuestionForm
                    key={editing.question.id}
                    initial={editing.question}
                    sections={sections}
                    concepts={concepts}
                    onDone={(q) => acceptDraft(d.id, q)}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <AddedRow
                    key={d.id}
                    question={d}
                    concept={concepts.find((c) => c.key === d.concept_key)}
                    draft
                    onEdit={() => setEditing({ question: { ...d, id: newId(), origin: "ai_assisted" }, draftId: d.id })}
                    onAccept={() => acceptDraft(d.id, { ...d, id: newId(), origin: "ai_assisted" })}
                    onRemove={() => setSkipped((prev) => new Set(prev).add(d.id))}
                  />
                ),
              )}

              {data.can_suggest && !pending && (
                <div className={drafts.length || data.suggestions ? "" : "flex justify-center -mt-2"}>
                  <Button variant="secondary" size="sm" leadingIcon={<Sparkles size={14} />} loading={asking} onClick={() => void suggest()}>
                    {data.suggestions ? "Suggest more questions" : "Suggest questions"}
                  </Button>
                </div>
              )}
            </Panel>

            <Panel id={`${tabsId}-own`} hidden={tab !== "own"}>
              <PanelIntro>Write a question for one concept the run found, or edit the suggestions you accepted.</PanelIntro>
              {added.length === 0 && !writingOwn && (
                <EmptyState icon={<PenLine size={20} />} title="No questions here yet" body="Write one below, or accept a suggestion from AI." />
              )}
              {added.map((q) =>
                editing?.question.id === q.id ? null : (
                  <AddedRow
                    key={q.id}
                    question={q}
                    concept={concepts.find((c) => c.key === q.concept_key)}
                    onEdit={() => setEditing({ question: q })}
                    onRemove={() => {
                      setAdded((prev) => prev.filter((x) => x.id !== q.id));
                      touch();
                    }}
                  />
                ),
              )}
              {writingOwn ? (
                <QuestionForm
                  key={editing.question.id}
                  initial={editing.question}
                  sections={sections}
                  concepts={concepts}
                  onDone={putAdded}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <Button
                  variant="outline"
                  fullWidth
                  leadingIcon={<Plus size={16} />}
                  disabled={concepts.length === 0}
                  onClick={() => setEditing({ question: blank(sections[0]?.key ?? "", concepts) })}
                  className="border-dashed py-4"
                >
                  Write a question
                </Button>
              )}
            </Panel>

            {removed.length > 0 && (
              <Panel id={`${tabsId}-printed`} hidden={tab !== "printed"}>
                <PanelIntro>
                  GenEd took these out because it couldn&rsquo;t check their answers. Give an answer to bring one back.
                  All of them are optional: skip any that can&rsquo;t have one exact answer, like drawing questions.
                </PanelIntro>
                <Progress done={keyed.length} total={removed.length} />
                {groupBySection(removed, sections).map((group) => (
                  <div key={group.key} className="flex flex-col gap-3">
                    {group.title && <h3 className="text-[11px] font-black uppercase tracking-widest text-[#122D30]/40 mt-1">{group.title}</h3>}
                    {group.questions.map((q) => (
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
                  </div>
                ))}
              </Panel>
            )}
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
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[#122D30]">
                  {total ? `${plural(total, "question")} ready` : "No questions added yet"}
                  {dirty && <span className="ml-2 text-[11px] font-bold text-amber-700">Not saved</span>}
                </p>
                <p className="text-xs text-[#122D30]/50">
                  {total
                    ? [keyed.length && `${keyed.length} printed`, own && `${own} written by you`, fromAi && `${fromAi} from AI`].filter(Boolean).join(" · ")
                    : "Add at least one to run the chapter again."}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" disabled={!dirty || !!editing || rerunning} loading={saving && !rerunning} onClick={() => void save()}>
                  Save for later
                </Button>
                <Button
                  leadingIcon={<Play size={14} />}
                  disabled={total === 0 || !!editing || saving}
                  loading={rerunning}
                  onClick={() => void saveAndRun()}
                >
                  Save and run
                </Button>
              </div>
            </div>
          )}
          {editing && <p className="text-[11px] font-bold text-[#122D30]/50 -mt-1">Finish or cancel the question you&rsquo;re writing to save.</p>}
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

/** The removed questions under their chapter part, in the chapter's order; a title only when there is more than one. */
function groupBySection(removed: RemovedQuestion[], sections: AuthoringResponse["sections"]) {
  const order = new Map(sections.map((s, i) => [s.key, i]));
  const groups = new Map<string, RemovedQuestion[]>();
  for (const q of removed) groups.set(q.section_key, [...(groups.get(q.section_key) ?? []), q]);
  const many = groups.size > 1;
  return [...groups.entries()]
    .sort(([a], [b]) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity))
    .map(([key, questions]) => ({
      key,
      title: many ? sections.find((s) => s.key === key)?.title ?? "Other questions" : null,
      questions,
    }));
}

function Panel({ id, hidden, children }: { id: string; hidden: boolean; children: React.ReactNode }) {
  return (
    <section role="tabpanel" id={`${id}-panel`} aria-labelledby={id} hidden={hidden} className="flex flex-col gap-3">
      {children}
    </section>
  );
}

function PanelIntro({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs text-[#122D30]/60 max-w-2xl">
      <Info size={14} className="mt-px shrink-0 text-[#122D30]/35" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

function Notice({ tone = "info", children }: { tone?: "info" | "problem"; children: React.ReactNode }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
        tone === "problem" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50/60 text-[#122D30]"
      }`}
    >
      {children}
    </div>
  );
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#122D30]/15 bg-white/60 px-5 py-8 flex flex-col items-center gap-2 text-center">
      <span className="h-10 w-10 rounded-2xl bg-[#DCEBE7] text-[#075E63] flex items-center justify-center" aria-hidden>
        {icon}
      </span>
      <p className="text-sm font-bold text-[#122D30]">{title}</p>
      <p className="text-xs text-[#122D30]/50 max-w-sm">{body}</p>
    </div>
  );
}

function Progress({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 rounded-full bg-[#122D30]/8 overflow-hidden">
        <div className="h-full rounded-full bg-[#075E63] transition-[width] duration-500" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
      <span className="text-[11px] font-black text-[#122D30]/60 tabular-nums">
        {done} of {total} answered
      </span>
    </div>
  );
}

const field =
  "w-full rounded-xl border border-[#122D30]/15 bg-white px-3 py-2 text-sm text-[#122D30] transition-colors focus:outline-none focus:border-[#075E63]/60 focus:ring-2 focus:ring-[#075E63]/10";
/** A native select drawn like the fields around it, with its own chevron. */
const selectField = `${field} appearance-none pr-9 bg-no-repeat bg-[length:14px] bg-[position:right_0.75rem_center] bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23122D30' stroke-opacity='.5' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")]`;
const label = "text-[10px] font-black uppercase tracking-widest text-[#122D30]/50";

function ConceptSelect({ concepts, value, onChange }: { concepts: AuthoringConcept[]; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={label}>Concept it checks</span>
      <select className={selectField} value={value} onChange={(e) => onChange(e.target.value)}>
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
    <article
      aria-label={question.prompt}
      className={`rounded-2xl bg-white border p-4 flex flex-col gap-3 transition-colors ${done ? "border-emerald-300" : "border-[#122D30]/5"}`}
    >
      <div className="flex items-start gap-3">
        <p className="flex-1 text-sm font-bold text-[#122D30] whitespace-pre-line">{question.prompt}</p>
        <span
          className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
            done ? "bg-emerald-50 text-emerald-700" : "bg-[#122D30]/5 text-[#122D30]/45"
          }`}
        >
          {done && <Check size={11} aria-hidden />}
          {done ? "Answered" : "Optional"}
        </span>
      </div>
      <p className="text-[11px] text-[#122D30]/50">
        {removedReason(question.reason)}
        {question.run_key ? ` · GenEd read “${question.run_key}”` : ""}
      </p>
      {question.options.length > 0 ? (
        <fieldset className="flex flex-col gap-1.5">
          <legend className={`${label} mb-1.5`}>Correct choice</legend>
          {question.options.map((o, i) => {
            const picked = draft.value === String(i);
            return (
              <label
                key={i}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  picked ? "border-[#075E63] bg-[#DCEBE7]/50 text-[#122D30] font-bold" : "border-[#122D30]/10 text-[#122D30] hover:border-[#122D30]/25"
                }`}
              >
                <input
                  type="radio"
                  className="accent-[#075E63]"
                  name={`opt-${question.item_key}`}
                  checked={picked}
                  onChange={() => onChange({ ...draft, value: String(i) })}
                />
                {o}
              </label>
            );
          })}
        </fieldset>
      ) : (
        <div className="flex flex-col gap-2">
          <div role="group" aria-label="Answer type" className="inline-flex self-start rounded-xl bg-[#122D30]/5 p-0.5">
            {(["numeric", "words"] as const).map((k) => (
              // eslint-disable-next-line no-restricted-syntax -- one half of a segmented toggle.
              <button
                key={k}
                type="button"
                aria-pressed={draft.kind === k}
                onClick={() => onChange({ ...draft, kind: k })}
                className={`rounded-[10px] px-3 py-1 text-xs font-bold transition-colors ${
                  draft.kind === k ? "bg-white text-[#122D30] shadow-sm" : "text-[#122D30]/50 hover:text-[#122D30]"
                }`}
              >
                {k === "numeric" ? "A number" : "Words"}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1">
            <span className={label}>{draft.kind === "numeric" ? "The answer" : "Answers to accept (one per line)"}</span>
            {draft.kind === "numeric" ? (
              <input className={field} inputMode="decimal" value={draft.value} onChange={(e) => onChange({ ...draft, value: e.target.value })} />
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
    <article
      aria-label={question.prompt}
      className={`rounded-2xl bg-white border p-4 flex flex-col gap-2 ${draft ? "border-violet-200" : "border-[#122D30]/5"}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-2 py-px rounded-full text-[9px] font-black uppercase tracking-widest border bg-[#DCEBE7]/40 text-[#122D30] border-[#122D30]/10">
          {concept?.title ?? question.concept_key}
        </span>
        {question.origin === "ai_assisted" && (
          <span className="px-2 py-px rounded-full text-[9px] font-black uppercase tracking-widest border bg-violet-50 text-violet-700 border-violet-200">
            {draft ? "AI draft" : "From AI"}
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
      <div className="flex flex-wrap gap-2 pt-1">
        {onAccept && (
          <Button size="sm" leadingIcon={<Check size={14} />} onClick={onAccept}>
            Accept
          </Button>
        )}
        <Button size="sm" variant="outline" leadingIcon={<PenLine size={14} />} onClick={onEdit}>
          {draft ? "Edit, then accept" : "Edit"}
        </Button>
        {onRemove && (
          <Button size="sm" variant="tertiary" leadingIcon={draft ? <X size={14} /> : <Trash2 size={14} />} onClick={onRemove}>
            {draft ? "Skip" : "Remove"}
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
      className="rounded-2xl bg-white border-2 border-[#075E63]/30 p-4 flex flex-col gap-3 shadow-[0_8px_24px_-12px_rgba(18,45,48,0.25)]"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (!problem) onDone(built);
      }}
    >
      <p className="text-xs font-black text-[#075E63]">{initial.origin === "ai_assisted" ? "Edit the suggestion" : "New question"}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={label}>Part of the chapter</span>
          <select
            className={selectField}
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
        <textarea className={field} rows={3} value={q.prompt} onChange={(e) => setQ({ ...q, prompt: e.target.value })} onKeyDown={enterToSubmit()} />
      </label>
      <label className="flex flex-col gap-1 sm:max-w-[220px]">
        <span className={label}>Answer type</span>
        <select className={selectField} value={q.answer_kind} onChange={(e) => setQ({ ...q, answer_kind: e.target.value as AddedAnswerKind })}>
          {(Object.keys(KIND_LABEL) as AddedAnswerKind[]).map((k) => (
            <option key={k} value={k}>{KIND_LABEL[k]}</option>
          ))}
        </select>
      </label>
      {q.answer_kind === "numeric" && (
        <label className="flex flex-col gap-1">
          <span className={label}>The answer</span>
          <input className={field} inputMode="decimal" value={q.expected_numeric ?? ""} onChange={(e) => setQ({ ...q, expected_numeric: e.target.value })} />
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
                className={selectField}
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
