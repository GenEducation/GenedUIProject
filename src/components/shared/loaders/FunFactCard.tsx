"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSubjectConfig } from "@/constants/subjectConfig";
import { pickFunFact, rememberFactId } from "@/features/student/utils/pickFunFact";
import { FACT_THEME_ICONS } from "@/features/student/constants/factThemes";
import type { FunFact } from "@/features/student/constants/funFacts";

/**
 * Waits this long before showing anything. A loader that resolves in 200ms
 * would otherwise flash a fact and rip it away, which reads as a glitch.
 */
const DEFAULT_DELAY_MS = 600;

/**
 * Lucide draws at 2; the hand-drawn subject icons in `src/components/icons/`
 * are at 1.5. Splitting the difference lets the two sets share a screen without
 * an obvious weight mismatch.
 */
const ICON_STROKE = 1.75;

/** Nia's purple, used whenever no subject accent applies. */
const FALLBACK_ACCENT = "var(--tutor)";

export interface FunFactCardProps {
  /** Raw subject name of the current session, if any. */
  subject?: string | null;
  /** Suppress the delay (set 0) on waits that are always seconds long. */
  delayMs?: number;
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
  subject,
  delayMs = DEFAULT_DELAY_MS,
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
      const chosen = pickFunFact({ subject });
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
    // Chosen once per mount: re-picking when the subject settles in would
    // swap the text out from under the reader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accent = subject ? getSubjectConfig(subject).color : FALLBACK_ACCENT;

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
            <FactBody fact={fact} accent={accent} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * One presentation everywhere — no card, no border, no shadow, no chip behind
 * the icon. The fact is part of the screen rather than an object sitting on it,
 * which is why every loader can show it without gaining a second surface.
 */
function FactBody({ fact, accent }: { fact: FunFact; accent: string }) {
  const Icon = FACT_THEME_ICONS[fact.theme];

  return (
    <div className="flex flex-col items-center text-center max-w-sm mx-auto">
      <Icon size={20} strokeWidth={ICON_STROKE} aria-hidden="true" style={{ color: accent }} />
      <div
        className="text-[10px] font-bold uppercase mt-2.5 mb-1.5"
        style={{ color: accent, letterSpacing: "0.14em" }}
      >
        Did you know?
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-mid, #4a5568)" }}>
        {fact.text}
      </p>
    </div>
  );
}

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
