import { useState, useEffect, useRef } from "react";

/**
 * A hook that takes a target text (which may be updating in chunks via SSE)
 * and plays it out smoothly to create an elegant typing effect.
 *
 * Key improvements over v1:
 * 1. Dynamic step size — catches up faster when a large burst arrives.
 * 2. Immediate flush on stream end — no orphaned characters after streaming stops.
 * 3. All state mutations are inside useEffect — no illegal setState-in-render.
 *
 * @param targetText The full text received so far
 * @param isStreaming Whether the backend is currently still sending text
 * @param baseSpeedMs Base speed in milliseconds per tick (default 15ms)
 */
export function useSmoothStream(targetText: string, isStreaming: boolean, baseSpeedMs = 15) {
  // Start empty during streaming, start at full text for historical messages
  const [displayedText, setDisplayedText] = useState(() => (isStreaming ? "" : targetText));

  // Track the previous targetText to detect resets (e.g. switching chat)
  const prevTargetRef = useRef(targetText);

  // -- Effect 1: Handle resets & historical messages --------------------------
  // If targetText suddenly gets shorter (chat switch / clear), or was never
  // streaming (historical load), snap directly to the full text immediately.
  useEffect(() => {
    const prevTarget = prevTargetRef.current;
    prevTargetRef.current = targetText;

    const isShorter = targetText.length < prevTarget.length;
    const isReset = targetText === "";
    const isHistorical = !isStreaming && prevTarget === targetText;

    if (isShorter || isReset) {
      // Chat was switched or cleared — snap instantly
      setDisplayedText(targetText);
    } else if (isHistorical && targetText !== "") {
      // Historical chat loaded with no streaming — show immediately
      setDisplayedText(targetText);
    }
  }, [targetText, isStreaming]);

  // -- Effect 2: Flush remaining text immediately when stream ends ------------
  useEffect(() => {
    if (!isStreaming) {
      // Stream has ended — flush any remaining buffered characters right away
      setDisplayedText((prev) => {
        if (prev !== targetText) return targetText;
        return prev;
      });
    }
  }, [isStreaming, targetText]);

  // -- Effect 3: The typing animation loop -----------------------------------
  useEffect(() => {
    // Only animate when actively streaming
    if (!isStreaming) return;

    const lag = targetText.length - displayedText.length;

    // Nothing left to type
    if (lag <= 0) return;

    // Dynamic step size:
    // - Small lag (< 30 chars): type 1 char/tick for a natural look
    // - Medium lag (30–100): accelerate to catch up smoothly
    // - Large lag (> 100): jump ahead quickly to avoid falling far behind
    let stepSize: number;
    if (lag > 100) {
      stepSize = Math.ceil(lag / 10); // big burst — catch up fast
    } else if (lag > 30) {
      stepSize = Math.ceil(lag / 20); // medium lag — moderate catch-up
    } else {
      stepSize = 1; // small lag — natural 1-char typewriter
    }

    const timeout = setTimeout(() => {
      setDisplayedText((prev) => targetText.slice(0, prev.length + stepSize));
    }, baseSpeedMs);

    return () => clearTimeout(timeout);
  }, [targetText, displayedText, isStreaming, baseSpeedMs]);

  return displayedText;
}
