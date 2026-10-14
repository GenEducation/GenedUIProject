"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Hand, Mic, MicOff, PhoneOff } from "lucide-react";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { Select } from "@/components/ui/Select";
import { languageLabel, voiceLanguageEnabled, type VoiceLanguage } from "../voice/languages";
import type { VoiceSession } from "../voice/useVoiceSession";

const BARS = 13;
/** A press shorter than this is a tap (it starts talking until the next tap); longer is a hold (it sends on release). */
const TAP_MS = 350;

/** Each bar's resting shape: taller towards the mic, like the prototype's fan. */
const ENVELOPE = Array.from({ length: BARS }, (_, i) => 0.35 + 0.65 * Math.sin(((i + 1) / (BARS + 1)) * Math.PI));

interface VoiceWaveformProps {
  session: VoiceSession;
  onEnd: () => void;
  /** What the server offers, and the choice among it; changing it ends the session and opens a new one. */
  languages?: VoiceLanguage[];
  onLanguage?: (tag: string) => void;
}

/**
 * Voice mode's stand-in for the chat input: the live waveform either side of
 * the mic, what the tutor is doing, what it's hearing, and End. The bars move
 * with the microphone while the learner talks and with a steady pulse while
 * the tutor speaks; they are driven by refs on animation frames, not renders.
 */
