"use client";

import { Mic, MicOff, PhoneOff } from "lucide-react";
import { useStudentStore } from "../store/useStudentStore";

interface VoiceControlsProps {
  onEnd: () => void;
}

export function VoiceControls({ onEnd }: VoiceControlsProps) {
  const { isMuted, toggleMute, voiceSessionStatus, beginPttUtterance, endPttUtterance, pttHeld } = useStudentStore();
  const sessionActive = voiceSessionStatus === "active";
  const showPtt = sessionActive && isMuted;

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
      {/* Mute toggle — compact circle, left */}
      <button
        onClick={toggleMute}
        disabled={!sessionActive}
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-40 flex-shrink-0"
        style={{
          background: isMuted ? "#E8635A" : "white",
          color: isMuted ? "white" : "var(--tutor)",
          border: `1px solid ${isMuted ? "#E8635A" : "#E2E8F0"}`,
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        }}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
      </button>

      {/* Push to Talk — center, dominant, only when muted */}
      {showPtt && (
        <button
          type="button"
          // Pointer events rather than mouse+touch: one code path for mouse, touch and
          // pen, and -- the reason this matters -- onPointerCancel and onLostPointerCapture
          // fire for the cases a mouseup never arrives at all (the browser taking over the
          // gesture as a scroll, a phone call interrupting, the element being unmounted
          // mid-press). Without them the button stays visually held and the turn stays
          // open server-side until the utterance cap eventually closes it.
          onPointerDown={(e) => {
            // Capture keeps the release bound to this element even if the finger slides
            // off it, which is the common case on a phone -- a child holding a button
            // does not hold still.
            e.currentTarget.setPointerCapture?.(e.pointerId);
            beginPttUtterance();
          }}
          onPointerUp={endPttUtterance}
          onPointerCancel={endPttUtterance}
          onLostPointerCapture={endPttUtterance}
          // Focus loss ends the turn too: alt-tabbing away mid-press must not leave the
          // microphone open.
          onBlur={endPttUtterance}
          // Keyboard activation. A button that can only be operated by holding a pointer
          // is unusable with a keyboard or a switch device, and the default click
          // handling would fire begin and end together with nothing in between.
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat) {
              e.preventDefault();
              beginPttUtterance();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              endPttUtterance();
            }
          }}
          onContextMenu={(e) => e.preventDefault()} // long-press menu would strand the hold
          aria-pressed={pttHeld}
          aria-label={pttHeld ? "Recording — release to send" : "Hold to talk"}
          className="flex items-center gap-2 px-4 sm:px-7 h-11 sm:h-12 rounded-full font-bold text-[12px] sm:text-[13px] select-none transition-all whitespace-nowrap flex-shrink-0 touch-none"
          style={{
            background: pttHeld
              ? "linear-gradient(135deg, #34C759, #30d158)"
              : "linear-gradient(135deg, #059F6D, #048A5D)",
            color: "white",
            boxShadow: pttHeld
              ? "0 6px 20px rgba(52,199,89,0.45)"
              : "0 6px 20px rgba(5,159,109,0.35)",
            transform: pttHeld ? "scale(0.97)" : "scale(1)",
          }}
        >
          <Mic size={16} aria-hidden="true" />
          {pttHeld ? "Speaking…" : "Hold to Talk"}
          {/* The visual state is colour and scale, neither of which a screen reader
              conveys; aria-pressed covers the toggle but not the transition. */}
          <span className="sr-only" role="status" aria-live="polite">
            {pttHeld ? "Recording" : "Not recording"}
          </span>
        </button>
      )}

      {/* Spacer between PTT and End to prevent accidental taps */}
      {showPtt && <div className="w-2" />}

      {/* End — destructive, right */}
      <button
        onClick={onEnd}
        className="flex items-center gap-2 px-4 sm:px-5 h-11 sm:h-12 rounded-full bg-red-500 text-white font-bold text-[12px] sm:text-[13px] hover:bg-red-600 transition-all shadow-lg flex-shrink-0"
      >
        <PhoneOff size={18} />
        End
      </button>
    </div>
  );
}
