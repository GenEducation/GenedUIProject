import { useState, useEffect } from "react";

/**
 * A hook that takes a target text (which may be updating in chunks via SSE)
 * and slowly plays it out character by character to create a smooth, elegant
 * typing effect.
 * 
 * @param targetText The full text received so far
 * @param isStreaming Whether the backend is currently still sending text
 * @param baseSpeedMs Base speed in milliseconds per character
 */
export function useSmoothStream(targetText: string, isStreaming: boolean, baseSpeedMs = 15) {
  const [displayedText, setDisplayedText] = useState(() => isStreaming ? "" : targetText);
  const [wasEverStreaming, setWasEverStreaming] = useState(isStreaming);
  const [prevTargetText, setPrevTargetText] = useState(targetText);

  // Sync wasEverStreaming during render if it transitions to true
  if (isStreaming && !wasEverStreaming) {
    setWasEverStreaming(true);
  }

  // Handle sudden resets or property changes during render
  // (e.g. switching active chat or clear text)
  if (targetText !== prevTargetText) {
    setPrevTargetText(targetText);
    
    // If it's a reset (text shortened) or a non-streaming historical chat
    if (targetText.length < displayedText.length || targetText === "" || (!isStreaming && !wasEverStreaming)) {
      setDisplayedText(targetText);
    }
  }

  useEffect(() => {
    // If it is NOT streaming, AND it NEVER streamed in this component's lifetime
    // (i.e. loading historical chats), we handle this in the render phase above.
    if (!isStreaming && !wasEverStreaming) return;

    // Determine how many characters we are behind
    const lag = targetText.length - displayedText.length;

    if (lag > 0) {
      // Constant speed: add 1 character per tick
      const stepSize = 1;

      const timeout = setTimeout(() => {
        setDisplayedText((prev) => targetText.slice(0, prev.length + stepSize));
      }, baseSpeedMs);

      return () => clearTimeout(timeout);
    }
  }, [targetText, displayedText, isStreaming, wasEverStreaming, baseSpeedMs]);

  return displayedText;
}
