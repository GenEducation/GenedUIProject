"use client";

import { motion } from "framer-motion";
import { X, UserPlus, Check, Trash2 } from "lucide-react";

interface StudentDetailsModalProps {
  studentName: string;
  grade: string;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
}

export function StudentDetailsModal({
  studentName,
  grade,
  onClose,
  onAccept,
  onReject,
}: StudentDetailsModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 bg-[#1A3D2C]/20 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-sm md:max-w-md bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_70px_rgba(26,61,44,0.15)] p-6 md:p-10 flex flex-col items-center text-center space-y-4 md:space-y-8"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 md:top-8 md:right-8 p-2 text-gray-300 hover:text-[#1A3D2C] hover:bg-gray-50 rounded-xl transition-all"
        >
          <X size={20} />
        </button>

        {/* Profile Icon */}
        <div className="w-14 h-14 md:w-20 md:h-20 bg-[#D1E6D9] rounded-[1.25rem] md:rounded-[2rem] flex items-center justify-center text-[#1A3D2C] shadow-sm">
          <UserPlus size={24} />
        </div>

        {/* Student Info */}
        <div className="space-y-1 md:space-y-2">
          <h3 className="text-xl md:text-2xl font-black text-[#1A3D2C] tracking-tight">{studentName}</h3>
          <span className="inline-block px-3 py-1 bg-[#F8F9F8] text-[#1A3D2C]/40 text-[8px] md:text-[9px] font-black uppercase tracking-widest rounded-full border border-[#1A3D2C]/5">
            {grade}
          </span>
        </div>

        {/* Actions */}
        <div className="w-full space-y-2 md:space-y-3">
          <button 
            onClick={onAccept}
            className="w-full flex items-center justify-center gap-2 md:gap-3 py-3 md:py-4 bg-[#1A3D2C] text-white rounded-xl md:rounded-2xl hover:bg-[#1A3D2C]/90 transition-all font-bold shadow-lg shadow-[#1A3D2C]/10 text-sm md:text-base"
          >
            <Check size={18} />
            <span>Accept Request</span>
          </button>
          <button 
            onClick={onReject}
            className="w-full flex items-center justify-center gap-2 md:gap-3 py-3.5 md:py-4 bg-white text-red-500 border border-red-50 rounded-xl md:rounded-2xl hover:bg-red-50 transition-all font-bold text-sm md:text-base"
          >
            <X size={18} />
            <span>Reject Request</span>
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-[9px] md:text-[10px] font-bold text-[#1A3D2C]/30 leading-relaxed max-w-[180px] md:max-w-[200px]">
          Decisions are final and will notify the student immediately.
        </p>
      </motion.div>
    </div>
  );
}
