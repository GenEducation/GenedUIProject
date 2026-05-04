"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, FileText, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PageWisePreviewProps {
  file: File;
}

export function PageWisePreview({ file }: PageWisePreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    // We don't know total pages without a heavy lib, so we just increment
    setCurrentPage(currentPage + 1);
  };

  if (!fileUrl) return null;

  return (
    <div className="flex flex-col h-full bg-[#F8FBF9] rounded-[2rem] border border-[#1A3D2C]/5 overflow-hidden shadow-inner">
      {/* Viewer Header */}
      <div className="shrink-0 p-4 border-b border-[#1A3D2C]/5 bg-white/50 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1A3D2C] text-white rounded-lg flex items-center justify-center">
            <FileText size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black text-[#1A3D2C]/40 uppercase tracking-widest">Previewing</p>
            <p className="text-xs font-bold text-[#1A3D2C] truncate max-w-[200px]">{file.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={() => window.open(fileUrl, '_blank')}
             className="p-2 text-[#1A3D2C]/40 hover:text-[#1A3D2C] hover:bg-white rounded-lg transition-all"
             title="Open Original"
           >
             <Maximize2 size={16} />
           </button>
        </div>
      </div>

      {/* PDF Viewport */}
      <div className="flex-1 flex items-center justify-center bg-gray-50/50 p-2 min-h-0">
        <div className="relative h-full aspect-[1/1.414] max-w-[800px] bg-white shadow-2xl rounded-lg overflow-hidden group">
          <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ width: 'calc(100% + 40px)', height: 'calc(100% + 40px)', margin: '-20px' }}>
            <iframe 
              key={currentPage}
              src={`${fileUrl}#page=${currentPage}&toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
              className="w-full h-full border-none"
              title="Document Preview"
            />
          </div>
          
        </div>
      </div>
      {/* Pagination Footer */}
      <div className="shrink-0 p-6 bg-white border-t border-[#1A3D2C]/5 flex items-center justify-between">
        <button 
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          className="w-14 h-14 flex items-center justify-center rounded-2xl bg-[#F8F9F8] text-[#1A3D2C]/40 hover:text-[#1A3D2C] hover:bg-[#D1E6D9]/30 disabled:opacity-30 transition-all shadow-sm"
        >
          <ChevronLeft size={28} />
        </button>
        
        <div className="flex flex-col items-center min-w-[60px]">
          <span className="text-[10px] font-black text-[#1A3D2C]/40 uppercase tracking-widest">Page</span>
          <span className="text-lg font-black text-[#1A3D2C]">{currentPage}</span>
        </div>

        <button 
          onClick={handleNextPage}
          className="w-14 h-14 flex items-center justify-center rounded-2xl bg-[#F8F9F8] text-[#1A3D2C]/40 hover:text-[#1A3D2C] hover:bg-[#D1E6D9]/30 transition-all shadow-sm"
        >
          <ChevronRight size={28} />
        </button>
      </div>
    </div>
  );
}
