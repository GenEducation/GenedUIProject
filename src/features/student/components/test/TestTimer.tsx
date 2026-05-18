"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";

interface TestTimerProps {
  totalSeconds: number;
  onExpired: () => void;
}

export function TestTimer({ totalSeconds, onExpired }: TestTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const [extensionUsed, setExtensionUsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [graceCountdown, setGraceCountdown] = useState(10);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    if (showModal) return;
    if (remaining <= 0) {
      setShowModal(true);
      setGraceCountdown(10);
      return;
    }
    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [remaining, showModal]);

  useEffect(() => {
    if (!showModal) return;
    if (graceCountdown <= 0) {
      onExpiredRef.current();
      return;
    }
    const id = setInterval(() => setGraceCountdown((g) => g - 1), 1000);
    return () => clearInterval(id);
  }, [showModal, graceCountdown]);

  const handleExtend = useCallback(() => {
    setExtensionUsed(true);
    setRemaining(120);
    setShowModal(false);
  }, []);

  const handleSubmitNow = useCallback(() => {
    onExpiredRef.current();
  }, []);

  const minutes = Math.floor(Math.max(0, remaining) / 60);
  const seconds = Math.max(0, remaining) % 60;
  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const isWarning = remaining <= 300 && remaining > 60;
  const isCritical = remaining <= 60;

  return (
    <>
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg font-bold transition-all ${
          isCritical
            ? "bg-red-500/20 text-red-300"
            : isWarning
            ? "bg-amber-500/20 text-amber-300"
            : "bg-white/10 text-white/80"
        }`}
      >
        <motion.div
          animate={
            isCritical
              ? { scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] }
              : isWarning
              ? { scale: [1, 1.1, 1] }
              : {}
          }
          transition={{ duration: 1, repeat: Infinity }}
        >
          <Clock size={18} />
        </motion.div>
        {timeStr}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 text-center shadow-2xl space-y-5"
            >
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <Clock size={28} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-extrabold text-[#042E5C]">Time&apos;s Up!</h2>
              <p className="text-[#042E5C]/60 text-[15px]">
                Your test will be submitted automatically in{" "}
                <span className="font-bold text-red-500">{graceCountdown}s</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleSubmitNow}
                  className="flex-1 py-3 bg-[#042E5C] text-white rounded-xl font-bold text-[15px] hover:bg-[#064282] transition-all"
                >
                  Submit Now
                </button>
                {!extensionUsed && (
                  <button
                    onClick={handleExtend}
                    className="flex-1 py-3 bg-amber-100 text-amber-700 rounded-xl font-bold text-[15px] hover:bg-amber-200 transition-all"
                  >
                    +2 min
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
