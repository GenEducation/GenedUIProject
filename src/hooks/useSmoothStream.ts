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
  const [displayedText, setDisplayedText] = useState("");
  const [wasEverStreaming, setWasEverStreaming] = useState(isStreaming);

  useEffect(() => {
    if (isStreaming && !wasEverStreaming) {
      setWasEverStreaming(true);
    }
  }, [isStreaming, wasEverStreaming]);

  useEffect(() => {
    // If it is NOT streaming, AND it NEVER streamed in this component's lifetime
    // (i.e. loading historical chats), snap instantly to the full text.
    if (!isStreaming && !wasEverStreaming) {
      setDisplayedText(targetText);
      return;
    }

    // Determine how many characters we are behind
    const lag = targetText.length - displayedText.length;

    if (lag > 0) {
      // Constant speed: always add exactly 1 character per tick, regardless of buffer size.
      const stepSize = 1;

      const timeout = setTimeout(() => {
        setDisplayedText((prev) => targetText.slice(0, prev.length + stepSize));
      }, baseSpeedMs);

      return () => clearTimeout(timeout);
    }
  }, [targetText, displayedText, isStreaming, baseSpeedMs]);

  // Handle sudden resets (like switching active chat)
  useEffect(() => {
    if (targetText.length < displayedText.length || targetText === "") {
      setDisplayedText(targetText);
    }
  }, [targetText, displayedText]);

  return displayedText;
}
