"use client";

import { motion } from "framer-motion";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import type { VisualSummary } from "../../types/visuals";
import { VisualImage } from "./VisualImage";

interface VisualCardProps {
  visual: VisualSummary;
  index: number;
  onOpen: (id: string) => void;
  onImageExpired: () => void;
}

export function VisualCard({ visual, index, onOpen, onImageExpired }: VisualCardProps) {
  const flagged = visual.critique?.passes === false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.035 }}
    >
      {/* eslint-disable-next-line no-restricted-syntax -- whole-card tile, not a sized action button */}
      <button
        type="button"
        onClick={() => onOpen(visual.id)}
        aria-label={`Open ${visual.title}`}
        className="group w-full text-left bg-white rounded-2xl border border-[#1A3D2C]/5 overflow-hidden transition-all hover:border-[#1A3D2C]/15 hover:shadow-[0_10px_30px_rgba(26,61,44,0.08)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A3D2C]/40"
      >
        <div className="relative">
          <VisualImage imageUrl={visual.image_url} alt={visual.title} onExpired={onImageExpired} />
          <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
            {flagged && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black uppercase tracking-widest">
                <AlertTriangle size={10} /> AI flagged
              </span>
            )}
            {visual.parent_id && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D1E6D9] text-[#1A3D2C] border border-[#1A3D2C]/10 text-[9px] font-black uppercase tracking-widest">
                <RefreshCcw size={10} /> New version
              </span>
            )}
          </div>
        </div>
        <div className="px-4 py-3 border-t border-[#1A3D2C]/5">
          <h4 className="text-sm font-bold text-[#1A3D2C] leading-snug line-clamp-2 group-hover:translate-x-0.5 transition-transform">
            {visual.title}
          </h4>
          <p className="mt-1 text-[10px] font-bold text-[#1A3D2C]/45 uppercase tracking-wider truncate">
            <span className="capitalize">{visual.subject}</span> · Grade {visual.grade} · {visual.chapter}
          </p>
        </div>
      </button>
    </motion.div>
  );
}
