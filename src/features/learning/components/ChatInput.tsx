"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Check, Mic, SendHorizontal, Square, X } from "lucide-react";
import { useDictation } from "../dictation/useDictation";
import { DictationLanguagePicker } from "../dictation/DictationLanguagePicker";
import { dictationLanguage } from "../dictation/languages";
import { useSpeechLanguage } from "../dictation/useSpeechLanguage";
import { formatDuration } from "../useSessionTimer";
import { MathField, type MathFieldHandle } from "../math/MathField";
import { chatTextFromLatex, latexFromChatText } from "../math/latex";

/** Maths lessons write in the maths field (words, with `/` for notation); other subjects keep a plain box. */
export const isMathsSubject = (subject: string | null | undefined) => !!subject && /math|ganit/i.test(subject);

/** The backend refuses a learner message over 1000 characters. */
export const MAX_MESSAGE = 1000;
const COUNT_FROM = 800;
const WAVE_BARS = 36;

interface ChatInputProps {
  /** A reply is streaming: the send button becomes Stop. */
  replying: boolean;
  /** No active node to talk on (still loading, or the lesson is finished). */
  disabled: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  /** The lesson's subject: a Hindi lesson dictates in Hindi unless the learner has picked otherwise. */
  subject?: string | null;
}

/**
 * The live waveform while dictating: the newest level enters on the right and
 * the trace scrolls left. Bars are set through refs, so a level change never
 * re-renders the composer.
 */
function DictationWave({ level }: { level: number }) {
  const barsRef = useRef<HTMLDivElement>(null);
  const history = useRef<number[]>(Array(WAVE_BARS).fill(0));

  useEffect(() => {
    history.current = [...history.current.slice(1), level];
    const bars = barsRef.current?.children;
    if (!bars) return;
    history.current.forEach((v, i) => {
      (bars[i] as HTMLElement).style.transform = `scaleY(${Math.max(0.12, Math.min(1, v * 1.4))})`;
    });
  }, [level]);

  return (
    <div ref={barsRef} aria-hidden className="flex h-7 min-w-0 flex-1 items-center justify-end gap-[3px] overflow-hidden">
      {Array.from({ length: WAVE_BARS }, (_, i) => (
        <span
          key={i}
          className="h-full w-[3px] shrink-0 origin-center rounded-full bg-[var(--ls-primary)] transition-transform duration-75"
          style={{ transform: "scaleY(0.12)" }}
        />
      ))}
    </div>
  );
}

/**
 * The chat's composer. Enter sends, Shift+Enter adds a line. Sending while the
 * tutor is still replying is allowed: the new turn supersedes the open one.
 *
 * Dictation works like Claude's: the mic starts listening, the words appear in
 * the box as they're recognised, and the bottom row becomes cancel, a live
 * waveform with a timer, and confirm. Confirm keeps the words to edit and
 * send; cancel restores what was there before.
 */
