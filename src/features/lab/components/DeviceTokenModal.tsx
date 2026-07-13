"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, KeyRound, TriangleAlert } from "lucide-react";

interface DeviceTokenModalProps {
  isOpen: boolean;
  deviceLabel: string;
  token: string;
  onClose: () => void;
}

export function DeviceTokenModal({ isOpen, deviceLabel, token, onClose }: DeviceTokenModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#04142899] backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed left-1/2 top-1/2 z-[101] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.5rem] bg-white shadow-[0_24px_60px_rgba(4,46,92,.22)]"
          >
            <div className="flex flex-col items-center p-8 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E5F2E9] text-[#1A3D2C]">
                <KeyRound size={28} />
              </div>
              <h3 className="font-serif text-xl font-semibold text-[#1A3D2C]">Device token for {deviceLabel}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#1A3D2C]/60">
                Flash this token onto the physical device now. For security, it is shown{" "}
                <strong>only once</strong> and cannot be retrieved again — if lost, rotate it.
              </p>

              <div className="mt-5 flex w-full items-center gap-2 rounded-xl bg-[#F4F3EE] p-3">
                <code className="flex-1 truncate text-left font-mono text-[13px] text-[#1A3D2C]">{token}</code>
                <button
                  onClick={handleCopy}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1A3D2C] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#0f2a1d]"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-xl bg-danger-bg p-3 text-left text-[12px] text-danger-ink">
                <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                <span>You will not be able to see this token again after closing this dialog.</span>
              </div>

              <button
                onClick={onClose}
                className="mt-6 w-full rounded-xl bg-[#1A3D2C] py-3.5 text-sm font-bold text-white transition-all hover:bg-[#0f2a1d]"
              >
                I&apos;ve copied the token — close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
