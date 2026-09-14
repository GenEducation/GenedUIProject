"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, BookOpen, GraduationCap } from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { SessionType } from "@/features/student/types/schedule";
import { bookingWindowEnd, tomorrowDateString } from "@/utils/datetime";
import { Button } from "@/components/ui/Button";

export interface RescheduleModalTarget {
  id: string; // scheduled_session row id
  sessionType: SessionType;
  subject: string;
  topic: string | null;
}

interface RescheduleModalProps {
  isOpen: boolean;
  target: RescheduleModalTarget | null;
  onClose: () => void;
  onConfirm: (scheduledDate: string, scheduledTime: string) => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
  themeColor?: string; // default "#042E5C"
}

export function RescheduleModal({
  isOpen,
  target,
  onClose,
  onConfirm,
  isSubmitting,
  errorMessage,
  themeColor = "#042E5C",
}: RescheduleModalProps) {
  const [scheduledDate, setScheduledDate] = useState(tomorrowDateString());
  const [scheduledTime, setScheduledTime] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setScheduledDate(tomorrowDateString());
      setScheduledTime("");
      setAttempted(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const handleConfirm = () => {
    if (!scheduledDate) return;
    setAttempted(true);
    onConfirm(scheduledDate, scheduledTime);
  };

  // Allow closing with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  return (
    <AnimatePresence>
      {isOpen && target && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
          />

          {/* Modal Container */}
          <div 
            className="fixed inset-0 z-[101] overflow-y-auto p-4 sm:p-6"
            onClick={handleClose}
          >
            <div className="flex min-h-full items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="w-full max-w-md bg-white rounded-[32px] shadow-2xl border flex flex-col pointer-events-auto my-auto"
                style={{ borderColor: `${themeColor}1a` }}
                onClick={(e) => e.stopPropagation()}
              >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: `${themeColor}1a` }}>
                <h3 className="text-xl font-black" style={{ color: themeColor }}>Reschedule Session</h3>
                <Button iconOnly size="sm" variant="tertiary" aria-label="Close" onClick={handleClose} disabled={isSubmitting} style={{ color: `${themeColor}4d` }} onMouseEnter={(e) => { if (!isSubmitting) { e.currentTarget.style.backgroundColor = `${themeColor}0d`; e.currentTarget.style.color = themeColor; } }} onMouseLeave={(e) => { if (!isSubmitting) { e.currentTarget.style.backgroundColor = ""; e.currentTarget.style.color = `${themeColor}4d`; } }}>
                  <X size={20} />
                </Button>
              </div>

              <div className="p-6 space-y-6 relative z-10">
                {/* Context Block (Read-only) */}
                <div className="rounded-2xl p-4 space-y-2" style={{ backgroundColor: `${themeColor}0d` }}>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-black truncate" style={{ color: themeColor }}>
                      {target.topic || target.subject}
                    </h4>
                    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white shadow-sm" style={{ color: themeColor }}>
                      {target.sessionType === "TEST" ? <GraduationCap size={10} /> : <BookOpen size={10} />}
                      {target.sessionType}
                    </span>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${themeColor}66` }}>
                    {target.subject}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Date Picker */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${themeColor}66` }}>
                      New Date
                    </label>
                    <DatePicker
                      value={scheduledDate}
                      min={tomorrowDateString()}
                      max={bookingWindowEnd()}
                      onChange={setScheduledDate}
                      accentColor={themeColor}
                    />
                  </div>

                  {/* Time Input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${themeColor}66` }}>
                      New Start Time <span className="font-medium normal-case">(optional, IST)</span>
                    </label>
                    <TimePicker
                      value={scheduledTime}
                      onChange={setScheduledTime}
                      accentColor={themeColor}
                    />
                  </div>
                </div>

                {/* Error Banner */}
                {attempted && errorMessage && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-50 text-red-600 text-sm font-medium">
                    <AlertTriangle size={16} className="shrink-0" />
                    {errorMessage}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t flex gap-3 rounded-b-[32px]" style={{ borderColor: `${themeColor}1a`, backgroundColor: `${themeColor}05` }}>
                {/*
                  `themeColor` still tints this dialog's chrome (border, header,
                  footer wash) but no longer fills these buttons: subject colours
                  may tint icons, progress bars, and card headers, never a button
                  fill. Hover/active come from the component now — this pair used
                  hand-written onMouseEnter/Leave handlers, which never fired for
                  keyboard users.
                */}
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  disabled={isSubmitting}
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-[2]"
                  loading={isSubmitting}
                  disabled={!scheduledDate}
                  onClick={handleConfirm}
                >
                  Confirm Reschedule
                </Button>
              </div>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
