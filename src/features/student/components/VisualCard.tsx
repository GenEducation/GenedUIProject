import React, { useState } from "react";
import { Expand, X } from "lucide-react";

export type EngineType = "p5sketch" | "geogebra" | "desmos" | "show_figure";

interface VisualCardProps {
  engine: EngineType;
  label: string;
  children: React.ReactNode;
}

export function VisualCard({ engine, label, children }: VisualCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  let chipText = "Visual";
  let chipBg = "#E8E8E8";
  let chipColor = "#333333";

  if (engine === "p5sketch") {
    chipText = "Interactive";
    chipBg = "#E8F4FF";
    chipColor = "#1A6BBF";
  } else if (engine === "geogebra") {
    chipText = "Geometry";
    chipBg = "#FFF3E0";
    chipColor = "#E65100";
  } else if (engine === "desmos") {
    chipText = "Graph";
    chipBg = "#E8F5E9";
    chipColor = "#2E7D32";
  } else if (engine === "show_figure") {
    chipText = "Textbook";
    chipBg = "#F3E5F5";
    chipColor = "#6A1B9A";
  }

  const cardContent = (
    <div
      className={`bg-white border border-[#E8E8E8] shadow-[0_4px_20px_rgba(0,0,0,0.1)] rounded-2xl flex flex-col overflow-hidden my-3 transition-all duration-300 ${
        isExpanded 
          ? "fixed top-12 bottom-12 left-1/2 -translate-x-1/2 w-[60vw] z-50 shadow-[0_20px_60px_rgba(0,0,0,0.4)]" 
          : "w-full max-w-[680px]"
      }`}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E8] bg-white">
        <div
          className="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
          style={{ backgroundColor: chipBg, color: chipColor }}
        >
          {chipText}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative z-10 text-gray-400 hover:text-[#042E5C] transition-all p-1.5 rounded-lg hover:bg-[#F0F7FF]"
          title={isExpanded ? "Close" : "Expand"}
        >
          {isExpanded ? <X size={20} /> : <Expand size={18} />}
        </button>
      </div>

      <div className={`relative w-full ${isExpanded ? "flex-1" : "min-h-[280px] max-h-[420px]"} flex items-center justify-center overflow-hidden`}>
        {children}
      </div>

      <div className="px-4 py-2 border-t border-[#E8E8E8] bg-[#FDFDFD]">
        <span className="text-[12px] text-[#9E9E9E] tracking-[0.08em] uppercase font-medium">
          {label || "Visual"}
        </span>
      </div>
    </div>
  );

  if (isExpanded) {
    return (
      <>
        {/* Placeholder in document flow */}
        <div className="w-full h-[320px] border border-dashed border-gray-300 rounded-xl my-3 bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
          Visual expanded
        </div>
        {/* Backdrop */}
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setIsExpanded(false)} />
        {/* Expanded Card */}
        {cardContent}
      </>
    );
  }

  return cardContent;
}
