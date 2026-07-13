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
            className="fixed inset-0 z-[100] bg-navy/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 z-[101] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-white shadow-xl"
          >
            <div className="flex flex-col items-center p-8 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-bg text-danger">
                <AlertTriangle size={28} />
              </div>
              <h3 className="font-serif text-xl font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
              <div className="mt-7 flex w-full flex-col gap-2.5">
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-danger py-3.5 text-sm font-bold text-white shadow-lg shadow-danger/20 transition-all hover:bg-[#c84f3b] disabled:cursor-not-allowed disabled:opacity-70"
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
                  className="w-full rounded-xl bg-paper py-3.5 text-sm font-bold text-muted transition-all hover:bg-border disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
            {!isLoading && (
              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-2 text-muted-light transition-colors hover:text-muted"
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
