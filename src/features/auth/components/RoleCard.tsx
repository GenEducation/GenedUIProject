"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface RoleCardProps {
  label: string;
  illustrations: string[];
  selected: boolean;
  onSelect: () => void;
  startDelay?: number;
}

const ROTATE_INTERVAL_MS = 3500;

export function RoleCard({
  label,
  illustrations,
  selected,
  onSelect,
  startDelay = 0,
}: RoleCardProps) {
  const [index, setIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (illustrations.length <= 1 || prefersReducedMotion) return;

    let intervalId: ReturnType<typeof setInterval>;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        setIndex((i) => (i + 1) % illustrations.length);
      }, ROTATE_INTERVAL_MS);
    }, startDelay);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [illustrations.length, prefersReducedMotion, startDelay]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex flex-col items-center p-6 rounded-2xl border-2 transition-all duration-300 ${
        selected
          ? "border-[#059F6D] bg-[#059F6D]/5 shadow-lg shadow-[#059F6D]/10 animate-pulse-subtle"
          : "border-[#042e5c]/10 bg-white hover:border-[#059F6D]/40 hover:bg-[#059F6D]/5"
      }`}
    >
      <div className="w-full aspect-square mb-4 transition-transform duration-300 group-hover:scale-110">
        <AnimatePresence mode="wait">
          <motion.img
            key={index}
            src={illustrations[index]}
            alt=""
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="w-full h-full object-contain"
          />
        </AnimatePresence>
      </div>
      {illustrations.length > 1 && (
        <div className="h-3 mt-1 mb-3 flex items-center justify-center gap-1.5" aria-hidden="true">
          {illustrations.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-4 bg-[#059F6D]" : "w-1.5 bg-[#042e5c]/15"
              }`}
            />
          ))}
        </div>
      )}
      <span className="text-sm font-bold text-[#042e5c]">{label}</span>
    </button>
  );
}
