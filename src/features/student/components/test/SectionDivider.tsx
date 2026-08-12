"use client";

import { motion } from "framer-motion";
import { PaperSectionMeta } from "../../types/test";

interface SectionDividerProps {
  sectionMeta: PaperSectionMeta;
}

export function SectionDivider({ sectionMeta }: SectionDividerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative py-4"
    >
      <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--primary-ink)]/10" />
      <div className="relative inline-flex items-center gap-3 bg-[#F8F9FA] pr-4 pl-1">
        <span className="w-8 h-8 rounded-lg bg-[var(--primary-ink)] text-white flex items-center justify-center text-[13px] font-black">
          {sectionMeta.label}
        </span>
        <div>
          <h3 className="text-[14px] font-extrabold text-[var(--primary-ink)] uppercase tracking-wide">
            {sectionMeta.title}
          </h3>
          <span className="text-[11px] font-bold text-[var(--primary-ink)]/40 uppercase tracking-widest">
            {sectionMeta.marks_per_question}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
