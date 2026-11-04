"use client";

import { useId, useMemo, useState } from "react";
import { BookOpen, Check } from "lucide-react";
import type { PartnerBook } from "../types/sources";

interface BookPickerProps {
  id: string;
  value: string;
  onChange: (title: string) => void;
  /** A past book was picked: the form fills its title and edition. */
  onPick: (book: PartnerBook) => void;
  /** The partner's own books (``GET /v1/sources/books``); none makes this a plain text box. */
  books: PartnerBook[];
  className: string;
  placeholder?: string;
}

/** Most options shown at once; typing narrows them. */
const MAX_SHOWN = 8;

/**
 * The upload form's Book Title: a text box that also offers the books this
 * partner filed chapters under before (theirs only), so the same book is never
 * filed under two spellings. Picking one fills the title and its edition;
 * typing a new name is always allowed, since a first chapter has nothing to pick.
 */
export function BookPicker({ id, value, onChange, onPick, books, className, placeholder }: BookPickerProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const shown = useMemo(() => {
    const typed = value.trim().toLowerCase();
    const matching = typed ? books.filter((b) => b.book_title.toLowerCase().includes(typed)) : books;
    return matching.slice(0, MAX_SHOWN);
  }, [books, value]);
  const expanded = open && shown.length > 0;

  const pick = (book: PartnerBook) => {
    onPick(book);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!shown.length) return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + shown.length) % shown.length);
    } else if (e.key === "Enter" && expanded && active >= 0) {
      e.preventDefault();
      pick(shown[active]);
    } else if (e.key === "Escape" && expanded) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        className={className}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {expanded && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Books you filed before"
          className="absolute z-20 mt-1.5 w-full max-h-72 overflow-y-auto rounded-2xl bg-white border border-[#122D30]/10 shadow-[0_12px_32px_rgba(18,45,48,0.12)] p-1.5"
        >
          {shown.map((book, i) => {
            const chosen = book.book_title === value;
            return (
              <li
                key={`${book.book_title}|${book.edition_label}|${book.subject}|${book.grade}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // Keep the focus in the box, so its blur does not close the list before the pick lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(book)}
                onMouseEnter={() => setActive(i)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer ${
                  i === active ? "bg-[#DCEBE7]" : "hover:bg-[#F6F7F2]"
                }`}
              >
                <BookOpen size={14} className="shrink-0 text-[#075E63]" aria-hidden />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-[#122D30] truncate">{book.book_title}</span>
                  <span className="block text-[10px] font-bold text-[#122D30]/45 truncate">
                    {book.edition_label} · Grade {book.grade} · {book.chapters} chapter{book.chapters === 1 ? "" : "s"}
                  </span>
                </span>
                {chosen && <Check size={13} className="shrink-0 text-[#075E63]" aria-hidden />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
