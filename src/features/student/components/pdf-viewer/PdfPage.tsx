"use client";

import { useEffect, useRef } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

interface PdfPageProps {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  isVisible: boolean;
  width: number;
  height: number;
  pageRef: (el: HTMLDivElement | null) => void;
}

export function PdfPage({ pdfDoc, pageNumber, scale, isVisible, width, height, pageRef }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const renderedScaleRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isVisible || !canvasRef.current) return;

    // Skip re-render if already rendered at this scale
    if (renderedScaleRef.current === scale) return;

    const canvas = canvasRef.current;
    let cancelled = false;

    const render = async () => {
      // Cancel any in-flight render
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) {
          page.cleanup();
          return;
        }

        const viewport = page.getViewport({ scale });
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.scale(dpr, dpr);

        // pdfjs-dist v5 render API takes the canvas element directly
        const renderTask = page.render({ canvas, viewport });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        renderedScaleRef.current = scale;
        page.cleanup();
      } catch (err: any) {
        if (err?.name === "RenderingCancelledException") return;
        console.warn(`[PdfPage] Render error on page ${pageNumber}:`, err);
      }
    };

    render();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, pageNumber, scale, isVisible]);

  // Reset rendered scale when visibility is lost (so it re-renders when coming back)
  useEffect(() => {
    if (!isVisible) {
      renderedScaleRef.current = null;
    }
  }, [isVisible]);

  const scaledWidth = Math.floor(width * scale);
  const scaledHeight = Math.floor(height * scale);

  return (
    <div
      ref={pageRef}
      className="relative flex-shrink-0"
      style={{
        width: scaledWidth,
        height: scaledHeight,
        margin: "0 auto",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
        borderRadius: 2,
        overflow: "hidden",
      }}
      data-page={pageNumber}
    >
      {isVisible ? (
        <canvas
          ref={canvasRef}
          style={{ display: "block" }}
        />
      ) : (
        // Placeholder while off-screen
        <div
          className="flex items-center justify-center w-full h-full"
          style={{ background: "#F1F5F9", color: "#CBD5E1", fontSize: 12, fontFamily: "var(--font-body)" }}
        >
          {pageNumber}
        </div>
      )}
    </div>
  );
}
