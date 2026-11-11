"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { AddedAnswerKind, AssessmentPlanComponent, AssessmentPlanNode, EvidenceChoice } from "../types/sources";

/**
 * The chapter's assessment plan (backend ADR 0046), node by node: what evidence each concept needs, which question formats would give it
 * and why, the questions the chapter already has, whether rule R can pass it (with a fresh question after a miss), and what is missing.
 * The partner approves or changes each concept's evidence here; nothing is approved until they do, and a chapter whose evidence is not
 * approved cannot be published.
 */

/** The evidence kinds a partner can choose, in plain words (backend `evidence_kinds_v2`). */
export const EVIDENCE_LABEL: Record<string, string> = {
  recall: "Recall it",
  recognise: "Recognise it",
  classify: "Sort into categories",
  relate: "Match related things",
  order: "Put in order / compare",
  compute: "Work out a value",
  apply_procedure: "Carry out the method",
  represent: "Show it in a representation",
  interpret: "Interpret a text or figure",
  infer: "Infer what the text implies",
  locate_evidence: "Find the evidence in the text",
  use_form: "Use the right form",
  evaluate_claim: "Judge a claim and its reasoning",
  construct: "Build the answer",
  listen_comprehend: "Understand what is heard",
  produce_written: "Write it (needs a rubric)",
  produce_oral: "Say it (needs a rubric)",
  explain_reasoning: "Explain the reasoning (needs a rubric)",
  retell: "Retell it (needs a rubric)",
  read_aloud: "Read aloud (needs a rubric)",
  repeat_oral: "Repeat aloud (needs a rubric)",
};

/** The partner form's answer type for a planned format (the formats a partner can write today). */
export const KIND_FOR_FORMAT: Record<string, AddedAnswerKind> = {
  single_choice: "mcq",
  multiple_select: "multi_select",
  sequencing: "sequence",
  matching_pairs: "matching",
  grouping: "grouping",
  blanks: "blanks",
  number_line: "numeric",
  slider: "numeric",
};

const FORMAT_LABEL: Record<string, string> = {
  single_choice: "Multiple choice",
  multiple_select: "Choose all that apply",
  sequencing: "Put in order",
  matching_pairs: "Match pairs",
  grouping: "Sort into groups",
  blanks: "Fill blanks from a bank",
  number_line: "Number line",
  slider: "Slider",
  tile_builder: "Build from tiles",
};

const chip = "px-2 py-px rounded-full text-[9px] font-black uppercase tracking-widest border";

