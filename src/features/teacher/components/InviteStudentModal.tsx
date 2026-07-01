"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { SUBJECTS } from "../constants";

interface InviteStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (studentEmailOrUsername: string, subject: string) => Promise<void>;
}

export function InviteStudentModal({ isOpen, onClose, onInvite }: InviteStudentModalProps) {
  const [identifier, setIdentifier] = useState("");
  const [subject, setSubject] = useState<string>(SUBJECTS[1]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!identifier.trim()) {
      setError("Enter a student's email or username.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onInvite(identifier.trim(), subject);
      setIdentifier("");
      setSubject(SUBJECTS[1] as string);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[100] bg-[#04142899] backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed left-1/2 top-1/2 z-[101] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.5rem] bg-white shadow-[0_24px_60px_rgba(4,46,92,.22)]"
          >
            <div className="px-6 pt-6">
              <h3 className="font-serif text-2xl font-semibold text-[#042E5C]">Invite a student</h3>
              <p className="mt-1 text-[13.5px] text-[#6b7d91]">
                Sends a request — the student joins your class once approved.
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="mb-4">
                <label className="mb-1.5 block text-[12.5px] font-semibold text-[#1c2b3a]">
                  Student email or username
                </label>
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. student@school.com"
                  className="w-full rounded-xl border border-[#e6ecf2] bg-[#F8F9FA] px-3.5 py-3 text-sm text-[#1c2b3a] outline-none transition-colors focus:border-[#059F6D] focus:bg-white focus:ring-4 focus:ring-[#059F6D]/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-[#1c2b3a]">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-[#e6ecf2] bg-[#F8F9FA] bg-[length:12px] bg-[right_14px_center] bg-no-repeat px-3.5 py-3 text-sm font-medium text-[#1c2b3a] outline-none transition-colors focus:border-[#059F6D] focus:bg-white"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7d91' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
                  }}
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {error && (
                <p className="mt-3 rounded-lg bg-[#fdeeea] px-3 py-2 text-[12.5px] font-medium text-[#c0492c]">
                  {error}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2.5 bg-[#F8F9FA] px-6 py-4">
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="rounded-xl border border-[#e6ecf2] bg-white px-4 py-2.5 text-sm font-semibold text-[#1c2b3a] transition-colors hover:bg-[#eef2f6] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-[#059F6D] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#059F6D]/20 transition-colors hover:bg-[#048a5d] disabled:opacity-70"
              >
                {isSubmitting && <Loader2 size={15} className="animate-spin" />}
                Send invite
              </button>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="absolute right-4 top-4 p-2 text-[#cbd5e1] transition-colors hover:text-[#94a3b8]"
            >
              <X size={18} />
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
