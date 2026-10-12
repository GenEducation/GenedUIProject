"use client";

import React from "react";
import { X, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { UpgradeButton } from "../UpgradeButton";
import { Button } from "@/components/ui/Button";
import { GenEdLogo } from "@/components/shared/GenEdLogo";

interface RateLimitPromptProps {
  isVisible: boolean;
  onClose: () => void;
}

export const RateLimitPrompt: React.FC<RateLimitPromptProps> = ({ isVisible, onClose }) => {
  const { studentProfile, rateLimitMessage } = useStudentStore();

  console.log("🎙️ [RateLimitPrompt] Rendering:", {
    isVisible,
    hasProfile: !!studentProfile,
    rateLimitMessage,
  });

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
          <div className="relative overflow-hidden bg-[#122D30] rounded-[2rem] shadow-[0_30px_60px_rgba(18,45,48,0.4)] border border-white/10 p-6 pr-14">
            {/* Decorative background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#03b1ed]/10 blur-[60px] pointer-events-none" />

            <Button iconOnly size="sm" variant="tertiary" className="absolute top-6 right-6" aria-label="Close" onClick={onClose}>
              <X size={16} strokeWidth={2.5} />
            </Button>

            <div className="flex items-center gap-8">
              <div className="flex flex-1 items-center gap-5">
                <div className="shrink-0">
                  <GenEdLogo variant="mark" onDark height={56} />
                </div>
                <div className="flex-1">
                  <h4 className="text-[17px] font-black text-white leading-tight tracking-tight uppercase">
                    Daily Limit Reached
                  </h4>
                  <p className="text-[13px] text-white/70 mt-1 font-medium leading-relaxed max-w-md">
                    {rateLimitMessage || "You've reached your daily message limit."}
                  </p>
                </div>
              </div>

              {studentProfile.plan !== "PRO" && (
                <>
                  <div className="w-px h-12 bg-white/10 shrink-0" />

                  <div className="shrink-0 min-w-[200px]">
                    <UpgradeButton
                      userId={studentProfile.user_id}
                      userName={studentProfile.username}
                      userEmail={studentProfile.email}
                      className="w-full justify-center py-4 bg-[#075E63] hover:bg-[#064C50] text-white text-[13px] font-black uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-[#075E63]/30 transition-all active:scale-[0.96] border border-white/10"
                    >
                      Unlock Pro
                    </UpgradeButton>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
