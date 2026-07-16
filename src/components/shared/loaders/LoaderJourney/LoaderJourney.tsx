"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SIMULATED_CAP = 90;
const LOOP_INTERVAL_MS = 800;

// Cycles independently of progress % so the character keeps moving even
// when the backend takes far longer than the simulated progress expects.
const LOOP_STEPS = [
  { pose: "bike", message: "Getting things ready…" },
  { pose: "read", message: "Fetching your content…" },
  { pose: "read", message: "Putting on the finishing touches…" },
] as const;

interface LoaderJourneyProps {
  isVisible: boolean;
  isComplete: boolean;
  onFinished: () => void;
}

export const LoaderJourney: React.FC<LoaderJourneyProps> = ({
  isVisible,
  isComplete,
  onFinished,
}) => {
  const [progress, setProgress] = useState(0);
  const [loopStep, setLoopStep] = useState(0);
  const finishedRef = useRef(false);

  // Steady progress climb, decoupled from which character pose is showing.
  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      finishedRef.current = false;
      return;
    }

    let raf: ReturnType<typeof setTimeout>;
    const tick = () => {
      setProgress((prev) => {
        const target = isComplete ? 100 : SIMULATED_CAP;
        const step = isComplete ? 0.35 : 0.08;
        const next = prev + (target - prev) * step;
        return target - next < 0.15 ? target : next;
      });
      raf = setTimeout(tick, 120);
    };
    raf = setTimeout(tick, 120);

    return () => clearTimeout(raf);
  }, [isVisible, isComplete]);

  // Independent pose/message loop — keeps animating no matter how long the
  // backend takes, instead of freezing once progress hits its simulated cap.
  useEffect(() => {
    if (!isVisible || isComplete) {
      setLoopStep(0);
      return;
    }

    const id = setInterval(() => {
      setLoopStep((prev) => (prev + 1) % LOOP_STEPS.length);
    }, LOOP_INTERVAL_MS);

    return () => clearInterval(id);
  }, [isVisible, isComplete]);

  useEffect(() => {
    if (isVisible && isComplete && progress >= 99.9 && !finishedRef.current) {
      finishedRef.current = true;
      const t = setTimeout(onFinished, 1200);
      return () => clearTimeout(t);
    }
  }, [isVisible, isComplete, progress, onFinished]);

  const pct = Math.min(100, progress);
  const isTrophyPhase = isComplete && pct >= 100;
  const currentPose = isTrophyPhase ? "trophy" : LOOP_STEPS[loopStep].pose;
  const isBikePhase = currentPose === "bike";
  const isReadPhase = currentPose === "read";

  const message = isTrophyPhase ? "All done!" : LOOP_STEPS[loopStep].message;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm overflow-hidden"
        >
          <style>{keyframes}</style>

          <div className="relative w-[220px] h-[220px] mb-6">
            <img
              src="/loaders/journey/char-bike.svg"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300"
              style={{ opacity: isBikePhase ? 1 : 0 }}
            />
            <img
              src="/loaders/journey/char-read.svg"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300"
              style={{ opacity: isReadPhase ? 1 : 0 }}
            />
            <img
              src="/loaders/journey/char-trophy.svg"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300"
              style={{ opacity: isTrophyPhase ? 1 : 0 }}
            />

            {isTrophyPhase && (
              <div className="journey-loader-complete">
                <Confetti color="#8C63C9" dx={-70} dy={-40} rot={120} />
                <Confetti color="#3D6FE0" dx={70} dy={-50} rot={-100} />
                <Confetti color="#F26FA0" dx={-40} dy={-70} rot={200} />
                <Confetti color="#FFC93D" dx={50} dy={-70} rot={-160} />
                <Confetti color="#3D6FE0" dx={-90} dy={10} rot={80} />
                <Confetti color="#8C63C9" dx={90} dy={0} rot={-80} />
              </div>
            )}
          </div>

          <div className="w-full max-w-sm px-4 flex flex-col items-center">
            <div className="w-full h-[4px] bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#3D6FE0] to-[#8C63C9]"
                animate={{ width: `${pct}%` }}
                transition={{ ease: "linear", duration: 0.1 }}
              />
            </div>

            <div className="mt-4 text-[#042e5c]/60 font-semibold text-sm tracking-wide">
              {Math.round(pct)}%
            </div>

            <div className="mt-1 h-6">
              <AnimatePresence mode="wait">
                <motion.p
                  key={message}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-[#042e5c]/40 font-medium text-sm tracking-wide"
                >
                  {message}
                </motion.p>
              </AnimatePresence>
            </div>

            <div aria-live="polite" className="sr-only">
              {message}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function Confetti({
  color,
  dx,
  dy,
  rot,
}: {
  color: string;
  dx: number;
  dy: number;
  rot: number;
}) {
  return (
    <div
      className="journey-confetti-bit"
      style={
        {
          position: "absolute",
          left: "50%",
          top: "20%",
          width: 10,
          height: 10,
          borderRadius: 2,
          background: color,
          "--dx": `${dx}px`,
          "--dy": `${dy}px`,
          "--rot": `${rot}deg`,
        } as React.CSSProperties
      }
    />
  );
}

const keyframes = `
  @keyframes journey-burst {
    0%   { opacity: 1; transform: translate(0,0) rotate(0deg); }
    100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); }
  }
  .journey-loader-complete .journey-confetti-bit {
    animation: journey-burst 1.1s ease-out forwards;
  }
`;
