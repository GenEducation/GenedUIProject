import type React from "react";

/**
 * Enter-to-send for a textarea: Enter submits, Shift+Enter or Ctrl/Cmd+Enter starts a new line. Without a handler,
 * Enter submits the textarea's form (its submit handler still validates). Left alone while an IME is composing,
 * where Enter picks a candidate.
 */
export function enterToSubmit(onSubmit?: (el: HTMLTextAreaElement) => void) {
  return (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.altKey || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    const el = e.currentTarget;
    if (e.ctrlKey || e.metaKey) insertNewline(el);
    else if (onSubmit) onSubmit(el);
    else el.form?.requestSubmit();
  };
}

/** Browsers add nothing for Ctrl+Enter in a textarea, so the line break is typed in by hand. */
function insertNewline(el: HTMLTextAreaElement) {
  // execCommand keeps the browser's undo history; jsdom lacks it.
  if (typeof document.execCommand === "function" && document.execCommand("insertText", false, "\n")) return;
  const { selectionStart: start, selectionEnd: end, value } = el;
  const next = `${value.slice(0, start)}\n${value.slice(end)}`;
  if (el.maxLength >= 0 && next.length > el.maxLength) return;
  // The native setter, so React's onChange sees the input event.
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(el, next);
  el.selectionStart = el.selectionEnd = start + 1;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
