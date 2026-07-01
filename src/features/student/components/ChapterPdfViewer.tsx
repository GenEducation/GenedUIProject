"use client";

import { BookOpen, X } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamic import with ssr:false prevents pdfjs-dist from being evaluated on the
// server (it uses browser-only APIs like DOMMatrix that don't exist in Node.js).
const PdfViewer = dynamic(
  () => import("./pdf-viewer").then((m) => m.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center flex-1 gap-3" style={{ background: "#F7F8FC" }}>
        <div
          style={{
            width: 28,
            height: 28,
            border: "3px solid #EDE9FE",
            borderTopColor: "#5B4DC7",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ fontSize: 13, color: "#64748B", fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
          Loading textbook…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    ),
  }
);

interface ChapterPdfViewerProps {
  pdfUrl: string;
  chapterName: string;
  onClose: () => void;
}

export function ChapterPdfViewer({ pdfUrl, chapterName, onClose }: ChapterPdfViewerProps) {
  return (
    <div className="flex flex-col h-full" style={{ borderLeft: "1px solid #E2E8F0", background: "#F7F8FC" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{ padding: "8px 10px", background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-lg"
            style={{ width: 28, height: 28, background: "#EDE9FE" }}
          >
            <BookOpen size={14} style={{ color: "#5B4DC7" }} />
          </div>
          <div className="min-w-0">
            <p
              className="truncate"
              style={{ fontWeight: 700, fontSize: 13, color: "#1A202C", fontFamily: "'Nunito', 'DM Sans', sans-serif", margin: 0 }}
            >
              {chapterName}
            </p>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Textbook
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          title="Close textbook"
          className="flex items-center justify-center rounded-lg transition-colors hover:bg-gray-100 flex-shrink-0"
          style={{ width: 40, height: 40, color: "#94A3B8", border: "none", background: "transparent", cursor: "pointer" }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Canvas-based PDF viewer — fully client-side, no Chrome toolbar */}
      <PdfViewer pdfUrl={pdfUrl} />
    </div>
  );
}
