"use client";

import { motion } from "framer-motion";
import { useStudentStore } from "../store/useStudentStore";

interface VoiceStageProps {
  caption: string;
  reactive: boolean; // true while mic is hot (continuous active, or PTT held)
}

/**
 * Placeholder gradient orb — pulses slowly when idle, faster when reactive.
 * Final visual will be iterated separately.
 */
export function VoiceStage({ caption, reactive }: VoiceStageProps) {
  const { voiceSessionStatus, isAITyping } = useStudentStore();
  const isSpeaking = isAITyping; // assistant streaming = speaking
  const phase = isSpeaking ? "speaking" : reactive ? "listening" : "idle";

  const pulseDuration =
    phase === "speaking" ? 0.9 : phase === "listening" ? 1.4 : 3.0;
  const pulseScale =
    phase === "speaking" ? [1, 1.08, 1] : phase === "listening" ? [1, 1.05, 1] : [1, 1.02, 1];

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <motion.div
        className="relative"
        animate={{ scale: pulseScale }}
        transition={{ duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }}
        style={{ width: 220, height: 220 }}
      >
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(91,77,199,0.35), rgba(74,144,217,0.15) 60%, transparent 75%)",
            filter: "blur(20px)",
          }}
          animate={{ opacity: phase === "idle" ? [0.4, 0.6, 0.4] : [0.6, 1, 0.6] }}
          transition={{ duration: pulseDuration * 1.3, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Orb */}
        <div
          className="absolute inset-4 rounded-full overflow-hidden"
          style={{
            background:
              "conic-gradient(from 220deg at 50% 50%, #5B4DC7, #4A90D9, #8B7FE8, #5B4DC7)",
            boxShadow:
              "inset -20px -30px 60px rgba(0,0,0,0.25), inset 12px 16px 40px rgba(255,255,255,0.25), 0 12px 40px rgba(91,77,199,0.35)",
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
        </div>
      </motion.div>

      <div className="mt-7 text-center min-h-[28px]">
        <p
          className="text-[13px] font-bold tracking-[0.18em] uppercase"
          style={{ color: "#5B4DC7", opacity: voiceSessionStatus === "active" ? 0.9 : 0.45 }}
        >
          {caption}
        </p>
      </div>
    </div>
  );
}