function ComponentCard({
  c,
  choice,
  onChoose,
  onWrite,
}: {
  c: AssessmentPlanComponent;
  choice: EvidenceChoice | undefined;
  onChoose: (choice: EvidenceChoice | null) => void;
  onWrite: (format: string) => void;
}) {
  const [editingKinds, setEditingKinds] = useState(false);
  const approved = choice ?? (c.evidence.basis === "partner_approved" ? { kinds: c.evidence.kinds } : undefined);
  const kinds = approved?.kinds ?? c.evidence.kinds;
  const good = c.existing.filter((e) => e.gives_required_evidence);
  const notFitting = c.existing.filter((e) => !e.gives_required_evidence && e.format !== "discussion");
  return (
    <article aria-label={c.title} className="rounded-2xl bg-white border border-[#122D30]/5 p-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 text-sm font-black text-[#122D30]">{c.title}</p>
        {c.sufficient ? (
          <span className={`${chip} bg-emerald-50 text-emerald-700 border-emerald-200`}>Enough questions</span>
        ) : (
          <span className={`${chip} bg-amber-50 text-amber-800 border-amber-200`}>Needs questions</span>
        )}
      </div>
      <div className="text-xs text-[#122D30]/70 flex flex-col gap-1">
        <p>
          <span className="font-bold text-[#122D30]">Evidence needed: </span>
          {kinds.map((k) => EVIDENCE_LABEL[k] ?? k).join(" · ")}{" "}
          {approved ? (
            <span className={`${chip} bg-emerald-50 text-emerald-700 border-emerald-200`}>Approved</span>
          ) : (
            <span className={`${chip} bg-[#122D30]/5 text-[#122D30]/60 border-[#122D30]/10`}>Suggested</span>
          )}
        </p>
        {!approved && <p className="text-[#122D30]/50">Why suggested: {c.evidence.rationale}</p>}
        {c.evidence.flags.map((f) => (
          <p key={f} className="text-amber-800">Check: {f}</p>
        ))}
        {editingKinds ? (
          <fieldset className="grid sm:grid-cols-2 gap-1 mt-1">
            <legend className="sr-only">Evidence this concept needs</legend>
            {Object.keys(EVIDENCE_LABEL).map((k) => (
              <label key={k} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={kinds.includes(k)}
                  onChange={(e) => {
                    const next = e.target.checked ? [...kinds, k] : kinds.filter((x) => x !== k);
                    onChoose(next.length ? { kinds: next.slice(0, 4) } : null);
                  }}
                />
                {EVIDENCE_LABEL[k]}
              </label>
            ))}
          </fieldset>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          {!approved && (
            <Button size="sm" leadingIcon={<CheckCircle2 size={14} />} onClick={() => onChoose({ kinds: c.evidence.kinds })}>
              Approve this evidence
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setEditingKinds((v) => !v)}>
            {editingKinds ? "Done" : "Change the evidence"}
          </Button>
        </div>
        {c.recommended.length > 0 && (
          <div className="pt-1">
            <p className="font-bold text-[#122D30]">Formats that give this evidence</p>
            <ul className="list-disc pl-4">
              {c.recommended.map((r) => (
                <li key={r.format}>
                  <span className="font-bold">{FORMAT_LABEL[r.format] ?? r.format}</span>: {r.why} (strong when {r.strong_when})
                  {KIND_FOR_FORMAT[r.format] && (
                    <Button size="sm" variant="tertiary" leadingIcon={<PenLine size={12} />} onClick={() => onWrite(r.format)}>
                      Write one
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {c.only_format && <p>Only one format can give this evidence.</p>}
          </div>
        )}
        <p>
          <span className="font-bold text-[#122D30]">Questions that give it: </span>
          {good.length} ({c.strong_families} strong, {c.weak_families} weak question families)
          {notFitting.length > 0 && ` · ${notFitting.length} that don’t (typed, or a format that shows something else)`}
        </p>
        {c.requests.map((r, i) => (
          <p key={i}>
            <span className="font-bold text-[#122D30]">Missing: </span>
            {r.families} {r.strength} question{r.families === 1 ? "" : "s"} ({r.formats.map((f) => FORMAT_LABEL[f] ?? f).join(", ")}): {r.reason}
          </p>
        ))}
        {c.conversions
          .filter((x) => !x.keeps_evidence)
          .map((x) => (
            <p key={x.item_id} className="text-amber-800">
              “{x.prompt.slice(0, 80)}”: {x.why}
            </p>
          ))}
        {c.capability_gaps.map((g) => (
          <p key={g} className="flex items-start gap-1 text-red-700">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden /> {g}
          </p>
        ))}
      </div>
    </article>
  );
}

export function CoveragePanel({
  nodes,
  evidence,
  onEvidence,
  onWrite,
}: {
  nodes: AssessmentPlanNode[];
  evidence: Record<string, EvidenceChoice>;
  onEvidence: (conceptKey: string, choice: EvidenceChoice | null) => void;
  onWrite: (conceptKey: string, format: string) => void;
}) {
  const ready = nodes.filter((n) => n.ready).length;
  return (
    <section aria-label="Assessment coverage" className="flex flex-col gap-4">
      <p className="text-sm text-[#122D30]/70">
        Every step of the lesson needs questions that show its concepts were understood. {ready} of {nodes.length} steps have enough.
        Approve each concept&rsquo;s evidence, then write or ask AI for the missing questions.
      </p>
      {nodes.map((n) => (
        <div key={n.node_id} className="flex flex-col gap-2">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-[#122D30]/50">
            {n.position}. {n.title} {n.ready ? "· ready" : ""}
          </h3>
          {n.components.map((c) => (
            <ComponentCard
              key={c.component_id}
              c={c}
              choice={c.concept_key ? evidence[c.concept_key] : undefined}
              onChoose={(choice) => c.concept_key && onEvidence(c.concept_key, choice)}
              onWrite={(format) => c.concept_key && onWrite(c.concept_key, format)}
            />
          ))}
        </div>
      ))}
    </section>
  );
}
