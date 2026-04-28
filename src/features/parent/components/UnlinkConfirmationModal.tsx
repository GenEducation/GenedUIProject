"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X, AlertTriangle } from "lucide-react";

interface UnlinkConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  studentName: string;
}

export function UnlinkConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  studentName 
}: UnlinkConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0E1F2B]/60 backdrop-blur-md z-[100]"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center z-[101] p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="w-full max-w-md bg-white rounded-[32px] shadow-[0_40px_100px_rgba(14,31,43,0.3)] overflow-hidden pointer-events-auto border border-[#1a3a2a]/5"
            >
              {/* Top Banner / Icon Area */}
              <div className="bg-red-50 p-8 flex flex-col items-center text-center relative border-b border-red-100/50">
                <button 
                  onClick={onClose}
                  className="absolute top-6 right-6 p-2 rounded-xl hover:bg-white transition-colors text-[#1a3a2a]/30 hover:text-[#1a3a2a]"
                >
                  <X size={20} />
                </button>
                
                <div className="w-20 h-20 rounded-[28px] bg-white flex items-center justify-center text-red-500 shadow-xl shadow-red-500/10 mb-6">
                  <Trash2 size={32} strokeWidth={2.5} />
                </div>
                
                <h3 className="text-2xl font-black text-[#1a3a2a] leading-tight mb-2">Remove Scholar?</h3>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-600 border border-red-200">
                  <AlertTriangle size={12} strokeWidth={3} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Permanent Action</span>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-8 space-y-8">
                <p className="text-[#1a3a2a]/60 text-center text-sm leading-relaxed">
                  Are you sure you want to remove <span className="font-black text-[#1a3a2a] text-base px-2 py-0.5 bg-[#F4F3EE] rounded-lg">{studentName}</span> from your account? This will immediately disconnect your access to their learning analytics and chat history.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={onClose}
                    className="py-4 px-6 rounded-2xl bg-[#F4F3EE] text-[#1a3a2a] text-sm font-black uppercase tracking-widest hover:bg-[#E5F2E9] transition-all active:scale-95"
                  >
                    Keep
                  </button>
                  <button
                    onClick={() => {
                      onConfirm();
                      onClose();
                    }}
                    className="py-4 px-6 rounded-2xl bg-red-500 text-white text-sm font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95"
                  >
                    Unlink
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
