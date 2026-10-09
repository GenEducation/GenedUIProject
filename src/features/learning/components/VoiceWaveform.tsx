"use client";

import { useEffect, useRef } from "react";
import { Mic, PhoneOff } from "lucide-react";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import type { VoiceSession } from "../voice/useVoiceSession";

const BARS = 13;

/** Each bar's resting shape: taller towards the mic, like the prototype's fan. */
const ENVELOPE = Array.from({ length: BARS }, (_, i) => 0.35 + 0.65 * Math.sin(((i + 1) / (BARS + 1)) * Math.PI));

interface VoiceWaveformProps {
  session: VoiceSession;
  onEnd: () => void;
}

/**
 * Voice mode's stand-in for the chat input: the live waveform either side of
 * the mic, what the tutor is doing, what it's hearing, and End. The bars move
 * with the microphone while the learner talks and with a steady pulse while
 * the tutor speaks; they are driven by refs on animation frames, not renders.
 */
export function VoiceWaveform({ session, onEnd }: VoiceWaveformProps) {
  const tutorName = useStudentStore((s) => s.studentProfile?.ai_name) || "Your tutor";
  const barsRef = useRef<HTMLDivElement>(null);
  // The animation loop reads the latest level and phase without restarting.
  const live = useRef({ level: 0, phase: session.phase });
  useEffect(() => {
    live.current = { level: session.level, phase: session.phase };
  }, [session.level, session.phase]);

  useEffect(() => {
    const root = barsRef.current;
    if (!root) return;
    const bars = Array.from(root.querySelectorAll<HTMLElement>("[data-bar]"));
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let smooth = 0;
    let frame = 0;
    const draw = (t: number) => {
      const { level, phase } = live.current;
      // The tutor's audio isn't metered here, so its voice shows as a steady pulse.
      const target = phase === "speaking" ? 0.55 : phase === "hearing" ? Math.max(level, 0.15) : phase === "listening" ? level * 0.6 : 0.04;
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
  const offline = session.phase === "offline";
  const tutorTalking = session.phase === "speaking" || session.phase === "thinking";

  const side = (key: string, mirror: boolean) => (
    <div aria-hidden className={`flex h-14 flex-1 items-center gap-[3px] ${mirror ? "flex-row-reverse" : ""}`}>
      {ENVELOPE.map((_, i) => (
        <span
          key={`${key}${i}`}
          data-bar
          className={`h-full w-[3px] origin-center rounded-full transition-colors ${tutorTalking ? "bg-[var(--ls-accent-deep)]" : "bg-[var(--ls-primary)]"}`}
          style={{ transform: "scaleY(0.1)" }}
        />
      ))}
    </div>
  );

  return (
    <div className="border-t border-[var(--ls-border)] p-3">
      <div className="rounded-[20px] border border-[var(--ls-border-strong)] bg-white px-4 py-3">
        {session.heard && !offline && (
          <p className="mb-2 truncate text-center text-[13px] italic text-[var(--ls-ink-mid)]" aria-live="polite">
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
          <div className="flex items-center gap-3">
            <div className="flex w-[92px] shrink-0 items-center gap-2" role="status" aria-live="polite">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  session.phase === "hearing" ? "bg-[var(--ls-accent-deep)] animate-pulse" : session.phase === "reconnecting" || session.phase === "connecting" ? "bg-[#E2A23B]" : "bg-[var(--ls-primary)]"
                }`}
              />
              <span className="text-[12px] font-semibold leading-tight">{label[session.phase]}</span>
            </div>

            <div ref={barsRef} className="flex min-w-0 flex-1 items-center gap-3">
              {side("l", true)}
              <span
                className={`grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--ls-primary)] text-white shadow-[0_8px_20px_-8px_rgb(7_94_99/0.8)] ${
                  session.phase === "hearing" ? "ring-4 ring-[var(--ls-accent)]" : ""
                }`}
              >
                <Mic size={22} aria-hidden />
              </span>
              {side("r", false)}
            </div>

            {/* eslint-disable-next-line no-restricted-syntax -- the voice bar's end-call pill. */}
            <button
              type="button"
              onClick={onEnd}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--ls-border-strong)] px-3.5 py-2 text-[13px] font-semibold text-[#B4232C] transition-colors hover:bg-[#FBE6E7]"
            >
              <PhoneOff size={15} aria-hidden /> End
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
