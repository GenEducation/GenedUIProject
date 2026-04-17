"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import { useStudentStore } from "../store/useStudentStore";

export function PartnerRequestModal() {
  const { isPartnerModalOpen, setPartnerModalOpen, partnerRequestStatus, partnerRequestMessage } = useStudentStore();

  return (
    <AnimatePresence>
      {isPartnerModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-black/20 z-50 overflow-hidden"
          >
            {/* Header (Optional, but good for closing) */}
            {partnerRequestStatus !== "loading" && (
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setPartnerModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#f4f3ee] flex items-center justify-center text-[#1a3a2a]/60 hover:text-[#1a3a2a] hover:bg-[#1a3a2a]/10 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="p-8 text-center space-y-5">
              {partnerRequestStatus === "loading" && (
                <div className="flex flex-col items-center justify-center space-y-4 py-6">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-[#bce4cc]/30" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-[#2d6a4a] animate-spin" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-[#1a3a2a]">Sending Request</h3>
                  <p className="text-sm text-[#1a3a2a]/60">Please wait while we connect your profile...</p>
                </div>
              )}

              {partnerRequestStatus === "success" && (
                <div className="flex flex-col items-center justify-center space-y-4 py-4">
                  <div className="w-16 h-16 bg-[#bce4cc]/40 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-8 h-8 text-[#2d6a4a]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1a3a2a]">Success!</h3>
                  <p className="text-[#1a3a2a]/60 text-sm max-w-[280px] mx-auto leading-relaxed">
                    {partnerRequestMessage}
                  </p>
                  <button 
                    onClick={() => setPartnerModalOpen(false)}
                    className="w-full mt-6 bg-[#2d6a4a] hover:bg-[#1a3a2a] text-white rounded-2xl py-3 font-bold text-[14px] transition-colors shadow-lg shadow-[#2d6a4a]/20"
                  >
                    Done
                  </button>
                </div>
              )}

              {partnerRequestStatus === "error" && (
                <div className="flex flex-col items-center justify-center space-y-4 py-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1a3a2a] max-w-[280px] mx-auto leading-tight">
                    {partnerRequestMessage}
                  </h3>
                  <button 
                    onClick={() => setPartnerModalOpen(false)}
                    className="w-full mt-6 bg-[#f4f3ee] hover:bg-[#e4e3de] text-[#1a3a2a] rounded-2xl py-3 font-bold text-[14px] transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
