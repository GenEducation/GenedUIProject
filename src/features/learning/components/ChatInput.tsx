"use client";

import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Mic, SendHorizontal, Square } from "lucide-react";
import { lessonVoiceEnabled } from "./LessonRail";

/** The backend refuses a learner message over 1000 characters. */
export const MAX_MESSAGE = 1000;
const COUNT_FROM = 800;

interface ChatInputProps {
  /** A reply is streaming: the send button becomes Stop. */
  replying: boolean;
  /** No active node to talk on (still loading, or the lesson is finished). */
  disabled: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onVoice: () => void;
}

/**
 * The chat's composer. Enter sends, Shift+Enter adds a line. Sending while the
 * tutor is still replying is allowed: the new turn supersedes the open one.
 */
export function ChatInput({ replying, disabled, onSend, onStop, onVoice }: ChatInputProps) {
  const [text, setText] = useState("");
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = !disabled && text.trim().length > 0;

  // Grow with the text up to ~5 lines, then scroll.
  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${Math.min(area.scrollHeight, 132)}px`;
  }, [text]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;
    onSend(text);
    setText("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={submit} className="border-t border-[var(--ls-border)] p-3">
      <div className="rounded-[20px] border border-[var(--ls-border-strong)] bg-white px-3 pt-2.5 pb-2 transition-shadow focus-within:shadow-[0_0_0_3px_var(--ls-primary-wash)]">
        <label htmlFor="lesson-message" className="sr-only">
          Message your tutor
        </label>
        <textarea
          id="lesson-message"
          ref={areaRef}
          rows={1}
          value={text}
          maxLength={MAX_MESSAGE}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={disabled ? "The lesson is getting ready…" : "Type a message…"}
          className="block w-full resize-none bg-transparent text-[14px] leading-relaxed outline-none placeholder:text-[var(--ls-ink-faint)] disabled:cursor-not-allowed"
        />
        <div className="mt-1.5 flex items-center gap-2">
          {/* eslint-disable-next-line no-restricted-syntax -- a round icon toggle in the composer. */}
          <button
            type="button"
            onClick={onVoice}
            disabled={!lessonVoiceEnabled() || disabled}
            aria-label="Switch to voice"
            title={lessonVoiceEnabled() ? "Talk instead" : "Voice lessons are coming soon"}
            className="grid h-9 w-9 place-items-center rounded-full text-[var(--ls-ink-mid)] transition-colors hover:bg-[var(--ls-primary-soft)] hover:text-[var(--ls-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Mic size={18} />
          </button>
          <span className="flex-1" />
          {text.length >= COUNT_FROM && (
            <span className="text-[11px] tabular-nums text-[var(--ls-ink-faint)]" aria-live="polite">
              {text.length}/{MAX_MESSAGE}
            </span>
          )}
          {replying && !canSend ? (
            // eslint-disable-next-line no-restricted-syntax -- the composer's round primary action.
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop the reply"
              className="grid h-10 w-10 place-items-center rounded-full border border-[var(--ls-border-strong)] bg-white text-[var(--ls-primary)] transition-colors hover:bg-[var(--ls-primary-soft)]"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            // eslint-disable-next-line no-restricted-syntax -- the composer's round primary action.
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send"
              className="grid h-10 w-10 place-items-center rounded-full bg-[var(--ls-primary)] text-white transition-[background,transform] hover:bg-[var(--ls-primary-hover)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SendHorizontal size={18} />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
