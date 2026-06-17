"use client";

import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { useStudentStore } from "../store/useStudentStore";

export function PushToTalkButton() {
  const { pttHeld, beginPttUtterance, endPttUtterance, voiceSessionStatus, isAITyping, studentProfile } =
    useStudentStore();
  const aiName = studentProfile?.ai_name || "Nia";
  const disabled = voiceSessionStatus !== "active";

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <motion.button
        onPointerDown={(e) => {
          if (disabled) return;
          e.preventDefault();
          (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
          beginPttUtterance();
        }}
        onPointerUp={(e) => {
          if ((e.currentTarget as HTMLButtonElement).hasPointerCapture(e.pointerId)) {
            (e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId);
          }
          endPttUtterance();
        }}
        onPointerCancel={() => endPttUtterance()}
        onPointerLeave={() => {
          if (pttHeld) endPttUtterance();
        }}
        whileTap={{ scale: 0.94 }}
        animate={pttHeld ? { scale: 1.04 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        disabled={disabled}
        className="relative rounded-full flex items-center justify-center transition-shadow"
        style={{
          width: "clamp(96px, 28vw, 132px)",
          height: "clamp(96px, 28vw, 132px)",
          background: pttHeld
            ? "linear-gradient(135deg, #5B4DC7, #4A90D9)"
            : disabled
              ? "rgba(91,77,199,0.18)"
              : "linear-gradient(135deg, #6D5FD3, #5B4DC7)",
          color: "white",
          boxShadow: pttHeld
            ? "0 0 0 12px rgba(91,77,199,0.18), 0 18px 50px rgba(91,77,199,0.45)"
            : disabled
              ? "none"
              : "0 10px 30px rgba(91,77,199,0.35)",
          cursor: disabled ? "not-allowed" : pttHeld ? "grabbing" : "pointer",
          opacity: disabled ? 0.6 : 1,
          border: "none",
        }}
      >
        <Mic size={44} />
        {pttHeld && (
          <motion.span
            className="absolute inset-0 rounded-full border-4"
            style={{ borderColor: "rgba(255,255,255,0.6)" }}
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.35, opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </motion.button>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#5B4DC7]/80 mt-1">
        {disabled
          ? voiceSessionStatus === "connecting"
            ? "Connecting…"
            : "Voice offline"
          : pttHeld
            ? "Listening…"
            : isAITyping
              ? `${aiName} is speaking`
              : "Hold to talk"}
      </p>
    </div>
  );
}
