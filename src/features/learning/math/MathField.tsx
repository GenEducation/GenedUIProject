"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { MathfieldElement } from "mathlive";
import { filterNotations, type Notation } from "./notations";
import { escapeForField } from "./latex";
import { GRADE6_KEYBOARD } from "./keyboard";

/**
 * A text box for maths lessons (MathLive's `<math-field>`), for the chat and for a check's typed answer: plain words,
 * always, typed as in any text box; maths only where the student asks for it. Typing `/` at the start of a word opens
 * the notations menu (Line, Fraction, Angle…), like a slash command; the pick goes in as real maths with boxes to fill,
 * Tab moves between the boxes and Space goes back to words. `/` after a number or letter is still division (`1/2`), so
 * nothing is ever guessed.
 *
 * It holds LaTeX; `./latex.ts` turns that into a chat message or a checker answer. On a touch screen MathLive's maths
 * keyboard opens inside it. MathLive loads only in the browser, when a field mounts; its fonts are in `public/mathlive`.
 */

/**
 * Our look inside MathLive's shadow root, which page CSS can't reach: a caret as tall as a typed line (MathLive's is
 * 0.76em, about three quarters of a letter), and no padding or minimum height of its own, so the field sits exactly
 * where a plain text box would. Its content area spans the whole field: MathLive only takes clicks on that area, which
 * is otherwise as narrow as what's typed (4px when empty), so a click on the rest of the line did nothing. And a long
 * message wraps onto new lines at its spaces, as in a text area, where MathLive keeps everything on one line that
 * scrolls sideways; a maths run stays whole. The placeholder sits under the caret at the start of the line, where the
 * full-width text would otherwise push it to the far end. A selection tints the selected words, line by line, where MathLive draws
 * one rectangle around them (which, over wrapped lines, covers words that aren't selected). Empty boxes (`.gx-slot`,
 * marked by `markSlots`) show nothing until the caret is in one (any mark beside a fraction bar reads as a symbol: two
 * underlines as `=`, two dots as `÷`); the one being filled shows the caret, as any other place in the box does.
 */
const FIELD_CSS = `
.ML__container { padding: 0; min-height: 0; align-items: center; width: 100%; box-sizing: border-box; cursor: text; }
.ML__content { flex: 1 1 auto; min-width: 0; }
.ML__is-inline { display: block; width: 100%; }
.ML__content > .ML__latex { white-space: normal; width: 100%; }
.ML__content-placeholder { position: absolute; inset: 0 auto auto 0; max-width: 100%; pointer-events: none; }
.ML__content > .ML__latex > .ML__base { display: inline; width: auto; white-space: normal; }
.ML__content > .ML__latex > .ML__base .ML__text { white-space: pre-wrap; }
.ML__selection { display: none; }
.ML__focused .ML__selected { background: var(--_selection-background-color); }
.ML__focused .ML__selected .ML__selected { background: transparent; }
.ML__caret::after, .ML__text-caret::after {
  height: 1.15em;
  bottom: -0.2em;
  --_caret-width: 2px;
}
.gx-slot, .ML__focused .ML__selected.gx-slot { position: relative; color: transparent !important; }
.ML__focused .ML__selected > .gx-slot::after {
  content: "";
  position: absolute;
  left: calc(50% - 1px);
  width: 2px;
  top: 0.1em;
  bottom: 0.15em;
  border-radius: 1px;
  background: var(--_caret-color, #075E63);
  animation: gx-blink 1.05s steps(1) infinite;
}
@keyframes gx-blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .ML__focused .ML__selected > .gx-slot::after { animation: none; } }
.ML__focused .ML__selected:has(> .gx-slot:only-child) { background: transparent; }
`;
/** The character MathLive draws an empty box with. */
const SLOT = "\u25A2";
/**
 * Mark each empty box (MathLive draws it as a plain ▢ character, with no class of its own) so it can be drawn as an
 * underlined gap instead of a grey square.
 */
function markSlots(root: ShadowRoot) {
  for (const el of root.querySelectorAll<HTMLElement>(".ML__content span:not(.gx-slot)")) {
    if (el.childElementCount === 0 && el.textContent === SLOT) el.classList.add("gx-slot");
  }
}
let fieldSheet: CSSStyleSheet | null = null;
function styleField(field: HTMLElement) {
  const root = field.shadowRoot;
  if (!root || typeof CSSStyleSheet === "undefined" || !("adoptedStyleSheets" in root)) return;
  if (!fieldSheet) {
    fieldSheet = new CSSStyleSheet();
    fieldSheet.replaceSync(FIELD_CSS);
  }
  if (!root.adoptedStyleSheets.includes(fieldSheet)) root.adoptedStyleSheets = [...root.adoptedStyleSheets, fieldSheet];
}

