"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Check, ChevronDown, CirclePlus, Library } from "lucide-react";
import { PANEL_CLASSNAME } from "@/components/ui/Select";
import { usePopoverPosition, VIEWPORT_MARGIN } from "@/components/ui/usePopoverPosition";
import type { PartnerBook } from "../types/sources";

interface BookPickerProps {
  id: string;
  value: string;
  onChange: (title: string) => void;
  /** A past book was picked: the form fills its title and edition. */
  onPick: (book: PartnerBook) => void;
  /** The partner's own books (``GET /v1/sources/books``); none makes this a plain text box. */
  books: PartnerBook[];
  /** The form's current edition, so the picked book (title and edition) is the one marked. */
  edition?: string;
  className: string;
  placeholder?: string;
}

/** Most options shown at once; typing narrows them. */
const MAX_SHOWN = 8;
const ACCENT = "#122D30";
// Measured row and header heights, so the list flips above the box only when it truly does not fit below.
const ROW_HEIGHT = 54;
const HEADER_HEIGHT = 38;
const GAP = 8;
const MAX_PANEL_HEIGHT = 340;

const norm = (s: string) => s.trim().toLowerCase();
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The typed words, punctuation dropped: "Ganita Prakash-2" and "ganita prakash 2" are the same words. */
const wordsOf = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Every typed word appears in the title, in any order: near-identical names show up together. */
const matches = (title: string, words: string[]) => {
  const t = title.toLowerCase();
  return words.every((w) => t.includes(w));
};

