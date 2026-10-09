"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { asError } from "@/utils/errors";
import { sourcesService } from "../services/sourcesService";
import type { LearningOutcome } from "../types/sources";

interface LearningOutcomePickerProps {
  board: string;
  subject: string;
  grade: number | null;
  selected: string[];
  onSelectedChange: (codes: string[]) => void;
  strand: string;
  onStrandChange: (strand: string) => void;
}

const labelClass = "text-[10px] font-black text-[#1A3D2C] uppercase tracking-widest px-1";

/** `"Fractions & decimals"` → `"fractions_decimals"`: a strand code the backend accepts. */
export function strandCodeFrom(name: string): string {
  const code = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const lettered = /^[a-z]/.test(code) ? code : `strand_${code}`;
  return lettered.slice(0, 60).replace(/_+$/, "");
}

/**
 * Which learning outcomes the chapter teaches, picked from the taxonomy for
 * its board, subject and grade, and which strand its concepts belong to:
 * one the subject already has, or a new one named after the chapter's first
 * outcome's competency.
 */
export function LearningOutcomePicker({
  board,
  subject,
  grade,
  selected,
  onSelectedChange,
  strand,
  onStrandChange,
}: LearningOutcomePickerProps) {
  const [outcomes, setOutcomes] = useState<LearningOutcome[] | null>(null);
  const [strands, setStrands] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Whether the partner picked a strand themselves; until then it follows the suggestion.
  const [strandPicked, setStrandPicked] = useState(false);
  const ready = !!subject && grade !== null;

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setOutcomes(null);
    setError(null);
    Promise.all([sourcesService.learningOutcomes(board, subject, grade), sourcesService.strands(subject)])
      .then(([los, existing]) => {
        if (cancelled) return;
        setOutcomes(los);
        setStrands(existing);
      })
      .catch((e) => {
        if (cancelled) return;
        const err = asError(e);
        setError(
          err.status === 404
            ? "This server doesn't support chapter uploads yet. The backend needs updating."
            : err.message || "Couldn't load learning outcomes.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [ready, board, subject, grade]);

  const groups = useMemo(() => {
    const byCompetency = new Map<string, { name: string; items: LearningOutcome[] }>();
    for (const lo of outcomes ?? []) {
      const group = byCompetency.get(lo.competency_code) ?? { name: lo.competency_name, items: [] };
      group.items.push(lo);
      byCompetency.set(lo.competency_code, group);
    }
    return [...byCompetency.values()];
  }, [outcomes]);

  const firstPicked = outcomes?.find((lo) => lo.code === selected[0]);
  const suggested = firstPicked ? strandCodeFrom(firstPicked.competency_name) : "";
  const strandOptions = [
    ...strands.map((code) => ({ value: code, label: code })),
    ...(suggested && !strands.includes(suggested) ? [{ value: suggested, label: `New: ${suggested}` }] : []),
  ];

  // The strand follows the suggestion (the first picked outcome's competency) until the partner picks one
  // themselves, and falls back to it if their pick stops being offered.
  const optionsKey = strandOptions.map((o) => o.value).join("|");
  useEffect(() => {
    if (strandPicked && strandOptions.some((o) => o.value === strand)) return;
    if (strand !== suggested) onStrandChange(suggested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggested, optionsKey, strandPicked]);

  const toggle = (code: string) =>
    onSelectedChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);

  if (!ready) {
    return (
      <p className="text-[11px] font-bold text-[#1A3D2C]/40 px-1">
        Pick a grade and subject to choose learning outcomes.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className={labelClass}>Learning outcomes</span>
          <span className="text-[10px] font-bold text-[#1A3D2C]/40">{selected.length} selected</span>
        </div>
        {error ? (
          <p role="alert" className="text-xs font-bold text-red-600 px-1">{error}</p>
        ) : outcomes === null ? (
          <p className="flex items-center gap-2 text-xs font-bold text-[#1A3D2C]/40 px-1">
            <Loader2 size={14} className="animate-spin" aria-hidden /> Loading learning outcomes…
          </p>
        ) : outcomes.length === 0 ? (
          <p className="text-xs font-bold text-[#1A3D2C]/50 px-1">
            There are no learning outcomes for {subject}, Grade {grade} yet, so this chapter can&apos;t be mapped.
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-2xl border border-[#1A3D2C]/10 bg-[#F8F9F8] divide-y divide-[#1A3D2C]/5">
            {groups.map((group) => (
              <fieldset key={group.name} className="p-3">
                <legend className="text-[10px] font-black uppercase tracking-widest text-[#1A3D2C]/40 mb-1.5">
                  {group.name}
                </legend>
                <div className="space-y-1">
                  {group.items.map((lo) => {
                    const on = selected.includes(lo.code);
                    return (
                      // `relative` makes the label the hidden checkbox's containing block. Without it the
                      // sr-only input is positioned against the modal panel, and focusing it on click
                      // scrolls that overflow-hidden panel to wherever the input landed, blanking the form.
                      <label
                        key={lo.code}
                        className={`relative flex items-start gap-2.5 rounded-xl px-2 py-1.5 cursor-pointer transition-colors ${
                          on ? "bg-white" : "hover:bg-white/60"
                        }`}
                      >
                        <input type="checkbox" checked={on} onChange={() => toggle(lo.code)} className="peer sr-only" />
                        <span
                          aria-hidden
                          className={`mt-0.5 h-4 w-4 shrink-0 rounded-[5px] border-[1.5px] flex items-center justify-center peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#1A3D2C]/40 ${
                            on ? "bg-[#1A3D2C] border-[#1A3D2C] text-white" : "border-[#1A3D2C]/25"
                          }`}
                        >
                          {on && <Check size={10} />}
                        </span>
                        <span className="text-xs text-[#1A3D2C]/85 leading-snug">
                          {lo.name}
                          <span className="block text-[9px] font-black uppercase tracking-widest text-[#1A3D2C]/30 mt-0.5">
                            {lo.code}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <span className={labelClass}>Strand</span>
        <Select
          aria-label="Strand"
          placeholder={selected.length ? "Select strand" : "Pick a learning outcome first"}
          accentColor="#1A3D2C"
          value={strand}
          onChange={(next) => {
            setStrandPicked(true);
            onStrandChange(next);
          }}
          disabled={!strandOptions.length}
          options={strandOptions}
        />
        <p className="text-[10px] text-[#1A3D2C]/45 px-1">
          The topic group this chapter&apos;s concepts belong to. Use an existing one when the chapter continues it.
        </p>
      </div>
    </div>
  );
}
