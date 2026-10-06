"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
                <Button
                  variant="destructiveSolid"
                  size="lg"
                  fullWidth
                  loading={isLoading}
                  onClick={onConfirm}
                >
                  {confirmLabel}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  fullWidth
                  disabled={isLoading}
                  onClick={onClose}
                >
                  Cancel
                </Button>
              </div>
            </div>
            {!isLoading && (
              <Button iconOnly size="sm" variant="tertiary" className="absolute right-4 top-4" aria-label="Close" onClick={onClose}>
                <X size={18} />
              </Button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