/** The title with each typed word marked, so near-identical names are told apart at a glance. */
function Highlighted({ text, words }: { text: string; words: string[] }) {
  const lower = text.toLowerCase();
  const marked = new Array<boolean>(text.length).fill(false);
  for (const w of words) {
    for (let at = lower.indexOf(w); at >= 0; at = lower.indexOf(w, at + w.length)) marked.fill(true, at, at + w.length);
  }
  const parts: { text: string; on: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = parts[parts.length - 1];
    if (last && last.on === marked[i]) last.text += text[i];
    else parts.push({ text: text[i], on: marked[i] });
  }
  return (
    <>
      {parts.map((p, i) =>
        p.on ? (
          <mark key={i} className="bg-transparent text-[#075E63] underline decoration-[#075E63]/35 underline-offset-2">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/**
 * The upload form's Book Title: a text box that also offers the books this
 * partner filed chapters under before (theirs only), so the same book is never
 * filed under two spellings. Picking one fills the title and its edition;
 * typing a new name is always allowed, since a first chapter has nothing to pick.
 * A line under the box says which of the two the chapter will do.
 */
export function BookPicker({ id, value, onChange, onPick, books, edition, className, placeholder }: BookPickerProps) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const typed = norm(value);
  const words = useMemo(() => wordsOf(value), [value]);
  const shown = useMemo(
    () => (words.length ? books.filter((b) => matches(b.book_title, words)) : books).slice(0, MAX_SHOWN),
    [books, words],
  );
  // A typed name no past book carries: the list ends with "file it as a new book".
  const offerNew = typed.length > 0 && !books.some((b) => norm(b.book_title) === typed);
  const count = shown.length + (offerNew ? 1 : 0);
  const expanded = open && books.length > 0 && count > 0;

  const isChosen = (b: PartnerBook) =>
    norm(b.book_title) === typed && (edition === undefined || norm(b.edition_label) === norm(edition));
  const chosen = typed ? books.find(isChosen) : undefined;

  const estimatedHeight = Math.min(MAX_PANEL_HEIGHT, HEADER_HEIGHT + count * ROW_HEIGHT + 12);
  const position = usePopoverPosition(expanded, wrapRef, { width: "trigger", estimatedHeight, gap: GAP });
  // Placed on the element after each reposition (open, scroll, resize), from the box as it sits now.
  // Below the box, the list hangs from the box's bottom. Flipped above it, the list is pinned by its
  // bottom edge to just above the box, so a list taller than the estimate grows upward and never
  // covers the box; it scrolls once it reaches the top of the screen.
  useLayoutEffect(() => {
    const el = panelRef.current;
    const box = wrapRef.current?.getBoundingClientRect();
    if (!el || !box || !position) return;
    if (position.flipped) {
      el.style.top = "auto";
      el.style.bottom = `${window.innerHeight - box.top + GAP}px`;
      el.style.maxHeight = `${Math.min(MAX_PANEL_HEIGHT, Math.max(120, box.top - GAP - VIEWPORT_MARGIN))}px`;
    } else {
      el.style.bottom = "auto";
      el.style.top = `${box.bottom + GAP}px`;
      el.style.maxHeight = `${Math.min(MAX_PANEL_HEIGHT, Math.max(120, window.innerHeight - box.bottom - GAP - VIEWPORT_MARGIN))}px`;
    }
  }, [position]);

  // Keep the highlighted row in view while arrowing through the list.
  useEffect(() => {
    if (!expanded || active < 0) return;
    panelRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, expanded]);

  const close = () => {
    setOpen(false);
    setActive(-1);
  };
  const pick = (book: PartnerBook) => {
    onPick(book);
    close();
  };
  const commit = (i: number) => (i < shown.length ? pick(shown[i]) : close());

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!books.length || !count) return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + count) % count);
    } else if (e.key === "Enter" && expanded && active >= 0) {
      e.preventDefault();
      commit(active);
    } else if (e.key === "Escape" && expanded) {
      e.preventDefault();
      close();
    }
  };

  const rowClass = (i: number) =>
    `flex items-center gap-3 mx-1.5 px-2.5 py-2 rounded-xl cursor-pointer transition-colors ${
      i === active ? "bg-[#122D30]/[0.06]" : ""
    }`;

  const panel = expanded && position && (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: position.flipped ? 6 : -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: position.flipped ? 6 : -6, scale: 0.98 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      // Keep the focus in the box, so its blur does not close the list before the pick lands.
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: "fixed",
        left: position.left,
        width: position.width,
      }}
      className={`z-[200] flex flex-col ${PANEL_CLASSNAME}`}
    >
      {shown.length > 0 ? (
        <div className="flex shrink-0 items-center gap-2 px-4 pt-3 pb-1.5 text-[10px] font-black uppercase tracking-widest text-[#122D30]/45">
          <Library size={12} aria-hidden />
          <span className="flex-1">{typed ? "Similar books you filed" : "Books you filed before"}</span>
          <span className="tabular-nums">{shown.length}</span>
        </div>
      ) : (
        <p className="shrink-0 px-4 pt-3 pb-1.5 text-[11px] font-medium text-[#122D30]/45">
          No book you filed matches this title.
        </p>
      )}
      <ul id={listId} role="listbox" aria-label="Books you filed before" className="min-h-0 flex-1 overflow-y-auto pb-1.5">
        {shown.map((book, i) => {
          const marked = isChosen(book);
          return (
            <li
              key={`${book.book_title}|${book.edition_label}|${book.subject}|${book.grade}`}
              id={`${listId}-${i}`}
              data-index={i}
              role="option"
              aria-selected={marked}
              onClick={() => pick(book)}
              onMouseEnter={() => setActive(i)}
              className={rowClass(i)}
            >
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                  marked ? "bg-[#075E63] text-white" : "bg-[#DCEBE7]/70 text-[#075E63]"
                }`}
              >
                <BookOpen size={14} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-[#122D30]">
                  <Highlighted text={book.book_title} words={words} />
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-[#122D30]/55">
                  <span className="truncate rounded-md bg-[#122D30]/[0.05] px-1.5 py-px font-semibold text-[#122D30]/70">
                    {book.edition_label}
                  </span>
                  <span className="shrink-0">Grade {book.grade}</span>
                  <span aria-hidden className="shrink-0 text-[#122D30]/25">·</span>
                  <span className="shrink-0">{plural(book.chapters, "chapter")}</span>
                </span>
              </span>
              {marked && <Check size={15} className="shrink-0 text-[#075E63]" aria-hidden />}
            </li>
          );
        })}
        {offerNew && (
          <li
            id={`${listId}-${shown.length}`}
            data-index={shown.length}
            role="option"
            aria-selected={false}
            onClick={close}
            onMouseEnter={() => setActive(shown.length)}
            className={`${rowClass(shown.length)} ${shown.length ? "mt-1 border-t border-[#122D30]/[0.06] pt-2.5" : ""}`}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-dashed border-[#122D30]/25 text-[#122D30]/60">
              <CirclePlus size={14} aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-[13px] text-[#122D30]/70">
              File as a new book: <span className="font-semibold text-[#122D30]">“{value.trim()}”</span>
            </span>
          </li>
        )}
      </ul>
    </motion.div>
  );

  // What the chapter will do with this title, said under the box once past books exist.
  const status = !books.length
    ? null
    : chosen
      ? { tone: "known" as const, text: `Adds to a book you filed before · ${chosen.edition_label} · ${plural(chosen.chapters, "chapter")}` }
      : typed
        ? { tone: "new" as const, text: "Files as a new book. Filed it before? Pick it from the list." }
        : { tone: "hint" as const, text: `Pick one of your ${plural(books.length, "book")}, or type a new title.` };

  return (
    <div>
      <div ref={wrapRef} className="relative">
        <input
          ref={inputRef}
          id={id}
          value={value}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
          aria-describedby={status ? `${listId}-status` : undefined}
          autoComplete="off"
          placeholder={placeholder}
          className={className}
          // Inline, so the chevron's room wins over the call site's padding class whatever its order.
          style={{ ...(books.length ? { paddingRight: 44 } : {}), ...(expanded ? { borderColor: ACCENT } : {}) }}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={close}
          onKeyDown={onKeyDown}
        />
        {books.length > 0 && (
          // eslint-disable-next-line no-restricted-syntax -- an icon affordance inside the text box, not a standalone control
          <button
            type="button"
            tabIndex={-1}
            aria-label={expanded ? "Hide your books" : "Show your books"}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              inputRef.current?.focus();
              if (expanded) close();
              else setOpen(true);
            }}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-2xl text-[#122D30]/40 hover:text-[#122D30]"
          >
            <ChevronDown
              size={16}
              className="transition-transform duration-200"
              style={{ transform: expanded ? "rotate(180deg)" : "none", color: expanded ? ACCENT : undefined }}
            />
          </button>
        )}
      </div>
      {status && (
        <p
          id={`${listId}-status`}
          className={`mt-1.5 flex items-center gap-1.5 px-1 text-[10px] font-semibold ${
            status.tone === "known" ? "text-[#075E63]" : "text-[#122D30]/45"
          }`}
        >
          {status.tone === "known" && <Check size={11} aria-hidden className="shrink-0" />}
          {status.tone === "new" && <CirclePlus size={11} aria-hidden className="shrink-0" />}
          <span className="truncate">{status.text}</span>
        </p>
      )}
      {typeof document !== "undefined" && createPortal(<AnimatePresence>{panel}</AnimatePresence>, document.body)}
    </div>
  );
}
