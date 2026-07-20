"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Loader2 } from "lucide-react";
import { useStudentStore } from "../store/useStudentStore";
import { useSmoothStream } from "@/hooks/useSmoothStream";

interface KaraokeRendererProps {
  text: string;
  directiveId: string;
  mode?: string;
  /** Whether the parent message is actively streaming — types the passage
   * out smoothly instead of showing it all at once. Defaults to false
   * (instant, full text) for standalone/historical usage. */
  isStreaming?: boolean;
  /** Position of this element in the message's sequential reveal order. */
  index?: number;
  /** Called once the passage has finished typing, to advance the reveal
   * sequence to the next element. */
  advance?: (index: number) => void;
}

export const KaraokeRenderer = ({ text, directiveId, mode, isStreaming, index, advance }: KaraokeRendererProps) => {
  const displayedText = useSmoothStream(text, !!isStreaming, 15);
  const advancedRef = useRef(false);

  useEffect(() => {
    if (!advancedRef.current && text.length > 0 && displayedText.length >= text.length && advance && index !== undefined) {
      advancedRef.current = true;
      advance(index);
    }
  }, [displayedText, text, advance, index]);

  const activeDirectiveId = useStudentStore(state => state.activeDirectiveId);
  const playbackState = useStudentStore(state => state.playbackState);
  const ttsReadyDirectiveIds = useStudentStore(state => state.ttsReadyDirectiveIds);
  const recordingState = useStudentStore(state => state.recordingState);
  const playDirectiveTts = useStudentStore(state => state.playDirectiveTts);
  const pausePlayback = useStudentStore(state => state.pausePlayback);
  const resumePlayback = useStudentStore(state => state.resumePlayback);
  const isActive = activeDirectiveId === directiveId;
  const isReady = ttsReadyDirectiveIds.has(directiveId);

  const isLoading = isActive && (playbackState === "loading" || playbackState === "buffering");
  const isPlaying = isActive && playbackState === "playing";
  const isPaused = isActive && playbackState === "paused";

  const handlePlayPause = () => {
    if (isLoading) return;
    if (isPlaying) {
      pausePlayback();
    } else if (isPaused) {
      resumePlayback();
    } else {
      playDirectiveTts(directiveId);
    }
  };

  return (
    <div
      className="my-3 relative overflow-hidden"
      style={{
        background: mode === "READ_ALOUD" ? "#EFF6FF" : "#FDF2F8",
        border: mode === "READ_ALOUD" ? "1px solid #4A90D920" : "1px solid #F9A8D430",
        borderRadius: 18,
        padding: "18px 20px",
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
          background: mode === "READ_ALOUD" ? "linear-gradient(180deg, #4A90D9, #5B4DC7)" : "linear-gradient(180deg, #BE185D, #F9A8D4)",
          borderRadius: "18px 0 0 18px",
        }}
      />

      {/* Mode label + play/pause button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, marginLeft: 4 }}>
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "#5B4DC7",
            background: "#5B4DC710", borderRadius: 8, padding: "3px 10px",
          }}
        >
          <span
            style={{
              width: 6, height: 6, borderRadius: "50%",
              background: mode === "READ_ALOUD" ? "#00B894" : "#5B4DC7",
              display: "inline-block",
              animation: isActive && recordingState !== "completed" ? "pulse 1.5s infinite" : "none",
            }}
          />
          {mode === "READ_ALOUD" ? "Read Aloud" : "Listen & Repeat"}
        </div>

        {mode !== "READ_ALOUD" && isReady && (
          <button
            onClick={handlePlayPause}
            disabled={isLoading}
            title={isPlaying ? "Pause" : isPaused ? "Resume" : "Play"}
            style={{
              width: 36, height: 36, borderRadius: "50%", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: isLoading ? "default" : "pointer",
              background: isPlaying || isPaused ? "#5B4DC7" : "#EDE9FE",
              color: isPlaying || isPaused ? "#fff" : "#5B4DC7",
              transition: "all 0.2s",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(91,77,199,0.18)",
            }}
          >
            {isLoading
              ? <Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} />
              : isPlaying
                ? <Pause size={16} />
                : <Play size={16} style={{ marginLeft: 2 }} />
            }
          </button>
        )}
      </div>

      <div
        className="whitespace-pre-wrap leading-relaxed"
        style={{ fontSize: 16, color: "#1A202C", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, paddingLeft: 4 }}
      >
        {displayedText}
      </div>

      {/* Active indicator */}
      {isActive && recordingState !== "completed" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: 12, display: "flex", alignItems: "center", gap: 6,
            fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#5B4DC7", paddingLeft: 4,
          }}
        >
          <div
            style={{
              width: 6, height: 6, borderRadius: "50%", background: "#00B894",
              animation: "pulse 1s infinite",
            }}
          />
          {recordingState === "processing" ? "Analyzing..." : (mode === "READ_ALOUD" ? "Student is reading" : "Aanya is reading")}
        </motion.div>
      )}

      {isActive && recordingState === "completed" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: 12, display: "flex", alignItems: "center", gap: 6,
            fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#00B894", paddingLeft: 4,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00B894" }} />
          Reading Task Completed
        </motion.div>
      )}
    </div>
  );
};