let loading: Promise<typeof import("mathlive")> | null = null;
function loadMathLive() {
  loading ??= import("mathlive").then((ml) => {
    ml.MathfieldElement.fontsDirectory = "/mathlive/fonts";
    ml.MathfieldElement.soundsDirectory = null;
    // Grade 6 keys in two tabs (numbers, geometry), each with a close key, instead of MathLive's defaults.
    window.mathVirtualKeyboard.layouts = GRADE6_KEYBOARD;
    return ml;
  });
  return loading;
}

export interface MathFieldHandle {
  focus: () => void;
  /** Put words at the caret (dictation), as words. */
  insertText: (text: string) => void;
}

interface MathFieldProps {
  /** LaTeX. Kept in step when it changes from outside (cleared after sending, say). */
  value: string;
  onChange: (latex: string) => void;
  /** Enter (without Shift): send the message or the answer. Given the field's value at that moment, which can be ahead
   *  of the last `value` React has rendered when keys arrive quickly. */
  onEnter?: (latex: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel: string;
  /** Classes for the field's own box (its height, its scroll), never the notations menu above it, which must not be clipped. */
  className?: string;
}

/** The open menu: where its `/` is in the field, the letters typed after it, and the highlighted row. */
type Menu = { start: number; query: string; index: number } | null;

export const MathField = forwardRef<MathFieldHandle, MathFieldProps>(function MathField(
  { value, onChange, onEnter, placeholder, disabled = false, ariaLabel, className = "" },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<MathfieldElement | null>(null);
  const [ready, setReady] = useState(false);
  const [menu, setMenuState] = useState<Menu>(null);
  const matches = menu ? filterNotations(menu.query) : [];
  // The menu as of the last key, updated at once: keys typed faster than React renders still reach the menu.
  const menuRef = useRef<Menu>(null);
  // The `/` whose menu was closed with Esc: it stays text, and its menu stays shut while the word is edited.
  const dismissedAt = useRef<number | null>(null);
  const setMenu = (next: Menu) => {
    menuRef.current = next;
    setMenuState(next);
  };

  // The latest props, read by the element's listeners without re-binding them.
  const live = useRef({ onChange, onEnter });
  useEffect(() => {
    live.current = { onChange, onEnter };
  });

  const choose = (n: Notation) => {
    const field = fieldRef.current;
    const open = menuRef.current;
    setMenu(null);
    if (!field) return;
    // The pick takes the place of the `/word` that found it.
    if (open) field.selection = { ranges: [[open.start, field.position]], direction: "forward" };
    if (open) field.executeCommand("deleteBackward");
    // Into maths first, so what is typed in the boxes is maths too ("Maths" alone: a free maths run at the caret).
    field.executeCommand(["switchMode", "math"]);
    if (n.latex) field.insert(n.latex, { format: "latex", selectionMode: "placeholder", focus: true });
    live.current.onChange(field.value);
    field.focus();
  };
  const chooseRef = useRef(choose);
  useEffect(() => {
    chooseRef.current = choose;
  });

  useImperativeHandle(ref, () => ({
    focus: () => fieldRef.current?.focus(),
    insertText: (text: string) => {
      const field = fieldRef.current;
      if (!field || !text) return;
      field.insert(escapeForField(text), { mode: "text", format: "latex", focus: true });
      live.current.onChange(field.value);
    },
  }), []);

  /**
   * Open, update or close the menu from the text itself, as Claude's slash commands do: the menu shows while the caret
   * sits at the end of a `/word` that starts a word (`/`, `/fr`, `/angle`) in words mode. The `/` and the letters are
   * real text in the field all along, so closing the menu (Space, Esc, a click away, a word nothing matches) leaves
   * exactly what was typed: `/` on its own, `and/or`, `/etc` all just stay.
   */
  function syncMenu(f: MathfieldElement) {
    const slash = slashWordAt(f);
    if (!slash || slash.start === dismissedAt.current || filterNotations(slash.query).length === 0) {
      if (menuRef.current) setMenu(null);
      return;
    }
    const open = menuRef.current;
    const same = open && open.start === slash.start && open.query === slash.query;
    if (!same) setMenu({ ...slash, index: 0 });
  }
  const syncMenuRef = useRef(syncMenu);
  useEffect(() => {
    syncMenuRef.current = syncMenu;
  });

  /** The menu's own keys (everything else types as usual), and Space leaving maths for words. */
  function onChatKey(e: KeyboardEvent, f: MathfieldElement) {
    const stop = () => { e.preventDefault(); e.stopPropagation(); };
    const open = menuRef.current;
    if (open) {
      const list = filterNotations(open.query);
      if (e.key === "Escape") {
        // Keep the text, close the menu, and don't reopen it for this `/` while it is edited.
        stop();
        dismissedAt.current = open.start;
        setMenu(null);
        return;
      }
      if (e.key === "ArrowDown") { stop(); setMenu({ ...open, index: (open.index + 1) % Math.max(1, list.length) }); return; }
      if (e.key === "ArrowUp") { stop(); setMenu({ ...open, index: (open.index - 1 + list.length) % Math.max(1, list.length) }); return; }
      if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
        const pick = list.at(open.index);
        if (pick) { stop(); chooseRef.current(pick); }
        return;
      }
      return; // letters, Space, Backspace, arrows: typed as usual, and the menu follows the text
    }
    // A new `/` is a new chance for the menu, even where an earlier one was dismissed.
    if (e.key === "/") dismissedAt.current = null;
    // Space after a maths run with nothing left to fill: out of whatever the caret is inside (the line's letters, a
    // power), then back to words.
    if (e.key === " " && f.mode === "math" && !f.value.includes("placeholder")) {
      stop();
      for (let depth = 0; depth < 8; depth++) {
        const at = f.position;
        f.executeCommand("moveAfterParent");
        if (f.position === at) break;
      }
      f.executeCommand(["switchMode", "text"]);
      f.insert(" ", { mode: "text", format: "latex" });
      live.current.onChange(f.value);
    }
  }

  useEffect(() => {
    let cancelled = false;
    let field: MathfieldElement | null = null;
    let slots: MutationObserver | null = null;
    void loadMathLive().then((ml) => {
      if (cancelled || !hostRef.current) return;
      field = new ml.MathfieldElement();
      field.defaultMode = "text";
      field.smartMode = false; // never guess what is a word and what is maths
      field.smartFence = true;
      // On a phone: the phone's own keyboard for words, with the field's keyboard button there for maths.
      field.mathVirtualKeyboardPolicy = "manual";
      field.setAttribute("aria-label", ariaLabel);
      field.className = "lesson-mathfield";
      // Options that read the rendered field can only be set once it is on the page.
      hostRef.current.appendChild(field);
      field.menuItems = [];
      styleField(field);
      // MathLive redraws its content as it changes; empty boxes are marked again before each paint.
      const shadow = field.shadowRoot;
      if (shadow) {
        markSlots(shadow);
        slots = new MutationObserver(() => markSlots(shadow));
        slots.observe(shadow, { childList: true, subtree: true });
      }

      const f = field;
      f.addEventListener("input", () => {
        live.current.onChange(f.value);
        syncMenuRef.current(f);
      });
      // MathLive reports Enter as a line break about to be inserted: that's a send, unless Shift is held.
      f.addEventListener("beforeinput", (e) => {
        if ((e as InputEvent).inputType === "insertLineBreak" && !menuRef.current) {
          e.preventDefault();
          hideKeyboard();
          live.current.onEnter?.(f.value);
        }
      });
      f.addEventListener("focusout", () => {
        window.setTimeout(() => {
          if (!f.hasFocus()) hideKeyboard();
        }, 0);
      });
      // Captured on the host, so the menu's keys never reach MathLive's own handling.
      f.addEventListener("keydown", (e) => onChatKey(e, f), { capture: true });
      // A click or an arrow key moving the caret off the `/word` closes the menu; back onto it reopens it.
      f.addEventListener("selection-change", () => {
        syncMenuRef.current(f);
        keepCaretInView(f, hostRef.current);
      });
      f.addEventListener("focusout", () => { if (menuRef.current) setMenu(null); });
      // Esc only ever closes things: the menu (above), else the maths keyboard on a touch screen. MathLive's own Esc
      // (typing raw LaTeX) never reaches a student. Tapping the keyboard's keys keeps the field focused, so it stays
      // open while in use.
      f.addEventListener("keydown", (e) => {
        if (e.key !== "Escape" || e.defaultPrevented) return;
        e.preventDefault();
        e.stopPropagation();
        hideKeyboard();
      }, { capture: true });
      fieldRef.current = f;
      setReady(true);
    });
    return () => {
      cancelled = true;
      if (field?.hasFocus()) hideKeyboard();
      slots?.disconnect();
      field?.remove();
      fieldRef.current = null;
    };
    // The element is made once; the rest is kept in step below.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    if (field.value !== value) {
      field.value = value;
      // Cleared (a message sent): the next one starts in words again, even if the last one ended in maths.
      if (!value && field.mode !== "text") field.executeCommand(["switchMode", "text"]);
    }
    field.disabled = disabled;
    // MathLive reads a placeholder as LaTeX: as text it keeps its spaces and the body type.
    if (placeholder !== undefined) field.placeholder = `\\text{${escapeForField(placeholder)}}`;
    field.setAttribute("aria-label", ariaLabel);
  }, [ready, value, disabled, placeholder, ariaLabel]);

