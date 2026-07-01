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
          color: isMuted ? "white" : "#5B4DC7",
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
          onMouseDown={beginPttUtterance}
          onMouseUp={endPttUtterance}
          onMouseLeave={endPttUtterance}
          onTouchStart={(e) => { e.preventDefault(); beginPttUtterance(); }}
          onTouchEnd={(e) => { e.preventDefault(); endPttUtterance(); }}
          className="flex items-center gap-2 px-4 sm:px-7 h-11 sm:h-12 rounded-full font-bold text-[12px] sm:text-[13px] select-none transition-all whitespace-nowrap flex-shrink-0"
          style={{
            background: pttHeld
              ? "linear-gradient(135deg, #34C759, #30d158)"
              : "linear-gradient(135deg, #5B4DC7, #4A90D9)",
            color: "white",
            boxShadow: pttHeld
              ? "0 6px 20px rgba(52,199,89,0.45)"
              : "0 6px 20px rgba(91,77,199,0.35)",
            transform: pttHeld ? "scale(0.97)" : "scale(1)",
          }}
        >
          <Mic size={16} />
          {pttHeld ? "Speaking…" : "Hold to Talk"}
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
