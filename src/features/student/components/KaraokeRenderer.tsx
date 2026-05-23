"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useStudentStore } from "../store/useStudentStore";

interface KaraokeRendererProps {
  text: string;
  directiveId: string;
  mode?: string;
}

export const KaraokeRenderer = ({ text, directiveId, mode }: KaraokeRendererProps) => {
  const highlightedWordIndex = useStudentStore(state => state.highlightedWordIndex);
  const activeDirectiveId = useStudentStore(state => state.activeDirectiveId);
  const recordingState = useStudentStore(state => state.recordingState);
  const isActive = activeDirectiveId === directiveId;

  const parts = useMemo(() => text.split(/(\s+)/), [text]);

  let wordCounter = 0;

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

      {/* Mode label */}
      <div
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "#5B4DC7",
          background: "#5B4DC710", borderRadius: 8, padding: "3px 10px",
          marginBottom: 12, marginLeft: 4,
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

      <div
        className="whitespace-pre-wrap leading-relaxed"
        style={{ fontSize: 16, color: "#1A202C", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, paddingLeft: 4 }}
      >
        {parts.map((part, i) => {
          const isWhitespace = /\s/.test(part);
          const currentIndex = isWhitespace ? -1 : wordCounter++;
          const isHighlighted = isActive && currentIndex === highlightedWordIndex;

          if (isWhitespace) return <span key={i}>{part}</span>;

          return (
            <motion.span
              key={i}
              animate={{
                color: isHighlighted ? "#5B4DC7" : "#1A202C",
                backgroundColor: isHighlighted ? "#5B4DC715" : "transparent",
                scale: isHighlighted ? 1.08 : 1,
                fontWeight: isHighlighted ? 700 : 500,
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30, duration: 0.1 }}
              className="inline-block rounded-md px-1 cursor-default"
            >
              {part}
            </motion.span>
          );
        })}
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