export function VoiceWaveform({ session, onEnd, languages = [], onLanguage }: VoiceWaveformProps) {
  const tutorName = useStudentStore((s) => s.studentProfile?.ai_name) || "Your tutor";
  const barsRef = useRef<HTMLDivElement>(null);
  // The animation loop reads the latest level and phase without restarting.
  const live = useRef({ level: 0, phase: session.phase, muted: session.muted });
  useEffect(() => {
    live.current = { level: session.level, phase: session.phase, muted: session.muted };
  }, [session.level, session.phase, session.muted]);

  useEffect(() => {
    const root = barsRef.current;
    if (!root) return;
    const bars = Array.from(root.querySelectorAll<HTMLElement>("[data-bar]"));
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let smooth = 0;
    let frame = 0;
    const draw = (t: number) => {
      const { level, phase, muted: isMuted } = live.current;
      // The tutor's audio isn't metered here, so its voice shows as a steady pulse.
      const target = isMuted ? 0.04 : phase === "speaking" ? 0.55 : phase === "hearing" ? Math.max(level, 0.15) : phase === "listening" ? level * 0.6 : 0.04;
      smooth += (target - smooth) * 0.18;
      bars.forEach((bar, i) => {
        const wobble = still ? 1 : 0.6 + 0.4 * Math.sin(t / 140 + i * 1.7) * Math.sin(t / 310 + i);
        const h = 0.12 + ENVELOPE[i % BARS] * smooth * wobble;
        bar.style.transform = `scaleY(${Math.min(1, Math.max(0.08, h))})`;
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  const label: Record<VoiceSession["phase"], string> = {
    connecting: "Connecting…",
    listening: "Listening…",
    hearing: "Hearing you",
    thinking: `${tutorName} is thinking…`,
    speaking: `${tutorName} is speaking`,
    reconnecting: "Reconnecting…",
    offline: "Voice is off",
  };
  const tutorTalking = session.phase === "speaking" || session.phase === "thinking";
  const muted = session.muted;
  const offline = session.phase === "offline";

  // The language is the session's own: shown while it is connected, and the one thing the learner can change (which restarts it).
  const pushToTalk = session.pushToTalk && !offline;
  const tutorSpeaking = session.phase === "speaking";
  const holdDisabled = muted || tutorSpeaking || !session.press || ["connecting", "reconnecting"].includes(session.phase);
  // Tap or hold: a quick tap starts talking and the next tap sends; a press held longer than a tap sends on release.
  const { press, release } = session;
  const hold = useRef<{ downAt: number; latched: boolean }>({ downAt: 0, latched: false });
  const [latched, setLatched] = useState(false);
  // Read, never depended on: a handler recreated when `held` changes would rerun the key effect, whose cleanup releases the press.
  const heldNow = useRef(session.held);
  useEffect(() => {
    heldNow.current = session.held;
  }, [session.held]);
  const down = useCallback(() => {
    if (hold.current.latched && !heldNow.current) {        // the session let go (muted, the tutor began, a reconnect)
      hold.current.latched = false;
      setLatched(false);
    }
    if (hold.current.latched) {
      hold.current = { downAt: 0, latched: false };
      setLatched(false);
      release?.();
      return;
    }
    hold.current.downAt = performance.now();
    press?.();
  }, [press, release]);
  const up = useCallback(() => {
    const { downAt, latched: on } = hold.current;
    if (on || !downAt) return;                              // the tap that sent, or nothing pressed
    hold.current.downAt = 0;
    if (performance.now() - downAt < TAP_MS) {
      hold.current.latched = true;                          // a tap: keep listening until the next tap
      setLatched(true);
    } else {
      setLatched(false);
      release?.();                                          // a hold: release sends
    }
  }, [release]);
  const cancel = useCallback(() => {
    hold.current = { downAt: 0, latched: false };
    setLatched(false);
    release?.();
  }, [release]);
  const holdLabel = session.held
    ? latched ? "Listening… tap to send" : "Listening… release to send"   // `latched` only shows while the session holds
    : muted ? "Unmute to speak" : tutorSpeaking ? "Wait for the tutor to finish" : "Tap or hold to speak";

  // Space works the same way when focus is not somewhere Space means something else (a text field, another control).
  useEffect(() => {
    if (!pushToTalk) return;
    // Space is the learner's to type with in a field, and opens a menu on a picker; on anything else (a button focused by the last
    // click included) it is push to talk, and the focused button is not also clicked.
    const typing = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.getAttribute("aria-haspopup") !== null);
    };
    const keyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || typing(e.target)) return;
      e.preventDefault();
      if (!e.repeat) down();
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space" || typing(e.target)) return;
      e.preventDefault();
      up();
    };
    const off = () => cancel();
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", off);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", off);
      cancel();
    };
  }, [pushToTalk, down, up, cancel]);

  const picker = (languages.length > 0 && onLanguage) || session.setPushToTalk ? (
    <div className="mb-2 flex items-center justify-between gap-2">
      {session.setPushToTalk ? (
        // eslint-disable-next-line no-restricted-syntax -- a small switch-style toggle in the voice bar.
        <button
          type="button"
          aria-pressed={session.pushToTalk}
          aria-label="Push to talk"
          onClick={(e) => {
            const on = !session.pushToTalk;
            if (on && muted) session.setMuted?.(false);   // push to talk has no mute: nothing is heard unless pressed
            session.setPushToTalk?.(on);
            e.currentTarget.blur();                        // Space now belongs to push to talk, not to this toggle
          }}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors ${
            session.pushToTalk
              ? "border-[var(--ls-primary)] bg-[var(--ls-primary)] text-white"
              : "border-[var(--ls-border-strong)] bg-white text-[var(--ls-ink-mid)]"
          }`}
        >
          <Hand size={13} aria-hidden /> Push to talk
        </button>
      ) : (
        <span />
      )}
      {languages.length > 0 && onLanguage && <Select
        size="sm"
        variant="inline"
        aria-label="Voice language"
        value={session.language ?? ""}
        onChange={onLanguage}
        options={languages.map((l) => ({
          value: l.language,
          label: languageLabel(l.language),
          disabled: !voiceLanguageEnabled(l),
          hint: voiceLanguageEnabled(l) ? undefined : (l.reason ?? "Not available yet"),
        }))}
      />}
    </div>
  ) : null;

  const side = (key: string, mirror: boolean) => (
    // Each side takes what room is left and clips its outer bars, so it can never push into the status or End.
    <div
      aria-hidden
      className={`flex h-12 min-w-0 flex-1 items-center gap-[3px] overflow-hidden ${mirror ? "flex-row-reverse" : ""}`}
    >
      {ENVELOPE.map((_, i) => (
        <span
          key={`${key}${i}`}
          data-bar
          className={`h-full w-[3px] shrink-0 origin-center rounded-full transition-colors ${
            muted ? "bg-[var(--ls-border-strong)]" : tutorTalking ? "bg-[var(--ls-accent-deep)]" : "bg-[var(--ls-primary)]"
          }`}
          style={{ transform: "scaleY(0.1)" }}
        />
      ))}
    </div>
  );

  return (
    <div className="border-t border-[var(--ls-border)] p-3">
      <div className="rounded-[20px] border border-[var(--ls-border-strong)] bg-white px-4 py-3">
        {picker}
        {session.heard && !offline && (
          <p lang={session.language ?? undefined} className="font-indic mb-2 truncate text-center text-[13px] italic text-[var(--ls-ink-mid)]" aria-live="polite">
            “{session.heard}”
          </p>
        )}
        {offline ? (
          <div role="alert" className="flex flex-col items-center gap-2 py-2 text-center">
            <p className="text-[14px] text-[var(--ls-ink)]">{session.error}</p>
            {/* eslint-disable-next-line no-restricted-syntax -- a quiet text action in the voice bar. */}
            <button type="button" onClick={onEnd} className="text-[14px] font-semibold text-[var(--ls-primary)] hover:underline">
              Back to typing
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="flex w-[84px] shrink-0 items-center gap-2" role="status" aria-live="polite">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  session.phase === "hearing" ? "bg-[var(--ls-accent-deep)] animate-pulse" : session.phase === "reconnecting" || session.phase === "connecting" ? "bg-[#E2A23B]" : "bg-[var(--ls-primary)]"
                }`}
              />
              <span className="text-[12px] font-semibold leading-tight">{muted ? "Muted" : label[session.phase]}</span>
            </div>

            <div ref={barsRef} className="flex min-w-0 flex-1 items-center gap-2">
              {side("l", true)}
              {/* Push to talk has one control, the button below: the round mute toggle would be a second microphone to press. */}
              {!pushToTalk && (
              // eslint-disable-next-line no-restricted-syntax -- the voice bar's round mute toggle.
              <button
                type="button"
                onClick={() => session.setMuted?.(!muted)}
                disabled={!session.setMuted}
                aria-pressed={muted}
                aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-full transition-[background,box-shadow] disabled:cursor-not-allowed ${
                  muted
                    ? "border-2 border-[var(--ls-border-strong)] bg-white text-[#B4232C]"
                    : `bg-[var(--ls-primary)] text-white shadow-[0_8px_20px_-8px_rgb(7_94_99/0.8)] ${
                        session.phase === "hearing" ? "ring-4 ring-[var(--ls-accent)]" : ""
                      }`
                }`}
              >
                {muted ? <MicOff size={20} aria-hidden /> : <Mic size={20} aria-hidden />}
              </button>
              )}
              {side("r", false)}
            </div>

            {/* eslint-disable-next-line no-restricted-syntax -- the voice bar's end-call pill. */}
            <button
              type="button"
              onClick={onEnd}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--ls-border-strong)] bg-white px-3 py-2 text-[13px] font-semibold text-[#B4232C] transition-colors hover:bg-[#FBE6E7]"
            >
              <PhoneOff size={15} aria-hidden /> End
            </button>
          </div>
        )}
        {pushToTalk && (
          // eslint-disable-next-line no-restricted-syntax -- the large press-and-hold button of push to talk.
          <button
            id="voice-hold"
            type="button"
            disabled={holdDisabled}
            aria-pressed={session.held}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture?.(e.pointerId);
              down();
            }}
            onPointerUp={up}
            onPointerCancel={cancel}
            onBlur={cancel}
            onContextMenu={(e) => e.preventDefault()}
            className={`mt-3 flex h-14 w-full touch-none select-none items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              session.held ? "bg-[var(--ls-accent-deep)] text-white ring-4 ring-[var(--ls-accent)]" : "bg-[var(--ls-primary)] text-white"
            }`}
          >
            <Mic size={18} aria-hidden /> {holdLabel}
          </button>
        )}
      </div>
    </div>
  );
}
