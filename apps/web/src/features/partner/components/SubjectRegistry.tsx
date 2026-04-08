"use client";

import React from "react";
import { Plus, ChevronRight, Calculator, Microscope, Library, Cpu, Palette } from "lucide-react";
import { motion } from "framer-motion";

interface SubjectRegistryProps {
  onUploadClick: () => void;
}

const SUBJECTS = [
  {
    icon: Calculator,
    name: "Advanced Mathematics",
    chapters: 12,
    units: 48,
    status: "IN PROGRESS",
    statusColor: "text-emerald bg-emerald/5",
  },
  {
    icon: Microscope,
    name: "Molecular Biology",
    chapters: 18,
    units: 72,
    status: "ACTIVE",
    statusColor: "text-emerald bg-emerald/5",
  },
  {
    icon: Library,
    name: "Classical History",
    chapters: 8,
    units: 24,
    status: "ON HOLD",
    statusColor: "text-gray-400 bg-gray-50",
  },
  {
    icon: Cpu,
    name: "Computer Science Fundamentals",
    chapters: 24,
    units: 120,
    status: "IN PROGRESS",
    statusColor: "text-emerald bg-emerald/5",
  },
  {
    icon: Palette,
    name: "Art Theory & Criticism",
    chapters: 10,
    units: 40,
    status: "COMPLETED",
    statusColor: "text-emerald bg-emerald/5",
  },
];

export function SubjectRegistry({ onUploadClick }: SubjectRegistryProps) {
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
            Your comprehensive index of active curricula. Review academic progress,
            chapter distribution, and synchronization status across your scholarship profile.
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
          {SUBJECTS.map((subject, i) => {
            const Icon = subject.icon;
            return (
              <motion.div
                key={subject.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-6 bg-white rounded-2xl md:rounded-3xl border border-transparent hover:border-[#1A3D2C]/5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] transition-all cursor-pointer overflow-hidden gap-4 md:gap-0"
              >
                <div className="flex items-center gap-4 md:gap-6">
                  {/* Left Side Highlight bar */}
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#1A3D2C] opacity-0 group-hover:opacity-100 transition-opacity rounded-r-full" />
                  
                  {/* Subject Icon */}
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-[#D1E6D9]/50 rounded-xl md:rounded-2xl flex items-center justify-center text-[#1A3D2C] shrink-0">
                    <Icon size={20} />
                  </div>

                  {/* Subject Details */}
                  <div className="space-y-1">
                    <h3 className="text-base md:text-lg font-bold text-[#1A3D2C] tracking-tight group-hover:translate-x-1 transition-transform">
                      {subject.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-[9px] md:text-[10px] font-black text-[#1A3D2C]/40 uppercase tracking-widest">
                      <div className="flex items-center gap-1.5">
                        <Plus size={10} className="opacity-40" />
                        <span>{subject.chapters} Chapters</span>
                      </div>
                      <div className="hidden sm:block w-1 h-1 bg-[#1A3D2C]/10 rounded-full" />
                      <div className="flex items-center gap-1.5">
                        <Plus size={10} className="opacity-40" />
                        <span>{subject.units} Units</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status and Action */}
                <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-8 border-t sm:border-0 pt-3 sm:pt-0 border-gray-50">
                  <span className={`
                    px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[8px] md:text-[9px] font-black tracking-[0.1em]
                    ${subject.statusColor}
                  `}>
                    {subject.status}
                  </span>
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-[#1A3D2C]/5 group-hover:text-[#1A3D2C] transition-all">
                    <ChevronRight size={16} />
                  </div>
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
