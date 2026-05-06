"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StudentCharacter } from "./StudentCharacter";

const MESSAGES = [
  "Packing your books...",
  "Getting your lessons ready...",
  "Almost there...",
];

interface StudentLoaderProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export const StudentLoader: React.FC<StudentLoaderProps> = ({ isVisible, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setMessageIndex(0);
      setIsDone(false);
      return;
    }

    const duration = 3000;
    const intervalTime = 50;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      currentStep++;
      const currentProgress = Math.min((currentStep / steps) * 100, 100);
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        clearInterval(progressInterval);
        setIsDone(true);
        setTimeout(() => {
          onComplete?.();
        }, 800);
      }
    }, intervalTime);

    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 1000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [isVisible, onComplete]);

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
          {/* Character container */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              animate={isDone ? { scale: 1.2, y: -20 } : { scale: 1, y: 0 }}
              transition={isDone ? { type: "spring", stiffness: 300, damping: 15 } : {}}
            >
              <StudentCharacter />
            </motion.div>
          </div>

          {/* Wider, cleaner progress bar at the bottom */}
          <div className="w-full max-w-sm px-4 flex flex-col items-center">
            <div className="w-full h-[4px] bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#059F6D]"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "linear", duration: 0.05 }}
              />
            </div>

            {/* Loading message */}
            <div className="mt-4 h-6">
              <AnimatePresence mode="wait">
                <motion.p
                  key={isDone ? "done" : messageIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-[#042e5c]/40 font-medium text-sm tracking-wide"
                >
                  {isDone ? "READY!" : MESSAGES[messageIndex].toUpperCase()}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
