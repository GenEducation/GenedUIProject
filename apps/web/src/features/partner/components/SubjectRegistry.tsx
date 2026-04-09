"use client";

import React, { useEffect } from "react";
import { Plus, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { usePartnerStore } from "../store/usePartnerStore";

interface SubjectRegistryProps {
  onUploadClick: () => void;
}

export function SubjectRegistry({ onUploadClick }: SubjectRegistryProps) {
  const subjects = usePartnerStore((state) => state.subjects);
  const fetchSubjects = usePartnerStore((state) => state.fetchSubjects);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  return (
    <div className="flex-1 px-4 md:px-12 pt-8 md:pt-12 pb-8 bg-white flex flex-col h-full overflow-hidden">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-0 mb-4 md:mb-6">
        <div className="space-y-1.5 md:space-y-2 max-w-2xl">
          <p className="text-[10px] font-black text-[#1A3D2C]/40 uppercase tracking-[0.2em]">
            Academic Registry
          </p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-[#1A3D2C] tracking-tight">
            Subject Registry List
          </h2>
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
                className="group relative flex items-center justify-between p-3 md:p-4 bg-white rounded-xl md:rounded-2xl border border-transparent hover:border-[#1A3D2C]/5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] transition-all cursor-pointer overflow-hidden"
              >
                <div className="flex-1 flex items-center gap-3 md:gap-4">
                  {/* Left Side Highlight bar */}
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#1A3D2C] opacity-0 group-hover:opacity-100 transition-opacity rounded-r-full" />
                  
                  {/* Subject Details */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between pr-4 w-full">
                      {/* Left: Agent Name & Grade */}
                      <div className="flex flex-col gap-0.5 group-hover:translate-x-1 transition-transform min-w-[140px]">
                        <h3 className="text-base md:text-lg font-bold text-[#1A3D2C] tracking-tight flex items-center gap-2">
                          {subject.agent}
                        </h3>
                        <p className="text-[11px] font-bold text-[#1A3D2C]/50 ml-[28px] uppercase tracking-wider">
                          Grade {subject.grade}
                        </p>
                      </div>

                      {/* Middle: Subject */}
                      <div className="hidden sm:flex flex-1 justify-center">
                        <span className="text-sm font-bold text-[#1A3D2C]/70 bg-[#1A3D2C]/5 px-4 py-1.5 rounded-xl border border-[#1A3D2C]/10">
                          {subject.subject}
                        </span>
                      </div>

                      {/* Right: Status */}
                      <div className="flex shrink-0 justify-end ml-4">
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

              </motion.div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}
