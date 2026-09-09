"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSubjectConfig } from "@/constants/subjectConfig";
import { pickFunFact, rememberFactId } from "@/features/student/utils/pickFunFact";
import type { FunFact } from "@/features/student/constants/funFacts";

/**
 * Waits this long before showing anything. A loader that resolves in 200ms
 * would otherwise flash a fact and rip it away, which reads as a glitch.
 */
const DEFAULT_DELAY_MS = 600;

export interface FunFactCardProps {
  /** Student's grade, used to keep facts age-appropriate. */
  grade?: number | null;
  /** Raw subject name of the current session, if any. */
  subject?: string | null;
  /** Suppress the delay (set 0) on waits that are always seconds long. */
  delayMs?: number;
  /** `full` renders a card; `inline` a single muted line for cramped spots. */
  variant?: "full" | "inline";
  className?: string;
}

/**
 * Shows one curated fun fact while something is loading.
 *
 * The fact is chosen once per mount and never rotates — swapping text out
 * mid-sentence is worse than leaving it still. Renders nothing at all if the
 * wait ends before `delayMs`.
 */
export const FunFactCard: React.FC<FunFactCardProps> = ({
  grade,
  subject,
  delayMs = DEFAULT_DELAY_MS,
  variant = "full",
  className = "",
}) => {
  const [fact, setFact] = useState<FunFact | null>(null);
  const reduceMotion = usePrefersReducedMotion();
  // Guards against the delay timer firing twice under React strict mode.
  const pickedRef = useRef(false);

  useEffect(() => {
    if (pickedRef.current) return;

    const choose = () => {
      pickedRef.current = true;
      const chosen = pickFunFact({ grade, subject });
      if (chosen) {
        rememberFactId(chosen.id);
        setFact(chosen);
      }
    };

    if (delayMs <= 0) {
      choose();
      return;
    }

    const timer = setTimeout(choose, delayMs);
    return () => clearTimeout(timer);
    // Chosen once per mount: re-picking when grade/subject settle in would
    // swap the text out from under the reader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accent = subject ? getSubjectConfig(subject).color : "var(--tutor)";

  return (
    <div aria-live="polite" className={className}>
      <AnimatePresence>
        {fact && (
          <motion.div
            key={fact.id}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {variant === "inline" ? (
              <p
                className="text-center text-xs leading-relaxed max-w-xs mx-auto"
                style={{ color: "var(--text-muted, #94A3B8)" }}
              >
                <span aria-hidden="true">{fact.emoji}</span>{" "}
                <span style={{ fontWeight: 700, color: accent }}>Did you know?</span>{" "}
                {fact.text}
              </p>
            ) : (
              <div
                className="mx-auto max-w-sm px-5 py-4 text-center"
                style={{
                  background: "var(--surface-card, #FFFFFF)",
                  border: "1px solid var(--surface-border, #E2E8F0)",
                  borderRadius: "var(--radius-card, 24px)",
                  boxShadow: "0 4px 20px rgba(4, 46, 92, 0.06)",
                }}
              >
                <div
                  className="text-2xl leading-none mb-2"
                  aria-hidden="true"
                >
                  {fact.emoji}
                </div>
                <div
                  className="text-[10px] font-bold uppercase mb-1.5"
                  style={{ color: accent, letterSpacing: "0.14em" }}
                >
                  Did you know?
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-mid, #475569)" }}
                >
                  {fact.text}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}
