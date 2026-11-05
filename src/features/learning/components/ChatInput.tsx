"use client";

import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Mic, SendHorizontal, Square } from "lucide-react";
import { MathField, type MathFieldHandle } from "../math/MathField";
import { chatTextFromLatex, latexFromChatText } from "../math/latex";

/** Maths lessons write in the maths field (words, with `/` for notation); other subjects keep a plain box. */
export const isMathsSubject = (subject: string | null | undefined) => !!subject && /math|ganit/i.test(subject);

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
  /** The lesson's subject: a maths lesson writes in the maths field. */
  subject?: string | null;
  /** The mic: switch the lesson to voice mode. No mic without it. */
  onVoice?: () => void;
}

/**
 * The chat's composer. Enter sends, Shift+Enter adds a line. Sending while the
 * tutor is still replying is allowed: the new turn supersedes the open one.
 *
 * The mic opens voice mode: the lesson goes on by talking, and the composer
 * comes back when the learner ends it.
 */
export function ChatInput({ replying, disabled, onSend, onStop, subject = null, onVoice }: ChatInputProps) {
  const maths = isMathsSubject(subject);
  // Maths lessons: the field holds LaTeX and the message is made from it; elsewhere the box holds the message.
  const [latex, setLatex] = useState("");
  const [plain, setPlain] = useState("");
  const text = maths ? chatTextFromLatex(latex) : plain;
  const setText = (next: string) => (maths ? setLatex(latexFromChatText(next)) : setPlain(next));
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const mathRef = useRef<MathFieldHandle>(null);
  const focusBox = () => (maths ? mathRef.current?.focus() : areaRef.current?.focus());
  const canSend = !disabled && text.trim().length > 0 && text.length <= MAX_MESSAGE;

  // Grow with the text up to ~5 lines, then scroll.
  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${Math.min(area.scrollHeight, 132)}px`;
  }, [text]);

  /** `latexNow`: the maths field's value as Enter was pressed, ahead of any render still to come. */
  const submit = (event?: FormEvent, latexNow?: string) => {
    event?.preventDefault();
    const message = latexNow !== undefined ? chatTextFromLatex(latexNow) : text;
    if (disabled || !message.trim() || message.length > MAX_MESSAGE) return;
    onSend(message);
    setText("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const round = "grid h-10 w-10 shrink-0 place-items-center rounded-full transition-[background,transform] active:scale-95";

  return (
    <form onSubmit={submit} className="border-t border-[var(--ls-border)] p-3">
      {/* A click on the box's own padding types into it, as on the text itself. */}
      <div
        onMouseDown={(e) => {
          if (e.target !== e.currentTarget || disabled) return;
          e.preventDefault();
          focusBox();
        }}
        className={`cursor-text rounded-[22px] border bg-white px-4 pb-2 pt-3 transition-[border-color,box-shadow] focus-within:border-[var(--ls-primary)] focus-within:shadow-[0_0_0_4px_var(--ls-primary-soft)] border-[var(--ls-border-strong)]`}
      >
        <label htmlFor="lesson-message" className="sr-only">
          Message your tutor
        </label>
        {maths ? (
          <MathField
            ref={mathRef}
            value={latex}
            onChange={setLatex}
            onEnter={(now) => submit(undefined, now)}
            disabled={disabled}
            ariaLabel="Message your tutor"
            placeholder={disabled ? "The lesson is getting ready…" : "Type a message… ( / for maths )"}
            className="max-h-[132px] overflow-y-auto overflow-x-hidden text-[15px] leading-relaxed text-[var(--ls-ink)]"
          />
        ) : (
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
          className="block w-full resize-none bg-transparent text-[15px] leading-relaxed text-[var(--ls-ink)] outline-none placeholder:text-[var(--ls-ink-faint)] disabled:cursor-not-allowed"
        />
        )}

        <div className="mt-1.5 flex items-center gap-2">
            {onVoice && (
              // eslint-disable-next-line no-restricted-syntax -- a round icon tool in the composer.
              <button
                type="button"
                onClick={onVoice}
                disabled={disabled}
                aria-label="Talk to your tutor"
                title="Talk to your tutor"
                className="grid h-9 w-9 place-items-center rounded-full text-[var(--ls-ink-mid)] transition-colors hover:bg-[var(--ls-primary-soft)] hover:text-[var(--ls-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ls-primary)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Mic size={18} />
              </button>
            )}
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
                className={`${round} border border-[var(--ls-border-strong)] bg-white text-[var(--ls-primary)] hover:bg-[var(--ls-primary-soft)]`}
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              // eslint-disable-next-line no-restricted-syntax -- the composer's round primary action.
              <button
                type="submit"
                disabled={!canSend}
                aria-label="Send"
                className={`${round} bg-[var(--ls-primary)] text-white hover:bg-[var(--ls-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <SendHorizontal size={18} />
              </button>
            )}
          </div>
      </div>
    </form>
  );
}
