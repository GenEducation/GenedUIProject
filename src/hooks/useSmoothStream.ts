import { useState, useEffect } from "react";

/**
 * A hook that takes a target text (which may be updating in chunks via SSE)
 * and plays it out smoothly to create an elegant typing effect.
 *
 * Key behavior:
 * 1. Fixed-rate reveal — always types 1 character per tick, regardless of
 *    how bursty the incoming stream is, so the typing speed stays uniform.
 * 2. Prefix-continuation model: as long as the already-displayed text is
 *    still a prefix of the target, typing continues from where it is. If
 *    the target is rewritten under us (e.g. a streamed directive tag gets
 *    stripped out and the text shrinks/shifts), the display re-anchors to
 *    the same character position in the new target — it never jumps
 *    forward to the full text.
 * 3. Stream end does NOT flush: any remaining unrevealed text keeps typing
 *    out at the same uniform pace. Historical (non-streaming) messages
 *    still render instantly via the useState initializer.
 * 4. Buffer underrun (reveal catches up to the stream) simply pauses the
 *    loop; it resumes automatically once more text arrives.
 *
 * @param targetText The full text received so far
 * @param isStreaming Whether the backend is currently still sending text
 * @param baseSpeedMs Milliseconds per character tick (default 15ms)
 */
export function useSmoothStream(targetText: string, isStreaming: boolean, baseSpeedMs = 15) {
  // Start empty during streaming, start at full text for historical messages
  const [displayedText, setDisplayedText] = useState(() => (isStreaming ? "" : targetText));

  // Keep displayedText consistent with targetText. As long as displayedText
  // is a prefix of the (possibly grown) target, typing continues from here.
  // If the target was rewritten under us (tag stripped → text shrank/shifted,
  // or chat switch), re-anchor to the same position in the new target — no
  // jump. Adjusting state during render (instead of in an effect) is the
  // React-recommended pattern for deriving state from a changed prop.
  if (!targetText.startsWith(displayedText)) {
    setDisplayedText(targetText.slice(0, Math.min(displayedText.length, targetText.length)));
  }

  // -- The typing animation loop ----------------------------------------------
  // Keeps running even after isStreaming flips to false, as long as there is
  // still unrevealed text, so the tail types out naturally instead of
  // snapping to the full text.
  useEffect(() => {
    const lag = targetText.length - displayedText.length;

    // Nothing left to type — pause; resumes automatically when targetText grows
    if (lag <= 0) return;

    const timeout = setTimeout(() => {
      setDisplayedText((prev) => {
        if (prev.length >= targetText.length) return prev;
        return targetText.slice(0, prev.length + 1);
      });
    }, baseSpeedMs);

    return () => clearTimeout(timeout);
  }, [targetText, displayedText, baseSpeedMs]);

  return displayedText;
}
