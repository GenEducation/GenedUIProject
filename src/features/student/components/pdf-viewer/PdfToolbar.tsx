"use client";

import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, PanelLeft } from "lucide-react";

interface PdfToolbarProps {
  currentPage: number;
  numPages: number;
  scale: number;
  isSidebarOpen: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleSidebar: () => void;
}

const ICON_BTN: React.CSSProperties = {
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 6,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: "#64748B",
  padding: 0,
  transition: "background 0.15s",
  flexShrink: 0,
};

const ACTIVE_BTN: React.CSSProperties = {
  ...ICON_BTN,
  background: "#EDE9FE",
  color: "var(--tutor)",
};

const DIVIDER: React.CSSProperties = {
  width: 1,
  height: 16,
  background: "#E2E8F0",
  flexShrink: 0,
};

export function PdfToolbar({
  currentPage,
  numPages,
  scale,
  isSidebarOpen,
  onPrevPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  onToggleSidebar,
}: PdfToolbarProps) {
  const percent = Math.round(scale * 100);

  return (
    <div
      className="flex items-center gap-1 flex-shrink-0 flex-wrap"
      style={{
        padding: "4px 8px",
        background: "#FFFFFF",
        borderBottom: "1px solid #E2E8F0",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Sidebar toggle */}
      <button
        style={isSidebarOpen ? ACTIVE_BTN : ICON_BTN}
        onClick={onToggleSidebar}
        title={isSidebarOpen ? "Hide page panel" : "Show page panel"}
        onMouseEnter={(e) => { if (!isSidebarOpen) (e.currentTarget as HTMLButtonElement).style.background = "#F1F5F9"; }}
        onMouseLeave={(e) => { if (!isSidebarOpen) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <PanelLeft size={14} />
      </button>

      <div style={DIVIDER} />

      {/* Page navigation */}
      <button
        style={ICON_BTN}
        onClick={onPrevPage}
        disabled={currentPage <= 1}
        title="Previous page"
        onMouseEnter={(e) => { if (currentPage > 1) (e.currentTarget as HTMLButtonElement).style.background = "#F1F5F9"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <ChevronLeft size={14} />
      </button>

      <span style={{ fontSize: 12, fontWeight: 600, color: "#475569", minWidth: 70, textAlign: "center" }}>
        {numPages > 0 ? `${currentPage} / ${numPages}` : "—"}
      </span>

      <button
        style={ICON_BTN}
        onClick={onNextPage}
        disabled={currentPage >= numPages}
        title="Next page"
        onMouseEnter={(e) => { if (currentPage < numPages) (e.currentTarget as HTMLButtonElement).style.background = "#F1F5F9"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <ChevronRight size={14} />
      </button>

      <div style={DIVIDER} />

      {/* Zoom controls */}
      <button
        style={ICON_BTN}
        onClick={onZoomOut}
        title="Zoom out"
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F1F5F9"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <ZoomOut size={14} />
      </button>

      <span style={{ fontSize: 12, fontWeight: 600, color: "#475569", minWidth: 40, textAlign: "center" }}>
        {percent}%
      </span>

      <button
        style={ICON_BTN}
        onClick={onZoomIn}
        title="Zoom in"
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F1F5F9"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <ZoomIn size={14} />
      </button>
    </div>
  );
}
