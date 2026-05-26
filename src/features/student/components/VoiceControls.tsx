"use client";

import { Mic, MicOff, PhoneOff } from "lucide-react";
import { useStudentStore } from "../store/useStudentStore";

interface VoiceControlsProps {
  onEnd: () => void;
}

export function VoiceControls({ onEnd }: VoiceControlsProps) {
  const { voicePrefs, setListenMode, isMuted, toggleMute, voiceSessionStatus } =
    useStudentStore();
  const isContinuous = voicePrefs.listenMode === "continuous";
  const sessionActive = voiceSessionStatus === "active";

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Mode toggle */}
      <div className="inline-flex p-1 rounded-full bg-white border border-[#E2E8F0] shadow-sm">
        <button
          onClick={() => setListenMode("continuous")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all ${
            isContinuous ? "bg-[#5B4DC7] text-white shadow" : "text-[#94A3B8] hover:text-[#042E5C]"
          }`}
        >
          <Mic size={13} />
          Continuous
        </button>
        <button
          onClick={() => setListenMode("ptt")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all ${
            !isContinuous ? "bg-[#5B4DC7] text-white shadow" : "text-[#94A3B8] hover:text-[#042E5C]"
          }`}
        >
          <MicOff size={13} />
          Push&nbsp;to&nbsp;talk
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-4">
        {isContinuous && (
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
        )}
        <button
          onClick={onEnd}
          className="flex items-center gap-2 px-5 h-12 rounded-full bg-red-500 text-white font-bold text-[13px] hover:bg-red-600 transition-all shadow-lg"
        >
          <PhoneOff size={18} />
          End
        </button>
      </div>
    </div>
  );
}
