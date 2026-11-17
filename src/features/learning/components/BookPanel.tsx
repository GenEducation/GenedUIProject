"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, BookOpenCheck, ChevronDown, ChevronRight, Crosshair, MessageCircleQuestion, Users, X } from "lucide-react";
import { glossaryEntry, type BookPart, type BookSection, type BookText } from "../reading/book";
import type { ReadingIntent, ReadingRole } from "../types";
import { tutorButtons } from "../reading/bookActions";
import { LessonMarkdown } from "./LessonMarkdown";
import { ReadingControls } from "./ReadingControls";
import { ReadingPractice } from "./ReadingPractice";
import { practiceExcerpt } from "../reading/alignWords";

const normal = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Whether a chunk of the book is part of the portion being taught now (content-led lessons): the same printed text, or one
 * holding the other. Short fragments match only exactly, so a stray word never marks a paragraph.
 */
export function inActivePortion(text: string, lines: string[] | undefined): boolean {
  if (!lines?.length) return false;
  const chunk = normal(text);
  if (!chunk) return false;
  return lines.some((line) => {
    const wanted = normal(line);
    if (!wanted) return false;
    if (wanted === chunk) return true;
    return (wanted.length >= 20 && chunk.includes(wanted)) || (chunk.length >= 20 && wanted.includes(chunk));
  });
}

/** Whether a painted chunk of the book holds this whole printed line (a fragment of the line does not). */
const holdsLine = (text: string, line: string) => {
  const wanted = normal(line);
  return !!wanted && normal(text).includes(wanted);
};

/**
 * Whether a printed block is a heading ("2 THE TINKLING BELLS", "Let us Read"): short, with no sentence ending. The server's
 * portions carry their headings; the book shows them as the text's own title, so they are context, never a line to print again.
 */
export function isHeadingLine(line: string): boolean {
  const text = line.replace(/\s+/g, " ").trim();
  if (!text) return false;
  return text.split(" ").length <= 6 && !/[.?!:;,"\u201d\u2019')\]]$/.test(text);
}

/** The assigned lines no chunk of the book shown here holds whole: the panel prints them as they are, so none goes unseen. */
export function uncoveredLines(chunks: string[], lines: string[] | undefined): string[] {
  if (!lines?.length) return [];
  // Covered means marked in the book (so the learner sees which words) and holding the line whole.
  return lines.filter(
    (line) => normal(line) && !isHeadingLine(line) && !chunks.some((text) => inActivePortion(text, [line]) && holdsLine(text, line)),
  );
}

/**
 * Whether `root` shows every assigned line, whole: each one held by a marked chunk of the book or printed in the "Also being
 * taught" card. Headings are the text's title, shown above it. This is what the learner can actually see, not what was
 * fetched, and the only ground for confirming it.
 */
export function showsEvery(root: HTMLElement | null, lines: string[]): boolean {
  if (!root || lines.length === 0) return false;
  const shown = Array.from(root.querySelectorAll<HTMLElement>("[data-active-portion], [data-source-line]")).map((el) => el.textContent ?? "");
  return lines.every((line) => !normal(line) || isHeadingLine(line) || shown.some((text) => holdsLine(text, line)));
}

/**
 * A printed paragraph with the PDF's line breaks taken out, so it reads as running text at any width. A verse (most lines
 * short and starting with a capital) keeps its lines; a blank line always stays a break.
 */
export function reflow(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 3) return lines.join(" ");
      const capitals = lines.filter((l) => /^["\u201c\u2018'(]?[A-Z0-9]/.test(l)).length / lines.length;
      const average = lines.reduce((n, l) => n + l.length, 0) / lines.length;
      return capitals >= 0.75 && average < 48 ? lines.join("\n") : lines.join(" ");
    })
    .join("\n\n");
}

/** The portion being taught: a citron wash and a margin mark, the lesson's own colour for "now". */
const ACTIVE =
  "relative -mx-3 rounded-lg bg-[rgb(217_242_121/0.30)] px-3 py-1.5 text-[var(--ls-ink)] before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-[var(--ls-accent-deep)]";
const PAGE_TEXT = "font-[family-name:var(--font-source-serif)] text-[17px] leading-[1.7]";

