"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X, AlertTriangle } from "lucide-react";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}: DeleteConfirmationModalProps) {
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
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-[2rem] shadow-2xl z-[101] overflow-hidden"
          >
            <div className="p-8 flex flex-col items-center text-center">
              {/* Icon */}
              <div className="mb-6 w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
                <AlertTriangle size={32} />
              </div>

              {/* Text Content */}
              <h3 className="text-xl font-bold text-[#1A3D2C] mb-2">{title}</h3>
              <p className="text-sm text-[#1A3D2C]/60 leading-relaxed mb-8">
                {message}
              </p>

              {/* Actions */}
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={onConfirm}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-red-500/20"
                >
                  Delete Permanently
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-[#F8F9F8] hover:bg-[#F2F3F2] text-[#1A3D2C]/60 rounded-2xl font-bold text-sm transition-all"
                >
                  Keep It
                </button>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-[#1A3D2C]/20 hover:text-[#1A3D2C]/40 transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
