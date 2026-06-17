"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, AlertTriangle, X } from "lucide-react";

export interface ToastItem {
  id: number;
  type: "success" | "error";
  title: string;
  description?: string;
  code?: string;
}

interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[200] flex flex-col gap-2.5">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.code ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [toast.id, toast.code, onDismiss]);

  const isError = toast.type === "error";

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className={`pointer-events-auto flex w-[320px] max-w-[90vw] items-start gap-3 rounded-xl border bg-white p-4 shadow-[0_24px_60px_rgba(4,46,92,.22)] ${
        isError ? "border-l-4 border-l-[#E1604B] border-[#e6ecf2]" : "border-l-4 border-l-[#059F6D] border-[#e6ecf2]"
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-white ${
          isError ? "bg-[#E1604B]" : "bg-[#059F6D]"
        }`}
      >
        {isError ? <AlertTriangle size={12} /> : <Check size={12} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-bold text-[#042E5C]">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#6b7d91]">{toast.description}</p>
        )}
        {toast.code && (
          <span className="mt-1.5 inline-block rounded-md bg-[#fdeeea] px-1.5 py-0.5 font-mono text-[10.5px] text-[#b3411f]">
            error_code: {toast.code}
          </span>
        )}
      </div>
      <button onClick={() => onDismiss(toast.id)} className="flex-none text-[#94a3b8] hover:text-[#6b7d91]">
        <X size={14} />
      </button>
    </motion.div>
  );
}
