"use client";

import { useEffect, useRef } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { PdfThumbnail } from "./PdfThumbnail";
import type { PageDimensions } from "./usePdfDocument";

interface PdfSidebarProps {
  pdfDoc: PDFDocumentProxy;
  numPages: number;
  pageDimensions: PageDimensions[];
  currentPage: number;
  onPageSelect: (page: number) => void;
}

export function PdfSidebar({ pdfDoc, numPages, pageDimensions, currentPage, onPageSelect }: PdfSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Keep the active thumbnail scrolled into view
  useEffect(() => {
    const el = thumbRefs.current[currentPage - 1];
    if (el && sidebarRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [currentPage]);

  return (
    <div
      ref={sidebarRef}
      className="flex flex-col overflow-y-auto overflow-x-hidden flex-shrink-0"
      style={{
        width: 110,
        background: "#F8FAFC",
        borderRight: "1px solid #E2E8F0",
        padding: "8px 6px",
        gap: 4,
      }}
    >
      {pageDimensions.map((dim, i) => {
        const pageNum = i + 1;
        return (
          <div key={pageNum} ref={(el) => { thumbRefs.current[i] = el; }}>
            <PdfThumbnail
              pdfDoc={pdfDoc}
              pageNumber={pageNum}
              pageWidth={dim.width}
              pageHeight={dim.height}
              isActive={currentPage === pageNum}
              onClick={() => onPageSelect(pageNum)}
            />
          </div>
        );
      })}
    </div>
  );
}
