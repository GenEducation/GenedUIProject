"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useTaxonomySubjects } from "@/features/subjects/subjectCatalog";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

interface InviteStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (studentEmailOrUsername: string, subject: string) => Promise<void>;
}

export function InviteStudentModal({ isOpen, onClose, onInvite }: InviteStudentModalProps) {
  const [identifier, setIdentifier] = useState("");
  const catalog = useTaxonomySubjects();
  const subjects = useMemo(
    () => Array.from(new Set(catalog.map((entry) => entry.name))),
    [catalog],
  );
  const [subject, setSubject] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subject && subjects.length > 0) setSubject(subjects[0]);
  }, [subject, subjects]);

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
      setSubject(subjects[0] ?? "");
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
            className="fixed inset-0 z-[100] bg-navy/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 z-[101] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-white shadow-xl"
          >
            <div className="px-6 pt-6">
              <h3 className="font-serif text-2xl font-semibold text-ink">Invite a student</h3>
              <p className="mt-1 text-[13.5px] text-muted">
                Sends a request — the student joins your class once approved.
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="mb-4">
                <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">
                  Student email or username
                </label>
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. student@school.com"
                  className="w-full rounded-xl border border-border bg-paper px-3.5 py-3 text-sm text-ink outline-none transition-colors focus:border-emerald focus:bg-white focus:ring-4 focus:ring-emerald/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Subject</label>
                <Select
                  aria-label="Subject"
                  value={subject}
                  onChange={setSubject}
                  options={subjects.map((s) => ({ value: s, label: s }))}
                  buttonStyle={{
                    background: "var(--paper)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    color: "var(--ink)",
                  }}
                />
              </div>
              {error && (
                <p className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-[12.5px] font-medium text-danger-ink">
                  {error}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2.5 bg-paper px-6 py-4">
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button variant="primary" loading={isSubmitting} onClick={handleSend}>
                Send invite
              </Button>
            </div>
            <Button iconOnly size="sm" variant="tertiary" className="absolute right-4 top-4" aria-label="Close" onClick={handleClose} disabled={isSubmitting}>
              <X size={18} />
            </Button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
