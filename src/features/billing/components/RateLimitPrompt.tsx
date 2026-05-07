"use client";

import React from "react";
import { X, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { UpgradeButton } from "../UpgradeButton";

interface RateLimitPromptProps {
  isVisible: boolean;
  onClose: () => void;
}

export const RateLimitPrompt: React.FC<RateLimitPromptProps> = ({ isVisible, onClose }) => {
  const { studentProfile } = useStudentStore();

  if (!studentProfile) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 z-50 w-full max-w-4xl px-4"
        >
          <div className="relative overflow-hidden bg-[#042E5C] rounded-[2rem] shadow-[0_30px_60px_rgba(4,46,92,0.4)] border border-white/10 p-6 pr-14">
            {/* Decorative background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#03b1ed]/10 blur-[60px] pointer-events-none" />

            <button 
              onClick={onClose}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/30 hover:text-white"
            >
              <X size={16} strokeWidth={2.5} />
            </button>

            <div className="flex items-center gap-8">
              <div className="flex flex-1 items-center gap-5">
                <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-inner">
                  <img src="/Favicon1.jpg" alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h4 className="text-[17px] font-black text-white leading-tight tracking-tight uppercase">
                    Daily Limit Reached
                  </h4>
                  <p className="text-[13px] text-white/70 mt-1 font-medium leading-relaxed max-w-md">
                    You've reached your 15-message limit on the Free plan.
                  </p>
                </div>
              </div>

              <div className="w-px h-12 bg-white/10 shrink-0" />

              <div className="shrink-0 min-w-[200px]">
                <UpgradeButton
                  userId={studentProfile.user_id}
                  userName={studentProfile.username}
                  userEmail={studentProfile.email}
                  className="w-full justify-center py-4 bg-[#059F6D] hover:bg-[#048b5f] text-white text-[13px] font-black uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-[#059F6D]/30 transition-all active:scale-[0.96] border border-white/10"
                >
                  Unlock Pro
                </UpgradeButton>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
