"use client";

import { useEffect, useRef, useState } from "react";
import { getDocument } from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

export interface PageDimensions {
  width: number;
  height: number;
}

interface UsePdfDocumentResult {
  pdfDoc: PDFDocumentProxy | null;
  numPages: number;
  pageDimensions: PageDimensions[];
  loading: boolean;
  error: string | null;
}

export function usePdfDocument(url: string): UsePdfDocumentResult {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageDimensions, setPageDimensions] = useState<PageDimensions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadTask = getDocument({ url, withCredentials: false });

    loadTask.promise
      .then(async (doc) => {
        if (cancelled) {
          doc.destroy();
          return;
        }

        // Pre-fetch all page dimensions (fast — no rendering)
        const dims: PageDimensions[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          dims.push({ width: vp.width, height: vp.height });
          page.cleanup();
        }

        if (cancelled) {
          doc.destroy();
          return;
        }

        docRef.current = doc;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPageDimensions(dims);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[PdfViewer] Failed to load PDF:", err);
        setError("Failed to load the textbook. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
      loadTask.destroy();
      if (docRef.current) {
        docRef.current.destroy();
        docRef.current = null;
      }
    };
  }, [url]);

  return { pdfDoc, numPages, pageDimensions, loading, error };
}