  return (
    <div className="relative min-w-0">
      <div ref={hostRef} data-ready={ready || undefined} className={className} />
      {menu && (
        <div
          role="listbox"
          aria-label="Maths notation"
          className="absolute bottom-full left-0 z-30 mb-3 w-[min(320px,100%)] overflow-hidden rounded-2xl border border-[var(--ls-border)] bg-white shadow-[0_18px_40px_-18px_rgb(18_45_48/0.45)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--ls-border)] px-3.5 py-2 text-[12px] text-[var(--ls-ink-mid)]">
            <span>
              Maths <span className="font-mono text-[var(--ls-ink)]">/{menu.query}</span>
            </span>
            <span className="text-[var(--ls-ink-faint)]">Enter to insert · Esc keeps “/”</span>
          </div>
          <ul className="max-h-[264px] overflow-y-auto py-1">
              {matches.map((n, i) => (
                <li
                  key={n.id}
                  role="option"
                  aria-selected={i === menu.index}
                  // Keep the field focused: the pick happens on mouse down.
                  onMouseDown={(e) => { e.preventDefault(); choose(n); }}
                  onMouseEnter={() => setMenu({ ...menu, index: i })}
                  className={`flex cursor-pointer items-center gap-3 px-3.5 py-2 ${i === menu.index ? "bg-[var(--ls-primary-soft)]" : ""}`}
                >
                  <span className="grid h-8 w-12 shrink-0 place-items-center rounded-lg bg-[var(--ls-sage)] font-serif text-[15px] text-[var(--ls-ink)]">
                    {n.sample}
                  </span>
                  <span className="min-w-0 flex-1 text-[14px] font-semibold text-[var(--ls-ink)]">{n.name}</span>
                  <span className="font-mono text-[12px] text-[var(--ls-ink-faint)]">/{n.id}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
});

/**
 * Scroll the box (which scrolls once the message is taller than it) so the caret stays in sight, as a text area does
 * by itself: typing on past the last visible line, or arrowing up out of view.
 */
function keepCaretInView(f: MathfieldElement, box: HTMLElement | null) {
  requestAnimationFrame(() => {
    const caret = f.shadowRoot?.querySelector(".ML__caret, .ML__text-caret");
    if (!caret || !box || box.scrollHeight <= box.clientHeight) return;
    const c = caret.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    if (c.bottom > b.bottom) box.scrollTop += c.bottom - b.bottom + 4;
    else if (c.top < b.top) box.scrollTop -= b.top - c.top + 4;
  });
}

/** Close MathLive's maths keyboard if it's up (it lives on the page, not in the field). */
function hideKeyboard() {
  const keyboard = (window as { mathVirtualKeyboard?: { visible: boolean; hide: () => void } }).mathVirtualKeyboard;
  if (keyboard?.visible) keyboard.hide();
}

/**
 * The `/word` just before the caret, when it starts a word in words mode: `/`, `/fr`. Not after a letter or number, so
 * `1/2` and `and/or` are never a menu, and only with the caret at its end, as a slash command is typed.
 */
function slashWordAt(f: MathfieldElement): { start: number; query: string } | null {
  if (f.mode !== "text") return null;
  const at = f.position;
  const sel = f.selection;
  if (sel.ranges.some(([a, b]) => a !== b)) return null;
  let query = "";
  for (let i = at; i > 0 && i > at - 24; i--) {
    const ch = f.getValue(i - 1, i, "plain-text");
    if (ch === "/") {
      const before = i - 1 > 0 ? f.getValue(i - 2, i - 1, "plain-text") : "";
      return before === "" || /\s$/.test(before) ? { start: i - 1, query } : null;
    }
    if (!/^[\p{L}\p{N}]$/u.test(ch)) return null;
    query = ch + query;
  }
  return null;
}