export function ChatInput({ replying, disabled, onSend, onStop, subject = null }: ChatInputProps) {
  const maths = isMathsSubject(subject);
  // Maths lessons: the field holds LaTeX and the message is made from it; elsewhere the box holds the message.
  const [latex, setLatex] = useState("");
  const [plain, setPlain] = useState("");
  const text = maths ? chatTextFromLatex(latex) : plain;
  const setText = (next: string) => (maths ? setLatex(latexFromChatText(next)) : setPlain(next));
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const mathRef = useRef<MathFieldHandle>(null);
  // Shared with voice mode: a pick in either place applies to both.
  const { language, pick: pickLanguage } = useSpeechLanguage(subject);
  const dictation = useDictation(dictationLanguage(language)?.recognition);
  const dictating = dictation.state === "listening";
  const focusBox = () => (maths && !dictating ? mathRef.current?.focus() : areaRef.current?.focus());
  // What was in the box when dictation began; dictated words are added after it.
  const [before, setBefore] = useState("");
  const shown = dictating ? [before.trimEnd(), dictation.transcript].filter(Boolean).join(" ") : text;
  const canSend = !disabled && !dictating && text.trim().length > 0 && text.length <= MAX_MESSAGE;

  // Grow with the text up to ~5 lines, then scroll.
  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${Math.min(area.scrollHeight, 132)}px`;
    if (dictating) area.scrollTop = area.scrollHeight;
  }, [shown, dictating]);

  /** `latexNow`: the maths field's value as Enter was pressed, ahead of any render still to come. */
  const submit = (event?: FormEvent, latexNow?: string) => {
    event?.preventDefault();
    const message = latexNow !== undefined ? chatTextFromLatex(latexNow) : text;
    if (disabled || dictating || !message.trim() || message.length > MAX_MESSAGE) return;
    onSend(message);
    setText("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const startDictation = () => {
    setBefore(text);
    dictation.start();
  };
  const keepDictation = () => {
    const heard = dictation.stop();
    setText([before.trimEnd(), heard].filter(Boolean).join(" ").slice(0, MAX_MESSAGE));
    focusBox();
  };
  const dropDictation = () => {
    dictation.cancel();
    setText(before);
    focusBox();
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
        className={`cursor-text rounded-[22px] border bg-white px-4 pb-2 pt-3 transition-[border-color,box-shadow] focus-within:border-[var(--ls-primary)] focus-within:shadow-[0_0_0_4px_var(--ls-primary-soft)] ${
          dictating ? "border-[var(--ls-primary)] shadow-[0_0_0_4px_var(--ls-primary-soft)]" : "border-[var(--ls-border-strong)]"
        }`}
      >
        <label htmlFor="lesson-message" className="sr-only">
          Message your tutor
        </label>
        {maths && !dictating ? (
          // While dictating, the plain box below shows the words as they're heard; then they join the field.
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
          value={shown}
          maxLength={MAX_MESSAGE}
          disabled={disabled}
          readOnly={dictating}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={disabled ? "The lesson is getting ready…" : dictating ? "Listening…" : "Type a message…"}
          className="block w-full resize-none bg-transparent text-[15px] leading-relaxed text-[var(--ls-ink)] outline-none placeholder:text-[var(--ls-ink-faint)] disabled:cursor-not-allowed"
        />
        )}

        {dictating ? (
          <div className="mt-1.5 flex items-center gap-3" role="group" aria-label="Dictation">
            {/* eslint-disable-next-line no-restricted-syntax -- the dictation bar's round cancel. */}
            <button
              type="button"
              onClick={dropDictation}
              aria-label="Cancel dictation"
              className={`${round} border border-[var(--ls-border-strong)] bg-white text-[var(--ls-ink-mid)] hover:text-[var(--ls-ink)]`}
            >
              <X size={18} />
            </button>
            <DictationLanguagePicker value={language} onChange={pickLanguage} />
            <DictationWave level={dictation.level} />
            <span className="shrink-0 text-[13px] tabular-nums text-[var(--ls-ink-mid)]">{formatDuration(dictation.seconds)}</span>
            {/* eslint-disable-next-line no-restricted-syntax -- the dictation bar's round confirm. */}
            <button
              type="button"
              onClick={keepDictation}
              aria-label="Done dictating"
              className={`${round} bg-[var(--ls-primary)] text-white hover:bg-[var(--ls-primary-hover)]`}
            >
              <Check size={18} strokeWidth={2.6} />
            </button>
          </div>
        ) : (
          <div className="mt-1.5 flex items-center gap-2">
            {dictation.supported && (
              // eslint-disable-next-line no-restricted-syntax -- a round icon tool in the composer.
              <button
                type="button"
                onClick={startDictation}
                disabled={disabled}
                aria-label="Dictate"
                title="Dictate"
                className="grid h-9 w-9 place-items-center rounded-full text-[var(--ls-ink-mid)] transition-colors hover:bg-[var(--ls-primary-soft)] hover:text-[var(--ls-primary)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Mic size={18} />
              </button>
            )}
            {dictation.supported && (
              <DictationLanguagePicker value={language} onChange={pickLanguage} disabled={disabled} />
            )}
            {dictation.error && (
              <span role="alert" className="min-w-0 truncate text-[12px] text-[#9A2E1E]">
                {dictation.error}
              </span>
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
        )}
      </div>
    </form>
  );
}
