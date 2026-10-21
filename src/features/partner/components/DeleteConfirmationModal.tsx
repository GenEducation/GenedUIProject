"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isLoading?: boolean;
  error?: string | null;
  /** Defaults suit a delete; override them to confirm some other risky action. */
  confirmLabel?: string;
  cancelLabel?: string;
  /** `caution`: a teal, non-red treatment for actions that redo work rather than destroy it. */
  tone?: "danger" | "caution";
  icon?: LucideIcon;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isLoading = false,
  error = null,
  confirmLabel = "Delete Permanently",
  cancelLabel = "Keep It",
  tone = "danger",
  icon: Icon = AlertTriangle,
}: DeleteConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — not closeable while loading */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isLoading ? undefined : onClose}
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
              <div className={`mb-6 w-16 h-16 rounded-2xl flex items-center justify-center ${tone === "danger" ? "bg-red-50 text-red-500" : "bg-[#075E63]/10 text-[#075E63]"}`}>
                <Icon size={32} />
              </div>

              {/* Text Content */}
              <h3 className="text-xl font-bold text-[#122D30] mb-2">{title}</h3>
              <p className="text-sm text-[#122D30]/60 leading-relaxed mb-8">
                {message}
              </p>

              {/* Error message */}
              {error && (
                <p className="w-full mb-4 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium text-center">
                  {error}
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-col w-full gap-3">
                <Button
                  variant={tone === "danger" ? "destructiveSolid" : "primary"}
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
                  {cancelLabel}
                </Button>
              </div>
            </div>

            {/* Close Button — hidden while loading */}
            {!isLoading && (
              <Button iconOnly size="sm" variant="tertiary" className="absolute top-4 right-4" aria-label="Close" onClick={onClose}>
                <X size={20} />
              </Button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
