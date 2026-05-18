"use client";

import { motion } from "framer-motion";
import { Clock, FileText, AlertTriangle } from "lucide-react";
import { PaperMeta } from "../../types/test";
import { TestTimer } from "./TestTimer";

interface PaperHeaderProps {
  title: string;
  subject: string;
  grade: number;
  paperMeta: PaperMeta | null;
  timerSeconds: number;
  onTimerExpired: () => void;
}

export function PaperHeader({
  title,
  subject,
  grade,
  paperMeta,
  timerSeconds,
  onTimerExpired,
}: PaperHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-gradient-to-br from-[#042E5C] to-[#0a4a8a] text-white shadow-xl shadow-[#042E5C]/20"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-white/60" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">
              Chapter Test
            </span>
          </div>
          <h1 className="text-xl font-extrabold">{title}</h1>
          <div className="flex items-center gap-3 text-[13px] text-white/60 font-medium">
            <span>Grade {grade}</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span>{subject}</span>
            {paperMeta && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span>{paperMeta.total_marks} Marks</span>
              </>
            )}
          </div>
        </div>

        {paperMeta && (
          <TestTimer
            totalSeconds={timerSeconds}
            onExpired={onTimerExpired}
          />
        )}
      </div>

      {paperMeta && paperMeta.general_instructions.length > 0 && (
        <div className="mt-5 pt-4 border-t border-white/10 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={12} className="text-amber-300" />
            <span className="text-[11px] font-black uppercase tracking-widest text-white/50">
              Instructions
            </span>
          </div>
          <ul className="space-y-1">
            {paperMeta.general_instructions.map((inst, i) => (
              <li key={i} className="text-[13px] text-white/70 flex items-start gap-2">
                <span className="text-white/30 mt-0.5">•</span>
                <span>{inst}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
