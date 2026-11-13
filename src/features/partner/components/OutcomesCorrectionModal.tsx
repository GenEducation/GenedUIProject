"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListChecks } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { sourcesService } from "../services/sourcesService";
import { usePartnerStore, type Subject } from "../store/usePartnerStore";
import type { LearningOutcome } from "../types/sources";

interface OutcomesCorrectionModalProps {
  subject: Subject | null;
  onClose: () => void;
}

/** Choose the learning outcomes a chapter is checked against, then run it again (backend `PUT /v1/sources/{id}/outcomes`).
 * The ones the run found uncovered start unticked; the partner can keep, remove or swap in other outcomes of the same
 * board, subject and grade (never none), and removed outcomes stay in the taxonomy for the chapter that teaches them.
 * Nothing here says an outcome is taught: the run tags the chapter's concepts again and its checks decide. */
export function OutcomesCorrectionModal({
  subject,
  onClose,
}: OutcomesCorrectionModalProps) {
  const correctOutcomes = usePartnerStore((s) => s.correctOutcomes);
  const [keep, setKeep] = useState<Set<string>>(new Set());
  const [taxonomy, setTaxonomy] = useState<LearningOutcome[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subject) return;
    const uncovered = new Set(subject.progress?.uncovered_outcomes ?? []);
    setKeep(new Set(subject.lo_codes.filter((c) => !uncovered.has(c))));
    setError(null);
    let live = true;
    sourcesService
      .learningOutcomes(subject.board, subject.subject, subject.grade)
      .then((all) => live && setTaxonomy(all))
      .catch(() => undefined); // without it the chapter's own outcomes still read and can be kept or removed
    return () => {
      live = false;
    };
  }, [subject]);

  if (!subject) return null;
  const uncovered = new Set(subject.progress?.uncovered_outcomes ?? []);
  const names = Object.fromEntries(taxonomy.map((o) => [o.code, o.name]));
  const others = taxonomy
    .filter((o) => !subject.lo_codes.includes(o.code))
    .map((o) => o.code);
  const changed =
    keep.size !== subject.lo_codes.length ||
    subject.lo_codes.some((c) => !keep.has(c));
  const valid = keep.size > 0 && changed;

  function toggle(code: string) {
    setKeep((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function save() {
    if (!subject || !valid) return;
    setBusy(true);
    setError(null);
    try {
      await correctOutcomes(
        subject.id,
        [...subject.lo_codes, ...others].filter((c) => keep.has(c)),
      );
      onClose();
    } catch (err) {
      setError(
        asError(err).message ??
          "Couldn't save the learning outcomes. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const option = (code: string) => (
    <label className="flex items-start gap-3 px-3 py-2 rounded-xl border border-[#122D30]/10 text-sm text-[#122D30]">
      <input
        type="checkbox"
        className="mt-1"
        checked={keep.has(code)}
        onChange={() => toggle(code)}
      />
      <span className="flex-1 min-w-0">
        <span className="font-semibold">{code}</span>
        {names[code] && (
          <span className="block text-[#122D30]/60">{names[code]}</span>
        )}
        {uncovered.has(code) && (
          <span
            className="block mt-0.5 text-xs font-semibold text-amber-700"
            data-testid="uncovered-outcome"
          >
            Not taught in this chapter
          </span>
        )}
      </span>
    </label>
  );

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={busy ? undefined : onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100]"
      />
      <motion.div
        key="dialog"
        role="dialog"
        aria-label="Choose learning outcomes"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[2rem] shadow-2xl z-[101] p-8"
      >
        <div className="mb-5 w-12 h-12 rounded-2xl flex items-center justify-center bg-[#075E63]/10 text-[#075E63]">
          <ListChecks size={24} />
        </div>
        <h3 className="text-xl font-bold text-[#122D30] mb-2">
          Choose learning outcomes
        </h3>
        <p className="text-sm text-[#122D30]/60 leading-relaxed mb-4">
          Keep the outcomes this chapter teaches, or choose others of this
          subject and grade. Saving runs the chapter again; it reuses the pages
          already read and matches its concepts to the outcomes you choose. A
          reviewer checks each match before anything is published.
        </p>
        <ul className="flex flex-col gap-2 mb-5 max-h-72 overflow-y-auto">
          {subject.lo_codes.map((code) => (
            <li key={code}>{option(code)}</li>
          ))}
          {others.length > 0 && (
            <li className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#122D30]/50">
              Other outcomes of this subject and grade
            </li>
          )}
          {others.map((code) => (
            <li key={code}>{option(code)}</li>
          ))}
        </ul>
        {error && (
          <p
            role="alert"
            className="mb-4 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium"
          >
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            size="lg"
            className="flex-1"
            onClick={() => void save()}
            loading={busy}
            disabled={!valid || busy}
          >
            Save and run again
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
