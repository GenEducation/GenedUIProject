"use client";

import { FileText, X, AlertTriangle } from "lucide-react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { usePartnerStore } from "../store/usePartnerStore";

// Dynamic import with ssr:false prevents pdfjs-dist from being evaluated on the
// server (it uses browser-only APIs like DOMMatrix that don't exist in Node.js).
const PdfViewer = dynamic(
  () => import("@/features/student/components/pdf-viewer").then((m) => m.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center flex-1 gap-3">
        <div
          className="rounded-full animate-spin"
          style={{ width: 28, height: 28, border: "3px solid #D1E6D9", borderTopColor: "#1A3D2C" }}
        />
        <p className="text-xs font-bold text-[#1A3D2C]/50">Loading PDF…</p>
      </div>
    ),
  }
);

export function IngestedPdfViewer() {
  const viewerPdfUrl = usePartnerStore((state) => state.viewerPdfUrl);
  const viewerTitle = usePartnerStore((state) => state.viewerTitle);
  const isViewerLoading = usePartnerStore((state) => state.isViewerLoading);
  const viewerError = usePartnerStore((state) => state.viewerError);
  const closePdfViewer = usePartnerStore((state) => state.closePdfViewer);

  const isOpen = isViewerLoading || !!viewerPdfUrl || !!viewerError;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 md:p-8"
          onClick={closePdfViewer}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col w-full h-full max-w-4xl bg-white rounded-[1.75rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0 px-4 md:px-5 py-3 bg-[#FBFCFB] border-b border-[#1A3D2C]/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 flex items-center justify-center rounded-xl bg-[#1A3D2C]/5 w-9 h-9">
                  <FileText size={16} className="text-[#1A3D2C]" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#1A3D2C] tracking-tight">
                    {viewerTitle || "Document"}
                  </p>
                  <p className="text-[10px] font-black text-[#1A3D2C]/40 uppercase tracking-widest">
                    Ingested Curriculum
                  </p>
                </div>
              </div>

              <button
                onClick={closePdfViewer}
                title="Close"
                className="flex items-center justify-center rounded-xl transition-colors hover:bg-[#1A3D2C]/5 flex-shrink-0 w-9 h-9 text-[#1A3D2C]/50"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#F8F9F8]">
              {isViewerLoading && (
                <div className="flex flex-col items-center justify-center flex-1 gap-3">
                  <div
                    className="rounded-full animate-spin"
                    style={{ width: 28, height: 28, border: "3px solid #D1E6D9", borderTopColor: "#1A3D2C" }}
                  />
                  <p className="text-xs font-bold text-[#1A3D2C]/50">Fetching document…</p>
                </div>
              )}

              {!isViewerLoading && viewerError && (
                <div className="flex flex-col items-center justify-center flex-1 gap-3 px-6 text-center">
                  <div className="flex items-center justify-center rounded-full bg-red-50 w-12 h-12">
                    <AlertTriangle size={20} className="text-red-500" />
                  </div>
                  <p className="text-sm font-bold text-[#1A3D2C]">Couldn&apos;t load PDF</p>
                  <p className="text-xs font-medium text-[#1A3D2C]/50 max-w-sm">{viewerError}</p>
                </div>
              )}

              {!isViewerLoading && !viewerError && viewerPdfUrl && (
                <PdfViewer pdfUrl={viewerPdfUrl} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
