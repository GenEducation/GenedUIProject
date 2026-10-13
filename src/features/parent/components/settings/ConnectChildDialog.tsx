"use client";

import React, { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GenEdLogo } from "@/components/shared/GenEdLogo";
import type { LinkedStudent } from "../../services/parentService";
import { AddChildSteps, RequestRow } from "./linkParts";

// While the popup is open, look for a newly sent invite this often.
const POLL_MS = 15_000;

/**
 * First-run popup for a parent with no child connected yet: the same three
 * steps as Settings, plus any request already waiting, which can be approved
 * right here. It checks for new invites while open, so a child sending one
 * from their GenEd makes it appear without a reload.
 */
export function ConnectChildDialog({
  open,
  parentName,
  email,
  pending,
  avatars,
  onRefresh,
  onDismiss,
}: {
  open: boolean;
  parentName: string;
  email?: string;
  pending: LinkedStudent[];
  avatars: Record<string, string>;
  /** Re-reads the linked children. */
  onRefresh: () => void;
  onDismiss: () => void;
}) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const firstName = parentName.split(/\s+/)[0];

  // Escape dismisses; focus moves into the dialog when it opens.
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") onRefresh();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [open, onRefresh]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="connect-child"
          className="fixed inset-0 z-[90] flex items-end justify-center p-3 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div aria-hidden className="absolute inset-0 bg-[#122D30]/40 backdrop-blur-sm" onClick={onDismiss} />

          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-[820px] overflow-y-auto overflow-x-hidden rounded-[28px] border border-white/80 p-5 shadow-[0_40px_90px_-30px_rgba(18,45,48,0.6)] outline-none sm:p-8"
            style={{ background: "linear-gradient(150deg, #E4F5EE 0%, #F5FAF9 45%, #F4F9E6 100%)" }}
          >
            <span aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#D9F279]/40 blur-3xl" />
            <span aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[#9FE3C4]/40 blur-3xl" />

            {/* Button sets its own position, so the wrapper places it */}
            <div className="absolute right-4 top-4 z-10">
              <Button iconOnly size="sm" variant="tertiary" aria-label="Close" onClick={onDismiss}>
                <X size={18} />
              </Button>
            </div>

            <div className="relative">
              <GenEdLogo variant="mark" height={44} />
              <p className="mt-4 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--pp-green-deep)]">
                Welcome to GenEd{firstName ? `, ${firstName}` : ""}
              </p>
              <h2 id={titleId} className="mt-1 text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--pp-ink)] sm:text-[30px]">
                Let&apos;s connect your child
              </h2>
              <p className="mt-2 max-w-[56ch] text-[14.5px] leading-relaxed text-[var(--pp-ink-soft)]">
                Their progress, reports and learning chats show up here once you&apos;re connected. It takes about a minute, and starts from your child&apos;s side so they stay in control.
              </p>

              {pending.length > 0 && (
                <div className="mt-6">
                  <h3 className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#B7790A]">
                    <span className="h-2 w-2 rounded-full bg-[#F5A50B]" /> Already waiting for you
                  </h3>
                  <ul aria-label="Waiting for your approval" className="mt-2.5 space-y-2">
                    <AnimatePresence initial={false}>
                      {pending.map((s) => <RequestRow key={s.student_id} student={s} avatar={avatars[s.student_id]} />)}
                    </AnimatePresence>
                  </ul>
                </div>
              )}

              <AddChildSteps
                email={email}
                className="mt-6"
                approveHint={<>The request pops up right here, or under <strong>Settings</strong> any time later.</>}
              />

              <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-center text-[12.5px] text-[var(--pp-ink-soft)] sm:text-left">
                  You can find these steps in <strong className="font-bold text-[var(--pp-ink)]">Settings</strong> whenever you need them.
                </p>
                <Button variant="outline" onClick={onDismiss}>
                  I&apos;ll do this later
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
