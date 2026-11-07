"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, BookOpenCheck, MessageCircleQuestion, Users, X } from "lucide-react";
import { glossaryEntry, type BookSection, type BookText } from "../reading/book";
import type { ReadingIntent } from "../types";
import { LessonMarkdown } from "./LessonMarkdown";
import { ReadingControls } from "./ReadingControls";

/** The longest quote put in the chat box: the message limit is 1000 characters and the learner still has a question to write. */
const MAX_QUOTE = 400;
const BUTTON =
  "lesson-display inline-flex items-center gap-1.5 rounded-full bg-[var(--ls-sage)] px-3 py-1.5 text-[13px] font-semibold text-[var(--ls-primary)] disabled:opacity-50";

/**
 * The textbook's own text for this step: original words, in the book's order. A reading chapter shows its passages (with the
 * glossary beside each part, listening and optional read-aloud practice); a chapter with none (maths, science) shows the
 * step's own sections. The learner reads on their own, goes back to an earlier part, selects words to ask the tutor about, or
 * asks to read together. All of it only displays or asks: none of it is an answer, an engagement or progress, so opening,
 * scrolling and closing send nothing, and "Read with me" and "I've read it" are conversation the platform never counts.
 */
export function BookPanel({
  texts,
  sections = [],
  instanceId = null,
  onClose,
  onAsk,
  onReading,
  readingDisabled = false,
}: {
  texts: BookText[];
  sections?: BookSection[];
  instanceId?: string | null;
  onClose: () => void;
  /** The learner chose words to ask about: the chat box takes them. */
  onAsk?: (quote: string) => void;
  onReading?: (intent: ReadingIntent) => void;
  readingDisabled?: boolean;
}) {
  const parts = texts.flatMap((text) => text.parts.map((part) => ({ text, part })));
  const panel = useRef<HTMLElement>(null);
  const [quote, setQuote] = useState("");

  // The words the learner has selected in this panel, kept while they are in it: the bar below offers to ask about them.
  useEffect(() => {
    const onChange = () => {
      const selection = window.getSelection();
      const inside = !!selection && !selection.isCollapsed && !!panel.current && panel.current.contains(selection.anchorNode);
      const words = inside ? selection.toString().replace(/\s+/g, " ").trim() : "";
      if (words) setQuote(words);
      else if (document.activeElement?.getAttribute("data-ask") !== "true") setQuote("");
    };
    document.addEventListener("selectionchange", onChange);
    return () => document.removeEventListener("selectionchange", onChange);
  }, []);

  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  const ask = () => {
    if (!quote) return;
    const shown = quote.length > MAX_QUOTE ? `${quote.slice(0, MAX_QUOTE).trimEnd()}…` : quote;
    onAsk?.(`“${shown}” `);
    window.getSelection()?.removeAllRanges();
    setQuote("");
  };

  return (
    <aside
      ref={panel}
      aria-label="In your book"
      data-no-pan
      className="absolute inset-y-0 left-0 z-20 flex w-[min(440px,62%)] flex-col border-r border-[var(--ls-border)] bg-[var(--ls-card-warm)] shadow-[var(--ls-shadow-pop)]"
    >
      <header className="flex items-center gap-2 px-5 pb-2 pt-4">
        <BookOpen size={18} aria-hidden className="text-[var(--ls-primary)]" />
        <h2 className="lesson-display flex-1 text-[15px] font-semibold text-[var(--ls-primary)]">In your book</h2>
        {/* eslint-disable-next-line no-restricted-syntax -- a panel close control. */}
        <button type="button" onClick={onClose} aria-label="Close the book" className="rounded-full p-1.5 text-[var(--ls-ink-mid)] hover:bg-[var(--ls-sage)]">
          <X size={16} aria-hidden />
        </button>
      </header>

      {texts.length > 0 && onReading && (
        <div className="flex flex-wrap gap-2 px-5 pb-2" role="group" aria-label="Reading together">
          {/* eslint-disable-next-line no-restricted-syntax -- asks the tutor to read the text together. */}
          <button type="button" className={BUTTON} disabled={readingDisabled} onClick={() => onReading("read_with_me")}>
            <Users size={14} aria-hidden /> Read with me
          </button>
          {/* eslint-disable-next-line no-restricted-syntax -- tells the tutor the learner read it. */}
          <button type="button" className={BUTTON} disabled={readingDisabled} onClick={() => onReading("read_it")}>
            <BookOpenCheck size={14} aria-hidden /> I&apos;ve read it
          </button>
        </div>
      )}

      {onAsk && quote && (
        <div role="region" aria-label="Ask about the words you selected" className="mx-5 mb-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
          <p className="min-w-0 flex-1 truncate text-[13px] text-[var(--ls-ink-mid)]">“{quote}”</p>
          {/* eslint-disable-next-line no-restricted-syntax -- puts the selected words in the chat box. */}
          <button type="button" data-ask="true" className={BUTTON} onMouseDown={(event) => event.preventDefault()} onClick={ask}>
            <MessageCircleQuestion size={14} aria-hidden /> Ask about this
          </button>
        </div>
      )}

      {parts.length > 1 && (
        <nav aria-label="Parts of the text" className="flex flex-wrap gap-2 px-5 pb-2">
          {parts.map(({ text, part }) => (
            // eslint-disable-next-line no-restricted-syntax -- a jump control to a part of the text.
            <button
              key={`${text.id}-${part.segment}`}
              type="button"
              onClick={() => goTo(`book-${text.id}-${part.segment}`)}
              className="rounded-full bg-[var(--ls-sage)] px-3 py-1 text-[12px] font-semibold text-[var(--ls-primary)]"
            >
              {texts.length > 1 ? `${text.title}, part ${part.segment}` : `Part ${part.segment}`}
            </button>
          ))}
        </nav>
      )}

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 pb-6 pt-2">
        {texts.map((text) => (
          <article key={text.id} aria-label={text.title}>
            <h3 className="lesson-hand text-[22px] leading-tight text-[var(--ls-primary)]">{text.title}</h3>
            {text.parts.map((part) => (
              <section key={part.segment} id={`book-${text.id}-${part.segment}`} aria-label={`${text.title}, part ${part.segment}`} className="mt-3">
                {text.parts.length > 1 && (
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ls-ink-mid)]">Part {part.segment}</p>
                )}
                {part.paragraphs.map((chunk) => (
                  <p key={chunk.id} className="mb-2 whitespace-pre-line text-[16px] leading-[1.65] text-[var(--ls-ink)]">
                    {chunk.text}
                  </p>
                ))}
                <ReadingControls
                  instanceId={instanceId}
                  passageId={text.id}
                  segment={part.segment}
                  text={part.paragraphs.map((c) => c.text).join("\n\n")}
                />
                {part.glossary.length > 0 && (
                  <dl aria-label="Words in this part" className="mt-2 rounded-xl bg-[var(--ls-sage)] px-3 py-2 text-[14px] text-[var(--ls-ink)]">
                    {part.glossary.map((chunk) => {
                      const { term, meaning } = glossaryEntry(chunk.text);
                      return term ? (
                        <div key={chunk.id} className="py-0.5">
                          <dt className="inline font-semibold">{term}</dt>
                          <dd className="inline">: {meaning}</dd>
                        </div>
                      ) : (
                        <div key={chunk.id} className="py-0.5">
                          <dd>{meaning}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
              </section>
            ))}
          </article>
        ))}

        {sections.map((section) => (
          <article key={section.id} aria-label={section.title}>
            <h3 className="lesson-hand text-[20px] leading-tight text-[var(--ls-primary)]">{section.title}</h3>
            {section.chunks.map((chunk) =>
              chunk.element_type === "table" ? (
                <pre key={chunk.id} className="my-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-white/70 p-2 font-mono text-[13px] text-[var(--ls-ink)]">
                  {chunk.text}
                </pre>
              ) : (
                <div key={chunk.id} className="my-2 text-[16px] leading-[1.6] text-[var(--ls-ink)]">
                  <LessonMarkdown text={chunk.text} />
                </div>
              ),
            )}
          </article>
        ))}
      </div>
    </aside>
  );
}
