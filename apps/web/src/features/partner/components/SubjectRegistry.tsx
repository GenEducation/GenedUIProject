"use client";

import React from "react";
import { Plus, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { usePartnerStore } from "../store/usePartnerStore";

interface SubjectRegistryProps {
  onUploadClick: () => void;
}

export function SubjectRegistry({ onUploadClick }: SubjectRegistryProps) {
  const subjects = usePartnerStore((state) => state.subjects);

  return (
    <div className="flex-1 px-4 md:px-12 pt-8 md:pt-12 pb-8 bg-white flex flex-col h-full overflow-hidden">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start gap-6 md:gap-0 mb-8 md:mb-12">
        <div className="space-y-3 md:space-y-4 max-w-2xl">
          <p className="text-[10px] font-black text-[#1A3D2C]/40 uppercase tracking-[0.2em]">
            Academic Registry
          </p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-[#1A3D2C] tracking-tight">
            Subject Registry List
          </h2>
          <p className="text-[#1A3D2C]/60 text-xs md:text-sm leading-relaxed font-medium">
            Your comprehensive index of active curricula. Review academic subjects and their assigned grade levels.
          </p>
        </div>
        
        <button 
          onClick={onUploadClick}
          className="w-full md:w-auto flex items-center justify-center gap-3 px-6 py-3 bg-[#1A3D2C] text-white rounded-2xl hover:bg-[#1A3D2C]/90 transition-all shadow-[0_8px_30px_rgba(26,61,44,0.2)] group"
        >
          <div className="bg-white/10 p-1 rounded-lg">
            <Plus size={18} />
          </div>
          <span className="text-sm font-bold tracking-tight">Upload Curriculum</span>
        </button>
      </header>

      {/* Registry List */}
      <div className="flex-1 flex flex-col bg-[#FBFCFB] rounded-[2rem] md:rounded-[2.5rem] p-3 md:p-4 border border-gray-100/50 shadow-[0_8px_40px_rgba(0,0,0,0.02)] min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-hide pr-1 md:pr-2">
          <div className="space-y-2 md:space-y-3">
          {subjects.map((subject, i) => {
            const isActive = subject.status === "active";
            const isProcessing = subject.status === "in-progress";
            const isFailed = subject.status === "failed";

            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative flex items-center justify-between p-4 md:p-6 bg-white rounded-2xl md:rounded-3xl border border-transparent hover:border-[#1A3D2C]/5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] transition-all cursor-pointer overflow-hidden"
              >
                <div className="flex-1 flex items-center gap-4 md:gap-6">
                  {/* Left Side Highlight bar */}
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#1A3D2C] opacity-0 group-hover:opacity-100 transition-opacity rounded-r-full" />
                  
                  {/* Subject Details */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between pr-4">
                      <div>
                        <h3 className="text-base md:text-lg font-bold text-[#1A3D2C] tracking-tight group-hover:translate-x-1 transition-transform">
                          {subject.name}
                        </h3>
                        <p className="text-[11px] font-bold text-[#1A3D2C]/40 flex items-center gap-2 mt-0.5 group-hover:translate-x-1 transition-transform">
                          <span>Grade {subject.grade}</span>
                          <span className="w-1 h-1 rounded-full bg-[#1A3D2C]/10" />
                          <span>{subject.chapters ?? 0} Chapters</span>
                        </p>
                      </div>
                      <span 
                        className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${
                          isActive ? "bg-[#D1E6D9]/30 text-[#1A3D2C] border-[#1A3D2C]/5" :
                          isProcessing ? "bg-amber-50 text-amber-600 border-amber-200" :
                          "bg-red-50 text-red-600 border-red-200"
                        }`}
                      >
                        {subject.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar for in-progress */}
                {isProcessing && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#D1E6D9]/20 overflow-hidden">
                    <motion.div 
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="h-full w-1/2 bg-[#1A3D2C]"
                    />
                  </div>
                )}

                {/* Action Icon */}
                <div className="ml-4 w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-[#1A3D2C]/5 group-hover:text-[#1A3D2C] transition-all shrink-0">
                  <ChevronRight size={16} />
                </div>
              </motion.div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}
