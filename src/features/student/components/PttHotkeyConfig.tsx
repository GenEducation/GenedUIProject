"use client";

import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { useStudentStore } from "../store/useStudentStore";

/** A `KeyboardEvent.code` as a learner reads it on the key: "KeyK" → "K", "Space" → "Space". */
export function formatKey(code: string): string {
  if (!code) return "—";
  if (code === "Space") return "Space";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Arrow")) return code.replace("Arrow", "") + " arrow";
  return code;
}

interface PttHotkeyConfigProps {
  compact?: boolean;
  /** A sentence instead of a control row: "Hold [Space] to talk", the key itself the button that changes it. */
  inline?: boolean;
}

export function PttHotkeyConfig({ compact = false, inline = false }: PttHotkeyConfigProps) {
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

  if (inline) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
        {capturing ? null : "Hold"}
        {/* eslint-disable-next-line no-restricted-syntax -- the keycap itself, set inside a sentence. */}
        <button
          type="button"
          onClick={() => setCapturing((v) => !v)}
          aria-label={capturing ? "Cancel changing the hold-to-talk key" : `Hold-to-talk key: ${label}. Change it`}
          title={capturing ? "Cancel" : "Change key"}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-bold text-[var(--primary-ink)] shadow-[0_1px_0_#E3E8E2] transition-colors hover:border-[var(--primary)] ${
            capturing ? "border-[var(--primary)] bg-[var(--primary-soft,#E6F0EF)]" : "border-[#E3E8E2] bg-white"
          }`}
        >
          <kbd className="font-[inherit]">{label}</kbd>
          {!capturing && <Settings2 size={11} className="text-[#7F9295]" aria-hidden />}
        </button>
        {capturing ? null : "to talk"}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? "text-[11px]" : "text-[13px]"}`}>
      <span className="text-[#7F9295] font-bold uppercase tracking-wider text-[10px]">
        Hotkey
      </span>
      <kbd
        className="px-2.5 py-1 rounded-md bg-white border border-[#E3E8E2] text-[var(--primary-ink)] font-bold shadow-sm"
        style={{ minWidth: 56, maxWidth: capturing ? "80vw" : undefined, textAlign: "center", fontSize: compact ? 11 : 12 }}
      >
        {label}
      </kbd>
      <button aria-label="Configure push-to-talk hotkey"
        onClick={() => setCapturing((v) => !v)}
        className="w-7 h-7 rounded-md flex items-center justify-center text-[#7F9295] hover:text-[var(--tutor)] hover:bg-[var(--tutor)]/8 transition-all"
        title={capturing ? "Cancel" : "Change hotkey"}
      >
        <Settings2 size={14} />
      </button>
    </div>
  );
}
