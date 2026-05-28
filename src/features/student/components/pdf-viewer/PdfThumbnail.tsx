"use client";

import { useEffect, useRef } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

const THUMB_WIDTH = 82; // px — fixed thumbnail width

interface PdfThumbnailProps {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  pageWidth: number;   // base width at scale=1
  pageHeight: number;  // base height at scale=1
  isActive: boolean;
  onClick: () => void;
}

export function PdfThumbnail({ pdfDoc, pageNumber, pageWidth, pageHeight, isActive, onClick }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const thumbScale = THUMB_WIDTH / pageWidth;
  const thumbHeight = Math.floor(pageHeight * thumbScale);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let renderTask: any = null;

    const render = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) { page.cleanup(); return; }

        const viewport = page.getViewport({ scale: thumbScale });

        // No DPR scaling for thumbnails — acceptable at small size
        // and avoids conflicts with pdfjs-dist's internal context handling
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        renderTask = page.render({ canvas, viewport });
        await renderTask.promise;
        renderTask = null;
        page.cleanup();
      } catch (err: any) {
        if (err?.name === "RenderingCancelledException") return;
        console.warn(`[PdfThumbnail] Render error on page ${pageNumber}:`, err);
      }
    };

    render();

    return () => {
      cancelled = true;
      if (renderTask) renderTask.cancel();
    };
  }, [pdfDoc, pageNumber, thumbScale]);

  return (
    <button
      onClick={onClick}
      title={`Page ${pageNumber}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        padding: "6px 6px 5px",
        background: isActive ? "#EDE9FE" : "transparent",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        width: "100%",
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#F1F5F9"; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
    >
      {/* Canvas wrapper */}
      <div
        style={{
          width: THUMB_WIDTH,
          height: thumbHeight,
          background: "#fff",
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: isActive
            ? "0 0 0 2px #5B4DC7, 0 2px 6px rgba(91,77,199,0.18)"
            : "0 1px 3px rgba(0,0,0,0.12)",
          flexShrink: 0,
        }}
      >
        <canvas ref={canvasRef} style={{ display: "block" }} />
      </div>

      {/* Page number */}
      <span
        style={{
          fontSize: 10,
          fontWeight: isActive ? 700 : 500,
          color: isActive ? "#5B4DC7" : "#94A3B8",
          fontFamily: "'DM Sans', sans-serif",
          lineHeight: 1,
        }}
      >
        {pageNumber}
      </span>
    </button>
  );
}
