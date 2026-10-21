"use client";

import React, { useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserMinus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface UnlinkConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  studentName: string;
}

/** Confirms removing a child from the parent's account. Escape or the backdrop cancels. */
export function UnlinkConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  studentName
}: UnlinkConfirmationModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-[#122D30]/45 backdrop-blur-sm"
          />

          <div className="pointer-events-none fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={titleId}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="pointer-events-auto relative w-full max-w-[420px] overflow-hidden rounded-[28px] border border-white/80 bg-[#F5FAF9] p-6 shadow-[0_40px_90px_-30px_rgba(18,45,48,0.55)] sm:p-7"
            >
              {/* Button sets its own position, so the wrapper places it */}
              <div className="absolute right-4 top-4">
                <Button iconOnly size="sm" variant="tertiary" aria-label="Close" onClick={onClose}>
                  <X size={18} />
                </Button>
              </div>

              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FCDDE7] text-[#C02659]">
                <UserMinus size={26} strokeWidth={2.3} />
              </span>

              <h3 id={titleId} className="mt-5 text-[22px] font-extrabold leading-tight tracking-[-0.01em] text-[#122D30]">
                Remove <span>{studentName}</span>?
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#5E7477]">
                You&apos;ll stop seeing their progress, reports and chats straight away. To reconnect later, they&apos;ll need to send you a new invite.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button variant="outline" size="lg" fullWidth onClick={onClose} autoFocus>
                  Keep
                </Button>
                <Button
                  variant="destructiveSolid"
                  size="lg"
                  fullWidth
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                >
                  Unlink
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
