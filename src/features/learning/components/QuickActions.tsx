"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Lightbulb, MessageCircle, NotebookPen, Sparkles, Target, X } from "lucide-react";
import { stepInfo, stepInfoCounts, type StepInfo } from "../stepInfo";
import { useLessonStore } from "../useLessonStore";
import { SketchButton } from "./SketchButton";

type Kind = "concepts" | "examples" | "practice" | "notes";

/**
 * Each chip opens a pop-up of what the step's teacher payload already holds: its key ideas, the book's worked examples, its
 * printed questions to talk over, and its own notes. Nothing is fetched for it. Every pop-up keeps its tutor prompt (the chip's
 * old one-tap message), so a step whose book has none of these still gets an answer.
 */
const ACTIONS: Array<{ kind: Kind; label: string; title: string; icon: typeof Lightbulb; ask: string; prompt: string; empty: string }> = [
  {
    kind: "concepts", label: "Concepts", title: "Key ideas of this step", icon: Lightbulb,
    ask: "Explain these simply", prompt: "Can you explain the key ideas of this step simply?",
    empty: "This step has no key ideas listed.",
  },
  {
    kind: "examples", label: "Examples", title: "Worked examples", icon: BookOpen,
    ask: "Show me an example", prompt: "Can you show me an example?",
    empty: "Your book has no worked example for this step. Your tutor can make one up for you.",
  },
  {
    kind: "practice", label: "Practice", title: "Questions to talk over", icon: Target,
    ask: "Give me a practice question", prompt: "Can you give me a practice question on this?",
    empty: "Your book has no questions for this step. Your tutor can give you one.",
  },
  {
    kind: "notes", label: "Notes", title: "Notes from your book", icon: NotebookPen,
    ask: "Sum it up for me", prompt: "Can you sum up this step as short notes?",
    empty: "Your book has no notes for this step. Your tutor can write some for you.",
  },
];

