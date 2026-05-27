"use client";

import { Mic, MicOff, PhoneOff } from "lucide-react";
import { useStudentStore } from "../store/useStudentStore";

interface VoiceControlsProps {
  onEnd: () => void;
}

export function VoiceControls({ onEnd }: VoiceControlsProps) {
  const { isMuted, toggleMute, voiceSessionStatus } = useStudentStore();
  const sessionActive = voiceSessionStatus === "active";

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={toggleMute}
        disabled={!sessionActive}
        className="w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
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

      <button
        onClick={onEnd}
        className="flex items-center gap-2 px-5 h-12 rounded-full bg-red-500 text-white font-bold text-[13px] hover:bg-red-600 transition-all shadow-lg"
      >
        <PhoneOff size={18} />
        End
      </button>
    </div>
  );
}
