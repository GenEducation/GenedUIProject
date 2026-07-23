"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";

/**
 * TutorialVideoModal
 *
 * Renders the walkthrough animation as a compact centred popup.
 * - Header "✕" → skipTutorial()  (no confetti, silent dismiss)
 * - End-screen "Close" in the iframe → completeTutorial() (confetti fires on Home)
 * - "Skip" footer button → skipTutorial()
 *
 * The iframe posts "tutorial:close" when the user deliberately closes from the
 * end screen, and "tutorial:skip" when they close early.
 */
export const TutorialVideoModal: React.FC = () => {
  const { isActive, skipTutorial, completeTutorial } = useTutorialStore();
  const [iframeReady, setIframeReady] = useState(false);

  /* Reset ready-state when modal opens */
  useEffect(() => {
    if (isActive) setIframeReady(false);
  }, [isActive]);

  /* Handle messages posted from inside the iframe */
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data === "tutorial:close") completeTutorial();
      if (e.data === "tutorial:skip")  skipTutorial();
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [completeTutorial, skipTutorial]);

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="tutorial-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9998]"
            style={{ background: "rgba(4, 14, 30, 0.55)", backdropFilter: "blur(5px)" }}
            onClick={skipTutorial}
          />

          {/* ── Popup card ── */}
          <motion.div
            key="tutorial-modal"
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{ opacity: 0, scale: 0.94,    y: 24 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto flex flex-col w-full overflow-hidden rounded-2xl shadow-2xl"
              style={{
                maxWidth: 860,
                boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              {/* ── Header ── */}
              <div
                className="flex items-center justify-between shrink-0 px-5 py-3"
                style={{ background: "#1C2333" }}
              >
                {/* Left: logo + badge */}
                <div className="flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/Logo.svg"
                    alt="GenEd"
                    style={{ height: 26, width: "auto", filter: "brightness(0) invert(1)" }}
                  />
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                    style={{ background: "rgba(91,77,199,0.25)", color: "#8B7FE8" }}
                  >
                    Quick Tour
                  </span>
                </div>

                {/* Right: hint + close */}
                <div className="flex items-center gap-3">
                  <span className="hidden sm:block text-[11px] font-medium" style={{ color: "rgba(200,209,220,0.5)" }}>
                    See how GenEd works in 60 seconds
                  </span>
                  <button
                    onClick={skipTutorial}
                    aria-label="Close tutorial"
                    className="flex items-center justify-center rounded-full transition-colors"
                    style={{
                      width: 30, height: 30,
                      background: "rgba(255,255,255,0.07)",
                      border: "none",
                      color: "#c8d1dc",
                      cursor: "pointer",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* ── Video / iframe ── */}
              <div
                className="relative w-full aspect-[380/680] sm:aspect-[900/560]"
                style={{
                  background: "#0d1117",
                }}
              >
                {/* Loading shimmer */}
                {!iframeReady && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                    style={{ background: "#0d1117", zIndex: 10 }}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl animate-pulse"
                      style={{ background: "rgba(91,77,199,0.25)" }}
                    />
                    <p
                      className="text-sm font-medium"
                      style={{ color: "rgba(200,209,220,0.45)", fontFamily: "var(--font-body)" }}
                    >
                      Loading tour…
                    </p>
                  </div>
                )}

                <iframe
                  src="/tutorial-walkthrough.html"
                  title="GenEd Walkthrough Tour"
                  className="block w-full h-full border-0"
                  onLoad={() => setIframeReady(true)}
                />
              </div>

              {/* ── Footer ── */}
              <div
                className="flex items-center justify-between shrink-0 px-5 py-3"
                style={{ background: "#1C2333", borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span className="text-[11px]" style={{ color: "rgba(200,209,220,0.4)" }}>
                  You can replay this tour anytime from your Profile
                </span>
                <button
                  onClick={skipTutorial}
                  className="text-xs font-semibold transition-colors"
                  style={{ background: "none", border: "none", color: "rgba(200,209,220,0.45)", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(200,209,220,0.85)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(200,209,220,0.45)")}
                >
                  Skip tour →
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
