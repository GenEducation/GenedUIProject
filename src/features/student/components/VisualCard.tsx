import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Expand, X } from "lucide-react";

export type EngineType = "p5sketch" | "geogebra" | "desmos" | "show_figure";

interface VisualCardProps {
  engine: EngineType;
  label: string;
  children: React.ReactNode;
}

const ENGINE_META: Record<EngineType, { label: string; color: string; bg: string; dot: string }> = {
  p5sketch:    { label: "Interactive", color: "#4A90D9", bg: "#EFF6FF", dot: "#4A90D9" },
  geogebra:    { label: "Geometry",    color: "#D4820A", bg: "#FFF7ED", dot: "#D4820A" },
  desmos:      { label: "Graph",       color: "#2D6A4F", bg: "#F0FDF4", dot: "#2D6A4F" },
  show_figure: { label: "Textbook",    color: "#7B5EA7", bg: "#F5F3FF", dot: "#7B5EA7" },
};

export function VisualCard({ engine, label, children }: VisualCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const meta = ENGINE_META[engine] ?? ENGINE_META.show_figure;

  const cardContent = (
    <div
      className={`flex flex-col overflow-hidden my-3 transition-all duration-300 ${
        isExpanded
          ? "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[700px] h-[60vh] z-50"
          : "w-full max-w-[680px]"
      }`}
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 20,
        boxShadow: isExpanded
          ? "0 24px 64px rgba(0,0,0,0.22)"
          : "0 2px 12px rgba(91,77,199,0.06)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px",
          background: meta.bg,
          borderBottom: "1px solid #E2E8F0",
          borderRadius: "20px 20px 0 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8, height: 8, borderRadius: "50%",
              background: meta.dot, display: "inline-block", flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11, fontWeight: 800, letterSpacing: "0.1em",
              textTransform: "uppercase", color: meta.color,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {meta.label}
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            width: 30, height: 30, borderRadius: 9, border: "none", cursor: "pointer",
            background: "transparent", display: "flex", alignItems: "center",
            justifyContent: "center", color: "#94A3B8", transition: "all 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "#5B4DC710";
            (e.currentTarget as HTMLButtonElement).style.color = "#5B4DC7";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "#94A3B8";
          }}
          title={isExpanded ? "Close" : "Expand"}
        >
          {isExpanded ? <X size={16} /> : <Expand size={15} />}
        </button>
      </div>

      {/* Content */}
      <div
        className={`relative w-full overflow-hidden p-0 m-0 ${
          isExpanded ? "flex-1 min-h-0" : "min-h-[240px] max-h-[420px]"
        }`}
      >
        {children}
      </div>

      {/* Footer label */}
      <div
        style={{
          padding: "9px 16px",
          borderTop: "1px solid #E2E8F0",
          background: "#FAFBFF",
          borderRadius: "0 0 20px 20px",
        }}
      >
        <span
          style={{
            fontSize: 11, color: "#94A3B8", fontWeight: 600,
            letterSpacing: "0.06em", textTransform: "uppercase",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {label || "Visual"}
        </span>
      </div>
    </div>
  );

  if (isExpanded) {
    return (
      <>
        <div
          className="w-full my-3 flex items-center justify-center"
          style={{
            height: 180, borderRadius: 20, border: "1.5px dashed #E2E8F0",
            background: "#F8F9FA", color: "#94A3B8", fontSize: 13, fontWeight: 600,
          }}
        >
          Visual expanded
        </div>
        {typeof document !== "undefined" && createPortal(
          <>
            <div
              className="fixed inset-0 z-40 backdrop-blur-sm"
              style={{ background: "rgba(0,0,0,0.35)" }}
              onClick={() => setIsExpanded(false)}
            />
            {cardContent}
          </>,
          document.body
        )}
      </>
    );
  }

  return cardContent;
}
