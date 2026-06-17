"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Remove",
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isLoading ? undefined : onClose}
            className="fixed inset-0 z-[100] bg-[#04142899] backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed left-1/2 top-1/2 z-[101] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.5rem] bg-white shadow-[0_24px_60px_rgba(4,46,92,.22)]"
          >
            <div className="flex flex-col items-center p-8 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fdeeea] text-[#E1604B]">
                <AlertTriangle size={28} />
              </div>
              <h3 className="font-serif text-xl font-semibold text-[#042E5C]">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6b7d91]">{message}</p>
              <div className="mt-7 flex w-full flex-col gap-2.5">
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E1604B] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#E1604B]/20 transition-all hover:bg-[#c84f3b] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Removing…
                    </>
                  ) : (
                    confirmLabel
                  )}
                </button>
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="w-full rounded-xl bg-[#F8F9FA] py-3.5 text-sm font-bold text-[#6b7d91] transition-all hover:bg-[#eef2f6] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
            {!isLoading && (
              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-2 text-[#cbd5e1] transition-colors hover:text-[#94a3b8]"
              >
                <X size={18} />
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