/** The longest quote put in the chat box: the message limit is 1000 characters and the learner still has a question to write. */
const MAX_QUOTE = 400;
const GROUP_LABEL = "lesson-display mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--ls-ink-faint)]";
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
  readingRole = null,
  contentPhase = null,
  questionOpen = false,
  voice = false,
  activeLines,
  portionId,
  onShown,
}: {
  texts: BookText[];
  sections?: BookSection[];
  instanceId?: string | null;
  onClose: () => void;
  /** The learner chose words to ask about: the chat box takes them. */
  onAsk?: (quote: string) => void;
  onReading?: (intent: ReadingIntent) => void;
  /** A tutor reply is streaming: the tutor buttons wait. */
  readingDisabled?: boolean;
  /** What the step's text is for; decides which tutor buttons make sense (see `tutorButtons`). */
  readingRole?: ReadingRole | null;
  /** The content-led lesson's phase, or `null` for a lesson that is not content-led. */
  contentPhase?: string | null;
  /** A question is on screen. */
  questionOpen?: boolean;
  /** A voice session is on. */
  voice?: boolean;
  /** The printed lines of the portion being taught now: marked where they appear in the book. */
  activeLines?: string[];
  /** The portion those lines belong to; with `onShown`, the panel says once every line is on screen (content-led, chat). */
  portionId?: string;
  onShown?: (portionId: string) => void;
}) {
  const parts = texts.flatMap((text) => text.parts.map((part) => ({ text, part, key: partKey(text, part) })));
  const current = currentPart(parts, activeLines);
  const panel = useRef<HTMLElement>(null);
  const [quote, setQuote] = useState("");
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  // What the learner already pressed, per part: a new part starts fresh.
  const [pressed, setPressed] = useState<Record<string, { readWithMe: boolean; readIt: boolean }>>({});
  const activeKey = activeLines?.join("\n") ?? "";
  const currentKey = parts[current]?.key ?? "";
  // Every part holding a line being taught is open: a portion can run across a part's end.
  const marked = new Set(
    parts.filter(({ part }) => [...part.paragraphs, ...part.glossary].some((c) => inActivePortion(c.text, activeLines))).map((p) => p.key),
  );
  // Lines the book's own text does not hold whole (a caption, a different split) are printed as they are.
  const painted = [
    ...parts.filter((p, i) => i === current || marked.has(p.key)).flatMap(({ part }) => [...part.paragraphs, ...part.glossary]),
    ...sections.flatMap((s) => s.chunks),
  ].map((c) => c.text);
  const loose = uncoveredLines(painted, activeLines);
  const wantsShown = !!onShown && !!portionId;
  const shownRef = useRef(onShown);
  shownRef.current = onShown;

  // Confirm the portion only once every assigned line is painted here and the tab is visible: two frames after the render
  // that marked them, so the check reads what is on screen. A tab opened in the background checks again once it is shown.
  useEffect(() => {
    if (!wantsShown || !portionId || !activeLines?.length) return;
    let first = 0;
    let second = 0;
    let done = false;
    const check = () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => {
          if (done || document.visibilityState !== "visible" || !showsEvery(panel.current, activeLines)) return;
          done = true;
          shownRef.current?.(portionId);
        });
      });
    };
    check();
    document.addEventListener("visibilitychange", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
    // activeKey stands for activeLines' content; a new array with the same lines is the same portion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsShown, portionId, activeKey, currentKey]);

  // Bring the lines being taught into view when the book opens or the lesson moves on. Without marked lines nothing scrolls:
  // the earlier parts are folded into one row, so the step's own part is already at the top.
  useEffect(() => {
    const root = panel.current;
    const marked = activeKey ? root?.querySelector("[data-active-portion]") : null;
    marked?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }, [activeKey, currentKey]);

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

  const toggle = (key: string) =>
    setOpened((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const ask = () => {
    if (!quote) return;
    const shown = quote.length > MAX_QUOTE ? `${quote.slice(0, MAX_QUOTE).trimEnd()}…` : quote;
    onAsk?.(`“${shown}” `);
    window.getSelection()?.removeAllRanges();
    setQuote("");
  };

  const here = parts[current];
  const hereKey = here?.key ?? "";
  const tutor = tutorButtons({
    role: readingRole,
    contentPhase,
    questionOpen,
    hasText: texts.length > 0 && !!onReading,
    replying: readingDisabled,
    voice,
    pressed: pressed[hereKey] ?? { readWithMe: false, readIt: false },
  });
  const hasTutor = !!tutor.readWithMe || !!tutor.readIt;
  const hasListen = !!here && here.text.audible && !voice;
  // Practice reads the lines being taught when this part holds some, else the part's first sentences.
  const [practising, setPractising] = useState<string | null>(null);
  const taughtHere = here ? here.part.paragraphs.filter((c) => inActivePortion(c.text, activeLines)).map((c) => c.text) : [];
  const excerpt = here ? practiceExcerpt((taughtHere.length ? taughtHere : here.part.paragraphs.map((c) => c.text)).join(" ")) : "";
  const inPractice = !!here && practising === hereKey && hasListen && !!excerpt;
  const read = (intent: ReadingIntent) => {
    setPressed((prev) => {
      const was = prev[hereKey] ?? { readWithMe: false, readIt: false };
      return { ...prev, [hereKey]: intent === "read_with_me" ? { ...was, readWithMe: true } : { ...was, readIt: true } };
    });
    onReading?.(intent);
  };
  const sectionMarked = sections.some((sec) => sec.chunks.some((c) => inActivePortion(c.text, activeLines)));
  const teaching = !!activeLines?.length && (marked.size > 0 || loose.length > 0 || sectionMarked);
  const earlier = parts.slice(0, Math.max(current, 0)).filter((p) => !marked.has(p.key));
  const jump = () =>
    panel.current?.querySelector("[data-active-portion], [data-testid=now-reading]")?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  // One "Now teaching" tag, on the first block of the portion in reading order ("also" is the card).
  const isActive = (c: { text: string }) => inActivePortion(c.text, activeLines);
  const order = [
    ...earlier.filter((p) => opened.has(p.key)).flatMap(({ part }) => inPrintOrder(part)),
    ...parts.flatMap((p, i) => (i === current ? [...inPrintOrder(p.part), { id: "also", text: "" }] : marked.has(p.key) ? inPrintOrder(p.part) : [])),
    ...(parts.length === 0 ? [{ id: "also", text: "" }] : []),
    ...sections.flatMap((sec) => sec.chunks),
  ];
  const nowId = order.find((c) => (c.id === "also" ? loose.length > 0 : isActive(c)))?.id ?? null;

  return (
    <aside
      ref={panel}
      aria-label="In your book"
      data-no-pan
      className="absolute inset-y-0 left-0 z-20 flex w-[min(440px,62%)] flex-col border-r border-[var(--ls-border)] bg-[var(--ls-paper)] shadow-[var(--ls-shadow-pop)]"
    >
      {/* Where you are: the text and part open now, and a way back to what is being taught. */}
      <header className="border-b border-[var(--ls-border)] bg-[var(--ls-card-warm)] px-5 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <BookOpen size={15} aria-hidden className="text-[var(--ls-primary)]" />
          <h2 className="lesson-display flex-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--ls-primary)]">In your book</h2>
          {/* eslint-disable-next-line no-restricted-syntax -- a panel close control. */}
          <button type="button" onClick={onClose} aria-label="Close the book" className="-mr-1.5 rounded-full p-1.5 text-[var(--ls-ink-mid)] hover:bg-[var(--ls-sage)]">
            <X size={16} aria-hidden />
          </button>
        </div>
        {here && (
          <p className="lesson-hand mt-1 truncate text-[24px] leading-tight text-[var(--ls-primary)]">
            {here.text.title}
            {here.text.parts.length > 1 && (
              <span className="lesson-display ml-2 align-middle text-[12px] font-semibold text-[var(--ls-ink-mid)]">Part {here.part.segment}</span>
            )}
          </p>
        )}
        {teaching && !inPractice && (
          <div className="mt-2 flex items-center gap-2 text-[12px] text-[var(--ls-ink-mid)]">
            <span aria-hidden className="h-3 w-5 shrink-0 rounded-sm bg-[rgb(217_242_121/0.55)] shadow-[inset_3px_0_0_var(--ls-accent-deep)]" />
            <span className="flex-1">Highlighted: what your tutor is teaching now</span>
            {/* eslint-disable-next-line no-restricted-syntax -- scrolls the book to the highlighted lines. */}
            <button type="button" onClick={jump} className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 font-semibold text-[var(--ls-primary)] hover:bg-[var(--ls-sage)]">
              <Crosshair size={13} aria-hidden /> Show me
            </button>
          </div>
        )}
      </header>

      {onAsk && quote && (
        <div role="region" aria-label="Ask about the words you selected" className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-[var(--ls-shadow)]">
          <p className="min-w-0 flex-1 truncate text-[13px] text-[var(--ls-ink-mid)]">“{quote}”</p>
          {/* eslint-disable-next-line no-restricted-syntax -- puts the selected words in the chat box. */}
          <button type="button" data-ask="true" className={BUTTON} onMouseDown={(event) => event.preventDefault()} onClick={ask}>
            <MessageCircleQuestion size={14} aria-hidden /> Ask about this
          </button>
        </div>
      )}

      {inPractice && here ? (
        <ReadingPractice
          instanceId={instanceId}
          passageId={here.text.id}
          segment={here.part.segment}
          excerpt={excerpt}
          fromLesson={taughtHere.length > 0}
          onClose={() => setPractising(null)}
        />
      ) : (
        <>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-3">
        {earlier.length > 0 && (
          <nav aria-label="Earlier parts" className="mb-4">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ls-ink-faint)]">Earlier</p>
            <div className="space-y-1.5">
              {earlier.map(({ text, part, key }) => {
                const open = opened.has(key);
                const label = text.parts.length > 1 ? `${text.title}, part ${part.segment}` : text.title;
                return (
                  <section key={key} id={`book-${key}`} data-part={key} aria-label={`${text.title}, part ${part.segment}`}>
                    {/* eslint-disable-next-line no-restricted-syntax -- a disclosure row for an earlier part of the book. */}
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => toggle(key)}
                      className="flex w-full items-center gap-2 rounded-lg border border-[var(--ls-border)] bg-white/70 px-3 py-1.5 text-left hover:border-[var(--ls-border-strong)]"
                    >
                      {open ? (
                        <ChevronDown size={15} aria-hidden className="shrink-0 text-[var(--ls-primary)]" />
                      ) : (
                        <ChevronRight size={15} aria-hidden className="shrink-0 text-[var(--ls-primary)]" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--ls-ink)]">{label}</span>
                      <span className="shrink-0 text-[12px] font-semibold text-[var(--ls-primary)]">{open ? "Hide" : "Read again"}</span>
                    </button>
                    {open && (
                      <div className="mt-2 border-l-2 border-[var(--ls-border)] pl-3">
                        <PartText part={part} activeLines={activeLines} nowId={nowId} focus />
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </nav>
        )}

        {parts.map(({ text, part, key }, i) => {
          const isCurrent = i === current;
          if (!isCurrent && !marked.has(key)) return null;
          const named = !isCurrent || texts.length > 1;
          return (
            <section
              key={key}
              id={`book-${key}`}
              data-part={key}
              aria-label={`${text.title}, part ${part.segment}`}
              aria-current={isCurrent ? "step" : undefined}
              className="mb-4"
            >
              {named && (
                <h3 className="lesson-display mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ls-ink-mid)]">
                  {text.title}
                  {text.parts.length > 1 ? ` · Part ${part.segment}` : ""}
                </h3>
              )}
              <PartText part={part} activeLines={activeLines} nowId={nowId} focus={teaching} />
              {isCurrent && <AlsoTaught lines={loose} portionId={portionId} nowId={nowId} />}
            </section>
          );
        })}

        {parts.length === 0 && <AlsoTaught lines={loose} portionId={portionId} nowId={nowId} />}

        {sections.map((section) => (
          <article key={section.id} aria-label={section.title} className="mb-5">
            <h3 className="lesson-hand text-[21px] leading-tight text-[var(--ls-primary)]">{section.title}</h3>
            {section.chunks.map((chunk) => {
              const active = isActive(chunk);
              const first = chunk.id === nowId;
              return chunk.element_type === "table" ? (
                <div key={chunk.id} className="my-2">
                  {first && <NowTag />}
                  <pre
                    aria-current={active ? "true" : undefined}
                    data-active-portion={active ? "" : undefined}
                    className={`overflow-x-auto whitespace-pre-wrap rounded-lg bg-white/70 p-2 font-mono text-[13px] text-[var(--ls-ink)] ${active ? ACTIVE : ""}`}
                  >
                    {chunk.text}
                  </pre>
                </div>
              ) : (
                <div key={chunk.id} className="my-2">
                  {first && <NowTag />}
                  <div
                    aria-current={active ? "true" : undefined}
                    data-active-portion={active ? "" : undefined}
                    className={`text-[16px] leading-[1.6] ${active ? ACTIVE : teaching ? "text-[var(--ls-ink-mid)]" : "text-[var(--ls-ink)]"}`}
                  >
                    <LessonMarkdown text={chunk.text} />
                  </div>
                </div>
              );
            })}
          </article>
        ))}
      </div>

      {/* What you can do with the part open now, in two kinds: ask your tutor (a conversation turn), or listen and practise
          (audio only, nothing sent to the tutor). Each button shows only when its rule in `bookActions` allows it. */}
      {(hasTutor || hasListen) && (
        <footer
          aria-label={here ? `What you can do with part ${here.part.segment}` : "What you can do"}
          className="max-h-[45%] space-y-2.5 overflow-y-auto border-t border-[var(--ls-border)] bg-[var(--ls-card-warm)] px-5 pb-3 pt-2.5"
        >
          {hasTutor && (
            <div>
              <p className={GROUP_LABEL}>Read with your tutor</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Reading together">
                {tutor.readWithMe && (
                  // eslint-disable-next-line no-restricted-syntax -- asks the tutor to read the text together.
                  <button type="button" className={BUTTON} disabled={tutor.readWithMe.disabled} onClick={() => read("read_with_me")}>
                    <Users size={14} aria-hidden /> {tutor.readWithMe.label}
                  </button>
                )}
                {tutor.readIt && (
                  // eslint-disable-next-line no-restricted-syntax -- tells the tutor the learner read it.
                  <button type="button" className={BUTTON} disabled={tutor.readIt.disabled} onClick={() => read("read_it")}>
                    <BookOpenCheck size={14} aria-hidden /> I&apos;ve read it
                  </button>
                )}
              </div>
            </div>
          )}
          {hasListen && here && (
            <div>
              <p className={GROUP_LABEL}>
                Listen &amp; practise{here.text.parts.length > 1 ? ` · Part ${here.part.segment}` : ""}
              </p>
              <ReadingControls
                instanceId={instanceId}
                passageId={here.text.id}
                segment={here.part.segment}
                text={here.part.paragraphs.map((c) => c.text).join("\n\n")}
                audible={here.text.audible}
                voice={voice}
                onPractice={() => setPractising(hereKey)}
              />
            </div>
          )}
        </footer>
      )}
        </>
      )}
    </aside>
  );
}

/** The one marker above the first highlighted block, so the highlight is found without reading a legend. */
function NowTag() {
  return (
    <p className="lesson-display mb-1 inline-flex items-center gap-1.5 rounded-full bg-[var(--ls-accent)] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--ls-primary)]">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--ls-primary)] motion-safe:animate-pulse" />
      Now teaching
    </p>
  );
}

/** A part's chunks in the order the panel prints them: paragraphs, then margin notes, then words to know. */
const inPrintOrder = (part: BookPart) => [
  ...part.paragraphs,
  ...part.glossary.filter((c) => !glossaryEntry(c.text).term),
  ...part.glossary.filter((c) => glossaryEntry(c.text).term),
];

const partKey = (text: BookText, part: BookPart) => `${text.id}-${part.segment}`;

/**
 * Which part of the book this step is about: the one holding the lines being taught now (content-led lessons), else the
 * newest part. The payload carries the text only up to the step's own part, so the newest is the step's.
 */
export function currentPart(parts: Array<{ part: BookPart }>, activeLines: string[] | undefined): number {
  const marked = parts.findIndex(({ part }) => part.paragraphs.some((c) => inActivePortion(c.text, activeLines)));
  return marked >= 0 ? marked : parts.length - 1;
}

/**
 * One part as printed: its paragraphs as running text, a note that explains (a fact box) set apart beside them, and the
 * glossary ("word: meaning") as "Words to know". Any of them can be in the portion being taught, and is marked where it is.
 */
function PartText({ part, activeLines, nowId, focus = false }: { part: BookPart; activeLines?: string[]; nowId: string | null; focus?: boolean }) {
  const words = part.glossary.filter((c) => glossaryEntry(c.text).term);
  const facts = part.glossary.filter((c) => !glossaryEntry(c.text).term);
  const marker = (chunk: { id: string; text: string }) => ({ active: inActivePortion(chunk.text, activeLines), first: chunk.id === nowId });
  return (
    <>
      {part.paragraphs.map((chunk) => {
        const { active, first } = marker(chunk);
        return (
          <div key={chunk.id} className="my-2.5">
            {first && <NowTag />}
            <p
              aria-current={active ? "true" : undefined}
              data-active-portion={active ? "" : undefined}
              data-chunk-id={chunk.id}
              className={`whitespace-pre-line ${PAGE_TEXT} ${active ? ACTIVE : focus ? "text-[var(--ls-ink-mid)]" : "text-[var(--ls-ink)]"}`}
            >
              {reflow(chunk.text)}
            </p>
          </div>
        );
      })}
      {facts.map((chunk) => {
        const { active, first } = marker(chunk);
        return (
          <aside key={chunk.id} aria-label="From the book's margin" className="my-3">
            {first && <NowTag />}
            <div
              aria-current={active ? "true" : undefined}
              data-active-portion={active ? "" : undefined}
              data-chunk-id={chunk.id}
              className={`rounded-xl border border-dashed px-3 py-2 ${
                active ? "border-[var(--ls-accent-deep)] bg-[rgb(217_242_121/0.30)]" : "border-[var(--ls-border-strong)] bg-white/60"
              }`}
            >
              <p className="lesson-display text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--ls-ink-mid)]">Did you know?</p>
              <p className="mt-0.5 font-[family-name:var(--font-source-serif)] text-[15px] leading-[1.55] text-[var(--ls-ink)]">{reflow(chunk.text)}</p>
            </div>
          </aside>
        );
      })}
      {words.length > 0 && (
        <dl aria-label="Words in this part" className="mt-3 rounded-xl bg-[var(--ls-sage)] px-3 py-2 text-[14px] text-[var(--ls-ink)]">
          <p className="lesson-display mb-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--ls-ink-mid)]">Words to know</p>
          {words.map((chunk) => {
            const { term, meaning } = glossaryEntry(chunk.text);
            const { active } = marker(chunk);
            return (
              <div
                key={chunk.id}
                data-active-portion={active ? "" : undefined}
                data-chunk-id={chunk.id}
                className={`py-0.5 ${active ? "-mx-1 rounded bg-[rgb(217_242_121/0.45)] px-1" : ""}`}
              >
                <dt className="inline font-semibold">{term}</dt>
                <dd className="inline">: {meaning}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </>
  );
}

/**
 * The lines being taught that the book's own text here does not show whole, printed exactly as the server sent them. Headings
 * are left out: they are the text's title, shown above.
 */
function AlsoTaught({ lines, portionId, nowId }: { lines: string[]; portionId?: string; nowId: string | null }) {
  if (lines.length === 0) return null;
  const first = nowId === "also";
  return (
    <div className="mb-3 mt-4">
      {first && <NowTag />}
      <div
        aria-current="true"
        aria-label="Also being taught"
        data-portion-id={portionId}
        data-testid="now-reading"
        className="rounded-xl bg-[rgb(217_242_121/0.30)] px-3 py-2 shadow-[inset_3px_0_0_var(--ls-accent-deep)]"
      >
        <p className="lesson-display text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--ls-ink-mid)]">Also being taught</p>
        {lines.map((line, i) => (
          <p key={i} data-source-line className={`mt-1 whitespace-pre-line ${PAGE_TEXT} text-[var(--ls-ink)]`}>
            {reflow(line)}
          </p>
        ))}
      </div>
    </div>
  );
}
