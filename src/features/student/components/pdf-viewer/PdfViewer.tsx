"use client";

// Side-effect import — configures GlobalWorkerOptions once
import "./pdfWorkerSetup";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePdfDocument } from "./usePdfDocument";
import { PdfPage } from "./PdfPage";
import { PdfToolbar } from "./PdfToolbar";
import { PdfSidebar } from "./PdfSidebar";
import { PointerOverlay } from "./PointerOverlay";
import { usePointerResolver } from "./usePointerResolver";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import type { PointerSpec } from "./pointerGeometry";

const ZOOM_STEP = 0.25;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const PAGE_GAP = 16;
const HORIZONTAL_PADDING = 24;

interface PdfViewerProps {
  pdfUrl: string;
}

export function PdfViewer({ pdfUrl }: PdfViewerProps) {
  const { pdfDoc, numPages, pageDimensions, loading, error } = usePdfDocument(pdfUrl);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const currentPageObserverRef = useRef<IntersectionObserver | null>(null);
  const visibleForCurrentPage = useRef<Set<number>>(new Set());

  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [isFitWidth, setIsFitWidth] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ── Virtual teaching pointer ───────────────────────────────────────────────
  const activePointer = useStudentStore((s) => s.activePointer);
  const getPageEl = useCallback(
    (pageNum: number) => pageRefs.current[pageNum - 1] ?? null,
    []
  );
  const { rect: pointerRect, label: pointerLabel, visible: pointerVisible } =
    usePointerResolver({
      pdfDoc,
      pointer: activePointer,
      getPageEl,
      // Nudge a re-place when the layout shifts the page's offset without
      // resizing it (the ResizeObserver covers size changes on its own).
      recomputeKey: Math.round(containerWidth),
    });

  // Bring a freshly targeted pointer into view (centered), once per new pointer.
  const lastScrolledPointer = useRef<PointerSpec | null>(null);
  useEffect(() => {
    if (!activePointer || !pointerRect) return;
    if (lastScrolledPointer.current === activePointer) return;
    const container = scrollRef.current;
    if (!container) return;
    lastScrolledPointer.current = activePointer;
    const targetTop =
      pointerRect.y - container.clientHeight / 2 + pointerRect.height / 2;
    container.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
  }, [activePointer, pointerRect]);

  // Dev-only hook so the pointer can be driven without a backend (manual/e2e).
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as Record<string, unknown>;
    w.__genedPointer = {
      set: (spec: PointerSpec) => useStudentStore.getState().setPointer(spec),
      clear: () => useStudentStore.getState().clearPointer(),
    };
    return () => {
      delete w.__genedPointer;
    };
  }, []);

  // Measure scroll container width and recompute fit-to-width scale
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? container.clientWidth;
      setContainerWidth(width);
    });
    ro.observe(container);
    setContainerWidth(container.clientWidth);

    return () => ro.disconnect();
  }, []);

  const isCompact = containerWidth > 0 && containerWidth < 480;
  const horizontalPadding = isCompact ? 8 : HORIZONTAL_PADDING;
  const pageGap = isCompact ? 8 : PAGE_GAP;

  // Recompute scale when in fit-to-width mode or container width changes
  useEffect(() => {
    if (!isFitWidth || pageDimensions.length === 0 || containerWidth === 0) return;
    const maxPageWidth = Math.max(...pageDimensions.map((d) => d.width));
    const available = containerWidth - horizontalPadding * 2;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, available / maxPageWidth));
    setScale(newScale);
  }, [isFitWidth, pageDimensions, containerWidth, horizontalPadding]);

  // Set up IntersectionObserver for lazy rendering (large rootMargin — pre-loads nearby pages)
  useEffect(() => {
    if (numPages === 0 || !scrollRef.current) return;

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        setVisiblePages((prev) => {
          const next = new Set(prev);
          entries.forEach((entry) => {
            const page = Number((entry.target as HTMLElement).dataset.page);
            if (!page) return;
            if (entry.isIntersecting) next.add(page);
            else next.delete(page);
          });
          return next;
        });
      },
      {
        root: scrollRef.current,
        rootMargin: "200% 0px",
        threshold: 0,
      }
    );

    // Separate observer for current page tracking — tight margin, maintains its own visible set
    currentPageObserverRef.current?.disconnect();
    visibleForCurrentPage.current.clear();
    currentPageObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const page = Number((entry.target as HTMLElement).dataset.page);
          if (!page) return;
          if (entry.isIntersecting) visibleForCurrentPage.current.add(page);
          else visibleForCurrentPage.current.delete(page);
        });
        const sorted = Array.from(visibleForCurrentPage.current).sort((a, b) => a - b);
        if (sorted.length > 0) setCurrentPage(sorted[0]);
      },
      {
        root: scrollRef.current,
        rootMargin: "0px",
        threshold: 0,
      }
    );

    pageRefs.current.forEach((el) => {
      if (el) {
        observerRef.current!.observe(el);
        currentPageObserverRef.current!.observe(el);
      }
    });

    const initial = new Set<number>([1]);
    if (numPages > 1) initial.add(2);
    setVisiblePages(initial);

    return () => {
      observerRef.current?.disconnect();
      currentPageObserverRef.current?.disconnect();
    };
  }, [numPages]);

  const setPageRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    pageRefs.current[index] = el;
    if (el) {
      if (observerRef.current) observerRef.current.observe(el);
      if (currentPageObserverRef.current) currentPageObserverRef.current.observe(el);
    }
  }, []);

  const scrollToPage = useCallback((pageNum: number) => {
    const el = pageRefs.current[pageNum - 1];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handlePrevPage = useCallback(() => scrollToPage(Math.max(1, currentPage - 1)), [currentPage, scrollToPage]);
  const handleNextPage = useCallback(() => scrollToPage(Math.min(numPages, currentPage + 1)), [currentPage, numPages, scrollToPage]);

  const handleZoomIn = useCallback(() => {
    setIsFitWidth(false);
    setScale((s) => Math.min(MAX_SCALE, parseFloat((s + ZOOM_STEP).toFixed(2))));
  }, []);

  const handleZoomOut = useCallback(() => {
    setIsFitWidth(false);
    setScale((s) => Math.max(MIN_SCALE, parseFloat((s - ZOOM_STEP).toFixed(2))));
  }, []);

  const handleToggleSidebar = useCallback(() => setIsSidebarOpen((v) => !v), []);

  const handleSidebarPageSelect = useCallback((page: number) => {
    scrollToPage(page);
  }, [scrollToPage]);

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3" style={{ background: "#F7F8FC" }}>
        <div
          style={{
            width: 28,
            height: 28,
            border: "3px solid #EDE9FE",
            borderTopColor: "var(--tutor)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ fontSize: 13, color: "#64748B", fontFamily: "var(--font-body)", margin: 0 }}>
          Loading textbook…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3" style={{ background: "#F7F8FC" }}>
        <p style={{ fontSize: 13, color: "#EF4444", fontFamily: "var(--font-body)", margin: 0 }}>
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--tutor)",
            background: "#EDE9FE",
            border: "none",
            borderRadius: 8,
            padding: "6px 14px",
            cursor: "pointer",
            fontFamily: "var(--font-body)",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Main viewer ──────────────────────────────────────────────────────────────
  return (
    <>
      <PdfToolbar
        currentPage={currentPage}
        numPages={numPages}
        scale={scale}
        isSidebarOpen={isSidebarOpen}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onToggleSidebar={handleToggleSidebar}
      />

      {/* Body: optional sidebar + page scroll area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnail sidebar — hidden on narrow/mobile panels */}
        {isSidebarOpen && pdfDoc && !isCompact && (
          <PdfSidebar
            pdfDoc={pdfDoc}
            numPages={numPages}
            pageDimensions={pageDimensions}
            currentPage={currentPage}
            onPageSelect={handleSidebarPageSelect}
          />
        )}

        {/* Main scroll area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ background: "#F7F8FC", padding: `${pageGap}px ${horizontalPadding}px` }}
        >
          <div className="flex flex-col" style={{ gap: pageGap, alignItems: "center", position: "relative" }}>
            {pdfDoc &&
              pageDimensions.map((dim, i) => {
                const pageNum = i + 1;
                return (
                  <PdfPage
                    key={pageNum}
                    pdfDoc={pdfDoc}
                    pageNumber={pageNum}
                    scale={scale}
                    isVisible={visiblePages.has(pageNum)}
                    width={dim.width}
                    height={dim.height}
                    pageRef={setPageRef(i)}
                  />
                );
              })}

            {/* Virtual teaching pointer overlay (shares the page coordinate space) */}
            <PointerOverlay rect={pointerRect} label={pointerLabel} visible={pointerVisible} />
          </div>
        </div>
      </div>
    </>
  );
}
