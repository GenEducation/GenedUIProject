"use client";

import { motion } from "framer-motion";
import { useStudentStore } from "../store/useStudentStore";

interface VoiceStageProps {
  caption: string;
  reactive: boolean; // true while mic is hot
  onTap?: () => void;        // called on click (idle → start session)
  onPressStart?: () => void; // called on press down (muted → PTT start)
  onPressEnd?: () => void;   // called on press up   (muted → PTT end)
}

export function VoiceStage({ caption, reactive, onTap, onPressStart, onPressEnd }: VoiceStageProps) {
  const { voiceSessionStatus, isAITyping, isMuted, pttHeld } = useStudentStore();
  const isSpeaking = isAITyping;
  const phase = isSpeaking ? "speaking" : reactive ? "listening" : "idle";

  const pulseDuration =
    phase === "speaking" ? 0.9 : phase === "listening" ? 1.4 : 3.0;
  const pulseScale =
    phase === "speaking" ? [1, 1.08, 1] : phase === "listening" ? [1, 1.05, 1] : [1, 1.02, 1];

  const isPtt = !!onPressStart;
  const isTappable = !!onTap || isPtt;

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <motion.div
        className={`relative select-none ${isTappable ? "cursor-pointer" : ""}`}
        onClick={onTap}
        onMouseDown={onPressStart}
        onMouseUp={onPressEnd}
        onMouseLeave={onPressEnd}
        onTouchStart={(e) => {
          // Only hijack the touch for press-and-hold (PTT). For a plain tap
          // (idle → start), let the normal click fire instead — calling
          // preventDefault here would suppress the synthetic click on mobile.
          if (onPressStart) {
            e.preventDefault();
            onPressStart();
          }
        }}
        onTouchEnd={(e) => {
          if (onPressEnd) {
            e.preventDefault();
            onPressEnd();
          } else if (onTap) {
            // Fire tap-to-start directly so it doesn't rely on the synthetic
            // click, which some mobile/tablet browsers drop after a touch.
            e.preventDefault();
            onTap();
          }
        }}
        animate={{ scale: pulseScale }}
        transition={{ duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }}
        style={{ width: "min(clamp(128px, 22vh, 220px), 60vw)", height: "min(clamp(128px, 22vh, 220px), 60vw)" }}
      >
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: pttHeld
              ? "radial-gradient(circle at 30% 30%, rgba(52,199,89,0.35), rgba(52,199,89,0.12) 60%, transparent 75%)"
              : isMuted && voiceSessionStatus === "active"
                ? "radial-gradient(circle at 30% 30%, rgba(232,99,90,0.25), rgba(232,99,90,0.08) 60%, transparent 75%)"
                : "radial-gradient(circle at 30% 30%, rgba(91,77,199,0.35), rgba(74,144,217,0.15) 60%, transparent 75%)",
            filter: "blur(20px)",
          }}
          animate={{ opacity: pttHeld ? [0.7, 1, 0.7] : phase === "idle" ? [0.4, 0.6, 0.4] : [0.6, 1, 0.6] }}
          transition={{ duration: pttHeld ? 0.8 : pulseDuration * 1.3, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Orb */}
        <motion.div
          className="absolute inset-4 rounded-full overflow-hidden"
          animate={{ scale: pttHeld ? 1.06 : 1 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{
            background: pttHeld
              ? "conic-gradient(from 220deg at 50% 50%, #34C759, #30d158, #4cd964, #34C759)"
              : isMuted && voiceSessionStatus === "active"
                ? "conic-gradient(from 220deg at 50% 50%, #E8635A, #c0392b, #e57373, #E8635A)"
                : "conic-gradient(from 220deg at 50% 50%, #5B4DC7, #4A90D9, #8B7FE8, #5B4DC7)",
            boxShadow: pttHeld
              ? "inset -20px -30px 60px rgba(0,0,0,0.25), inset 12px 16px 40px rgba(255,255,255,0.25), 0 12px 48px rgba(52,199,89,0.5)"
              : "inset -20px -30px 60px rgba(0,0,0,0.25), inset 12px 16px 40px rgba(255,255,255,0.25), 0 12px 40px rgba(91,77,199,0.35)",
          }}
        >
          {/* Animated overlay sheen */}
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.45), transparent 55%)",
            }}
            animate={{ rotate: [0, 360] }}
            transition={{
              duration: phase === "speaking" ? 8 : 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </motion.div>
      </motion.div>

      {/* Caption / start button */}
      <div className={`text-center flex flex-col items-center gap-1 px-4 ${caption ? "mt-5 min-h-[24px]" : "mt-0 min-h-0"}`}>
        {voiceSessionStatus === "idle" && onTap ? (
          <button
            onClick={onTap}
            className="text-[13px] font-bold tracking-[0.12em] uppercase"
            style={{
              padding: "10px 28px",
              borderRadius: 999,
              background: "#5B4DC7",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              letterSpacing: "0.12em",
              boxShadow: "0 4px 20px rgba(91,77,199,0.35)",
            }}
          >
            Tap to start
          </button>
        ) : (
          <p
            className="text-[13px] font-bold tracking-[0.12em] uppercase text-center"
            style={{ color: "#5B4DC7", opacity: voiceSessionStatus === "active" ? 0.9 : 0.45 }}
          >
            {caption}
          </p>
        )}
      </div>
    </div>
  );
}
