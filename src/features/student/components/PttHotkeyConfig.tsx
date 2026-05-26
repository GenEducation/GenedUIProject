"use client";

import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { useStudentStore } from "../store/useStudentStore";

function formatKey(code: string): string {
  if (!code) return "—";
  if (code === "Space") return "Space";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Arrow")) return code.replace("Arrow", "") + " arrow";
  return code;
}

interface PttHotkeyConfigProps {
  compact?: boolean;
}

export function PttHotkeyConfig({ compact = false }: PttHotkeyConfigProps) {
  const { voicePrefs, setPttHotkey } = useStudentStore();
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setCapturing(false);
        return;
      }
      if (!e.code) return;
      setPttHotkey(e.code);
      setCapturing(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [capturing, setPttHotkey]);

  const label = capturing ? "Press any key… (Esc to cancel)" : formatKey(voicePrefs.pttHotkey);

  return (
    <div className={`flex items-center gap-2 ${compact ? "text-[11px]" : "text-[13px]"}`}>
      <span className="text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">
        Hotkey
      </span>
      <kbd
        className="px-2.5 py-1 rounded-md bg-white border border-[#E2E8F0] text-[#042E5C] font-bold shadow-sm"
        style={{ minWidth: capturing ? 200 : 56, textAlign: "center", fontSize: compact ? 11 : 12 }}
      >
        {label}
      </kbd>
      <button
        onClick={() => setCapturing((v) => !v)}
        className="w-7 h-7 rounded-md flex items-center justify-center text-[#94A3B8] hover:text-[#5B4DC7] hover:bg-[#5B4DC7]/8 transition-all"
        title={capturing ? "Cancel" : "Change hotkey"}
      >
        <Settings2 size={14} />
      </button>
    </div>
  );
}
