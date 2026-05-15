"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useStudentStore } from "../store/useStudentStore";

interface KaraokeRendererProps {
  text: string;
  directiveId: string;
  mode?: string;
}

/**
 * A dedicated component for KIRA English Skill reading blocks.
 * Renders the source_text with word-level highlighting synced to audio.
 */
export const KaraokeRenderer = ({ text, directiveId, mode }: KaraokeRendererProps) => {
  const highlightedWordIndex = useStudentStore(state => state.highlightedWordIndex);
  const activeDirectiveId = useStudentStore(state => state.activeDirectiveId);
  const recordingState = useStudentStore(state => state.recordingState);
  const isActive = activeDirectiveId === directiveId;

  // Split by words but preserve whitespace/newlines to maintain poem formatting
  const parts = useMemo(() => text.split(/(\s+)/), [text]);
  
  let wordCounter = 0;

  return (
    <div className="my-4 p-5 bg-white border border-[#042E5C]/10 rounded-2xl shadow-sm relative overflow-hidden group">
      {/* Decorative accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400 opacity-50" />
      
      <div className="whitespace-pre-wrap leading-relaxed text-[17px] text-[#042E5C]">
        {parts.map((part, i) => {
          const isWhitespace = /\s/.test(part);
          const currentIndex = isWhitespace ? -1 : wordCounter++;
          const isHighlighted = isActive && currentIndex === highlightedWordIndex;

          if (isWhitespace) {
            return <span key={i}>{part}</span>;
          }

          return (
            <motion.span
              key={i}
              animate={{ 
                color: isHighlighted ? "#3b82f6" : "#042E5C",
                backgroundColor: isHighlighted ? "#dbeafe" : "transparent",
                scale: isHighlighted ? 1.1 : 1,
                fontWeight: isHighlighted ? 700 : 500
              }}
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 30,
                duration: 0.1 
              }}
              className="inline-block rounded-md px-1 cursor-default"
            >
              {part}
            </motion.span>
          );
        })}
      </div>

      {/* Mode Indicator */}
      {isActive && recordingState !== "completed" && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600"
        >
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          {recordingState === "processing" ? "Analyzing..." : (mode === "READ_ALOUD" ? "Student is reading" : "Aanya is reading")}
        </motion.div>
      )}

      {isActive && recordingState === "completed" && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600"
        >
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
          Reading Task Completed
        </motion.div>
      )}
    </div>
  );
};
