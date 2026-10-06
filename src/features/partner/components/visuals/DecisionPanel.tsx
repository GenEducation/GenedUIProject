"use client";

import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { visualsService } from "../../services/visualsService";
import type { ReasonCode, VisualDecisionOut, VisualDetail } from "../../types/visuals";
import { ReasonFields } from "./ReasonFields";

interface DecisionPanelProps {
  detail: VisualDetail;
  onDecided: (result: VisualDecisionOut) => void;
  /** 409: already decided, or the visual changed since it was shown. The caller reloads it. */
  onConflict: () => void;
}

/** True when the key press came from a text field, so shortcuts don't fire while typing. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

/** Accept (one click) or reject (reasons, note, "make a new version"). Only rendered for a pending visual. */
export function DecisionPanel({ detail, onDecided, onConflict }: DecisionPanelProps) {
  const [mode, setMode] = useState<"idle" | "reject">("idle");
  const [reasons, setReasons] = useState<ReasonCode[]>([]);
  const [note, setNote] = useState("");
  const [regenerate, setRegenerate] = useState(true);
  const [submitting, setSubmitting] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toggleId = useId();

  const submit = async (decision: "accept" | "reject") => {
    setSubmitting(decision);
    setError(null);
    try {
      const result = await visualsService.decide(
        detail.id,
        decision === "accept"
          ? { content_hash: detail.content_hash, decision }
          : {
              content_hash: detail.content_hash,
              decision,
              reason_codes: reasons,
              note: note.trim() || null,
              regenerate,
            },
      );
      onDecided(result);
    } catch (e) {
      const err = asError(e);
      setError(err.message || "Couldn't save your decision. Please try again.");
      if (err.status === 409) onConflict();
    } finally {
      setSubmitting(null);
    }
  };

  // A = accept, R = reject. → (next) lives with the pane, which owns navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || submitting) return;
      if (mode === "idle" && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        void submit("accept");
      } else if (mode === "idle" && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        setMode("reject");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  return (
    <section aria-label="Your decision" className="rounded-2xl bg-[#1A3D2C] p-4 md:p-5 text-white">
      <AnimatePresence mode="wait" initial={false}>
        {mode === "idle" ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <p className="flex-1 text-xs font-bold text-white/70">
              Does this picture teach the concept the way the textbook does?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                tone="onDark"
                leadingIcon={<X size={14} />}
                onClick={() => setMode("reject")}
                disabled={!!submitting}
              >
                Reject <kbd className="ml-1 text-[10px] opacity-50">R</kbd>
              </Button>
              <Button
                variant="primary"
                leadingIcon={<Check size={14} />}
                loading={submitting === "accept"}
                onClick={() => void submit("accept")}
              >
                Accept <kbd className="ml-1 text-[10px] opacity-60">A</kbd>
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="reject"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-white rounded-xl p-4 text-[#1A3D2C] flex flex-col gap-4"
          >
            <ReasonFields reasons={reasons} onReasonsChange={setReasons} note={note} onNoteChange={setNote} />

            <label htmlFor={toggleId} className="flex items-center gap-3 cursor-pointer select-none">
              <input
                id={toggleId}
                type="checkbox"
                role="switch"
                aria-checked={regenerate}
                checked={regenerate}
                onChange={(e) => setRegenerate(e.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="relative h-5 w-9 shrink-0 rounded-full bg-[#1A3D2C]/15 transition-colors peer-checked:bg-[#1A3D2C] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#1A3D2C]/40"
              />
              <span className="text-sm font-bold">Make a new version</span>
            </label>

            <div className="flex justify-end gap-2 pt-1 border-t border-[#1A3D2C]/5">
              <Button variant="tertiary" onClick={() => setMode("idle")} disabled={!!submitting}>
                Cancel
              </Button>
              <Button
                variant="destructiveSolid"
                disabled={reasons.length === 0}
                loading={submitting === "reject"}
                onClick={() => void submit("reject")}
              >
                {regenerate ? "Reject & remake" : "Reject"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p role="alert" className="mt-3 text-xs font-bold text-red-200">
          {error}
        </p>
      )}
    </section>
  );
}