export function QuickActions() {
  const send = useLessonStore((s) => s.send);
  const payload = useLessonStore((s) => s.payload);
  const stepId = useLessonStore((s) => s.instance?.active_node?.instance_node_id ?? null);
  const canTalk = useLessonStore((s) => s.status === "ready" && s.instance?.state === "active" && Boolean(s.instance.active_node));
  const info = useMemo(() => stepInfo(payload), [payload]);
  const counts = stepInfoCounts(info);
  const panelId = useId();

  // A pop-up belongs to the step it was opened on: moving on closes it, with no effect to reset it.
  const [opened, setOpened] = useState<{ kind: Kind; step: string | null } | null>(null);
  const open = opened && opened.step === stepId ? opened.kind : null;
  const action = ACTIONS.find((a) => a.kind === open);

  const root = useRef<HTMLDivElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const chips = useRef<Partial<Record<Kind, HTMLButtonElement | null>>>({});

  const close = (refocus: boolean) => {
    if (refocus && open) chips.current[open]?.focus();
    setOpened(null);
  };

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      chips.current[open]?.focus();
      setOpened(null);
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpened(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const ask = (text: string) => {
    setOpened(null);
    void send(text);
  };

  return (
    <div ref={root} className="relative">
      <AnimatePresence>
        {action && (
          <motion.div
            key={action.kind}
            ref={panel}
            id={panelId}
            role="dialog"
            aria-label={action.title}
            tabIndex={-1}
            initial={{ opacity: 0, y: 12, rotate: -0.4 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.14 } }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="lesson-sketch @container absolute bottom-full left-4 right-4 z-30 mb-1 flex max-h-[min(62dvh,540px)] max-w-[600px] flex-col text-[var(--ls-ink)] outline-none"
          >
            <header className="flex items-start gap-3 border-b border-dashed border-[var(--ls-border-strong)] px-5 pb-3 pt-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--ls-accent)]" aria-hidden>
                <action.icon size={18} strokeWidth={2.2} className="text-[var(--ls-primary)]" />
              </span>
              <h2 className="lesson-hand min-w-0 flex-1 pt-0.5 text-[24px] font-bold leading-tight text-[var(--ls-primary)]">{action.title}</h2>
              {/* eslint-disable-next-line no-restricted-syntax -- the pop-up's round close mark. */}
              <button
                type="button"
                aria-label="Close"
                onClick={() => close(true)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--ls-ink-mid)] transition-colors hover:bg-[var(--ls-primary-soft)] hover:text-[var(--ls-primary)]"
              >
                <X size={18} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {counts[action.kind] === 0 ? (
                <p className="text-[15px] leading-relaxed text-[var(--ls-ink-mid)]">{action.empty}</p>
              ) : action.kind === "concepts" ? (
                <Concepts info={info} />
              ) : action.kind === "examples" ? (
                <Examples info={info} />
              ) : action.kind === "practice" ? (
                <Practice info={info} disabled={!canTalk} onPick={(prompt) => ask(`Can we talk about this question from my book? ${prompt}`)} />
              ) : (
                <Notes info={info} />
              )}
            </div>

            <footer className="flex items-center justify-end gap-3 border-t border-dashed border-[var(--ls-border-strong)] px-5 py-3 @[26rem]:justify-between">
              {/* On a narrow board the button alone: the hint would squeeze it onto two lines. */}
              <p className="hidden text-[13px] text-[var(--ls-ink-mid)] @[26rem]:block">{canTalk ? "Want more help?" : "Your tutor is busy right now."}</p>
              <SketchButton variant={counts[action.kind] === 0 ? "primary" : "secondary"} disabled={!canTalk} className="!min-h-10 whitespace-nowrap !text-[17px]" onClick={() => ask(action.prompt)}>
                <Sparkles size={15} aria-hidden /> {action.ask}
              </SketchButton>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      <div role="group" aria-label="About this step" className="flex flex-wrap gap-2.5 px-5 pb-4 pt-3">
        {ACTIONS.map(({ kind, label, icon: Icon }) => {
          const active = open === kind;
          const count = counts[kind];
          return (
            // eslint-disable-next-line no-restricted-syntax -- a pop-up chip.
            <button
              key={kind}
              ref={(el) => {
                chips.current[kind] = el;
              }}
              type="button"
              disabled={!payload}
              aria-expanded={active}
              aria-controls={active ? panelId : undefined}
              aria-haspopup="dialog"
              onClick={() => setOpened(active ? null : { kind, step: stepId })}
              className={`lesson-display flex items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-medium text-[var(--ls-ink)] shadow-[0_1px_2px_rgb(18_45_48/0.05)] transition-[border-color,background] hover:border-[var(--ls-primary)] hover:bg-[var(--ls-primary-soft)] disabled:cursor-not-allowed disabled:opacity-50 ${
                active ? "border-[var(--ls-primary)] bg-[var(--ls-primary-soft)]" : "border-[var(--ls-border)] bg-white"
              }`}
            >
              <Icon size={16} strokeWidth={2.2} className="text-[var(--ls-primary)]" aria-hidden />
              {label}
              {count > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--ls-accent)] px-1.5 text-[11px] font-bold tabular-nums text-[var(--ls-ink)]" aria-label={`, ${count}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--ls-ink-mid)]">{children}</h3>;
}

function Concepts({ info }: { info: StepInfo }) {
  return (
    <>
      {info.outcomes.length > 0 && (
        <section className="mb-4 rounded-[10px] bg-[var(--ls-sage)] px-3.5 py-2.5">
          <Label>What you&apos;ll learn</Label>
          <ul className="space-y-1 text-[14px] leading-snug">
            {info.outcomes.map((lo) => <li key={lo.id}>{lo.title}</li>)}
          </ul>
        </section>
      )}
      <ol className="space-y-3.5">
        {info.concepts.map((concept, i) => (
          <li key={concept.id} className="flex gap-3">
            <span className="lesson-hand w-6 shrink-0 text-center text-[26px] leading-none text-[var(--ls-primary)]" aria-hidden>{i + 1}</span>
            <div className="min-w-0">
              <p className="text-[16px] font-semibold leading-snug">{concept.title}</p>
              <p className="mt-0.5 text-[15px] leading-relaxed text-[var(--ls-ink-mid)]">{concept.definition}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

function Examples({ info }: { info: StepInfo }) {
  return (
    <ul className="space-y-4">
      {info.examples.map((example) => (
        <li key={example.id} className="border-l-[3px] border-[var(--ls-accent-deep)] pl-3.5">
          <p className="mb-1 text-[12px] font-semibold text-[var(--ls-ink-mid)]">
            {example.section}{example.page ? ` · page ${example.page}` : ""}
          </p>
          <p className="whitespace-pre-line text-[15px] leading-relaxed">{example.text}</p>
        </li>
      ))}
    </ul>
  );
}

function Practice({ info, disabled, onPick }: { info: StepInfo; disabled: boolean; onPick: (prompt: string) => void }) {
  return (
    <>
      <p className="mb-3 text-[14px] text-[var(--ls-ink-mid)]">Pick one to talk it over with your tutor. Nothing here is marked.</p>
      <ul className="space-y-2">
        {info.practice.map((item) => (
          <li key={item.id}>
            {/* eslint-disable-next-line no-restricted-syntax -- a whole-row pick, like an answer tile. */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(item.prompt)}
              className="lesson-choice group w-full text-left disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="min-w-0 flex-1 whitespace-pre-line text-[15px] leading-snug">{item.prompt}</span>
              <MessageCircle size={18} className="shrink-0 text-[var(--ls-primary)] opacity-60 transition-opacity group-hover:opacity-100" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function Notes({ info }: { info: StepInfo }) {
  const { summary, keyWords, notes } = info.notes;
  return (
    <div className="space-y-5">
      {summary.length > 0 && (
        <section>
          <Label>Key points</Label>
          <ul className="space-y-1.5 text-[15px] leading-relaxed">
            {summary.map((point) => (
              <li key={point.id} className="flex gap-2.5">
                <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ls-primary)]" aria-hidden />
                {point.text}
              </li>
            ))}
          </ul>
        </section>
      )}
      {keyWords.length > 0 && (
        <section>
          <Label>Key words</Label>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-[15px] leading-snug">
            {keyWords.map((word) => (
              <div key={word.id} className="contents">
                <dt className="font-semibold">
                  <mark className="rounded-[3px] bg-[var(--ls-accent)]/60 px-1 text-[var(--ls-ink)]">{word.term}</mark>
                </dt>
                <dd className="text-[var(--ls-ink-mid)]">{word.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {notes.length > 0 && (
        <section>
          <Label>Good to know</Label>
          <ul className="space-y-2 text-[15px] leading-relaxed">
            {notes.map((note) => <li key={note.id} className="rounded-[10px] bg-[var(--ls-sage)] px-3.5 py-2">{note.text}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
