"use client";

import { BookOpen, X, ExternalLink } from "lucide-react";

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
        style={{ padding: "10px 12px", background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}
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

        <div className="flex items-center gap-1 flex-shrink-0">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            className="flex items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
            style={{ width: 28, height: 28, color: "#94A3B8" }}
          >
            <ExternalLink size={13} />
          </a>
          <button
            onClick={onClose}
            title="Close textbook"
            className="flex items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
            style={{ width: 28, height: 28, color: "#94A3B8" }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* PDF iframe */}
      <iframe
        src={pdfUrl}
        title={`Textbook: ${chapterName}`}
        referrerPolicy="no-referrer"
        className="flex-1 w-full border-none"
        style={{ background: "#F7F8FC" }}
      />
    </div>
  );
}
