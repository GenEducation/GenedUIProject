"use client";

import { useState } from "react";
import { BlankFiller } from "@/features/learning/check/BlankFiller";
import { GroupSorter } from "@/features/learning/check/GroupSorter";
import { LineInput } from "@/features/learning/check/LineInput";
import { Matching } from "@/features/learning/check/Matching";
import { MultiSelect } from "@/features/learning/check/MultiSelect";
import { Sequencing } from "@/features/learning/check/Sequencing";
import { SingleChoice } from "@/features/learning/check/SingleChoice";
import { formatOf, initialArrangement } from "@/features/learning/check/formats";
import type { CheckItem } from "@/features/learning/types";
import type { AddedQuestion } from "../types/sources";

/**
 * A partner's question shown exactly as a learner meets it: the lesson screen's own renderers (backend ADR 0047), with the partner
 * free to try it. Nothing is scored or sent; the key is never shown here.
 */
export function checkOf(q: AddedQuestion): CheckItem {
  const base = { id: q.id, prompt: q.prompt, role: "checkpoint" as const, figure_groups: [], options: [] as { id: string; text: string }[] };
  const opts = (texts: string[] | undefined) => (texts ?? []).map((text, i) => ({ id: `${q.id}-${i}`, text }));
  switch (q.answer_kind) {
    case "mcq":
      return { ...base, response_type: "mcq", selection: "single", options: opts(q.options) };
    case "multi_select":
      return { ...base, response_type: "mcq", selection: "multiple", options: opts(q.options) };
    case "sequence":
      return { ...base, response_type: "sequence", options: opts(q.sequence_entries) };
    case "matching":
      return { ...base, response_type: "matching", left_entries: q.match_left ?? [], options: opts(q.match_right) };
    case "grouping":
      return { ...base, response_type: "grouping", left_entries: q.group_entries ?? [], options: opts(q.group_names) };
    case "blanks":
      return {
        ...base, response_type: "blanks", options: opts(q.word_bank),
        left_entries: (q.blank_answers ?? []).map((_, i) => String(i + 1)),
      };  // prettier-ignore
    default:
      return { ...base, response_type: "numeric", entry: q.entry ?? null };
  }
}

export function LearnerPreview({ question }: { question: AddedQuestion }) {
  const check = checkOf(question);
  const format = formatOf(check);
  const [value, setValue] = useState(() => initialArrangement(check));
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div aria-label="What students see" className="lesson-theme rounded-xl px-3 py-3">
      <p id={`check-${check.id}`} className="lesson-hand text-[16px] font-bold whitespace-pre-line">{check.prompt}</p>
      {format === "single_choice" && <SingleChoice check={check} selected={selected} onSelect={setSelected} />}
      {format === "multiple_select" && <MultiSelect check={check} chosen={value.chosen} onChange={(chosen) => setValue({ ...value, chosen })} />}
      {format === "sequencing" && <Sequencing check={check} order={value.order} onChange={(order) => setValue({ ...value, order })} />}
      {(format === "number_line" || format === "slider") && (
        <LineInput check={check} number={value.number} onChange={(number) => setValue({ ...value, number })} />
      )}
      {format === "grouping" && <GroupSorter check={check} pairs={value.pairs} onChange={(pairs) => setValue({ ...value, pairs })} />}
      {format === "blanks" && <BlankFiller check={check} pairs={value.pairs} onChange={(pairs) => setValue({ ...value, pairs })} />}
      {format === "matching_pairs" && <Matching check={check} pairs={value.pairs} onChange={(pairs) => setValue({ ...value, pairs })} />}
    </div>
  );
}
