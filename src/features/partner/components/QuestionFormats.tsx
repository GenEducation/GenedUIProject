"use client";

import { useState } from "react";
import type {
  ActivityMode,
  AddedAnswerKind,
  AddedQuestion,
} from "../types/sources";

/**
 * The formats a partner writes a question in (backend ADR 0045 decision 6). A learner answers every one of the first seven without a
 * keyboard, so it can pass a step; a typed number or a short typed answer can be saved, but passes no step of a W2 lesson until it is
 * re-presented (placed on a number line, or given choices).
 */
export const KIND_LABEL: Record<AddedAnswerKind, string> = {
  mcq: "Multiple choice (or true/false)",
  multi_select: "Choose all that apply",
  sequence: "Put in order",
  matching: "Match pairs",
  grouping: "Sort into groups",
  blanks: "Fill the blanks from a word bank",
  numeric: "A number",
  string_set: "Short typed answer",
  activity: "Activity (free answer)",
};

/** How a learner answers an activity (ADR 0048). */
export const ACTIVITY_MODE: Record<ActivityMode, string> = {
  write: "Write",
  speak: "Speak",
  read_aloud: "Read aloud",
  listen: "Listen, then answer",
};

/** Whether a learner would type this question's answer: it then passes no step of a W2 lesson (ADR 0045). */
export function needsKeyboard(q: AddedQuestion): boolean {
  return (
    q.answer_kind === "string_set" || (q.answer_kind === "numeric" && !q.entry)
  );
}

const lines = (s: string) =>
  s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
const sides = (s: string) => {
  const at = s.indexOf("=");
  return at < 0
    ? null
    : ([s.slice(0, at).trim(), s.slice(at + 1).trim()] as const);
};
const label =
  "text-[11px] font-black uppercase tracking-widest text-[#122D30]/50";
const field =
  "w-full rounded-xl border border-[#122D30]/15 bg-white px-3 py-2 text-sm text-[#122D30] focus:outline-none focus:ring-2 focus:ring-[#075E63]/30";

/** The text a partner types for each format, kept apart from the question so switching formats never loses it. */
interface Texts {
  options: string;
  correct: number[];
  accepted: string;
  order: string;
  pairs: string;
  groups: string;
  sorted: string;
  blanks: string;
  bank: string;
  number: string;
  line: { min: string; max: string; step: string; on: boolean };
  mode: ActivityMode;
  rubric: string;
  example: string;
  passage: string;
}

export function textsOf(q: AddedQuestion): Texts {
  const order =
    q.sequence_entries && q.correct_order
      ? q.correct_order.map((i) => q.sequence_entries![i])
      : [];
  const pairs = (q.match_pairs ?? []).map(
    (p) =>
      `${q.match_left?.[p.left] ?? ""} = ${q.match_right?.[p.right] ?? ""}`,
  );
  const sorted = (q.group_entries ?? []).map(
    (e, i) => `${e} = ${q.group_names?.[q.group_of?.[i] ?? 0] ?? ""}`,
  );
  const answers = (q.blank_answers ?? []).map((a) => a[0] ?? "");
  return {
    options: (q.options ?? []).join("\n"),
    correct:
      q.answer_kind === "mcq"
        ? q.correct_option_index == null
          ? []
          : [q.correct_option_index]
        : (q.correct_option_indexes ?? []),
    accepted: (q.accepted_answers ?? []).join("\n"),
    order: order.join("\n"),
    pairs: pairs.join("\n"),
    groups: (q.group_names ?? []).join("\n"),
    sorted: sorted.join("\n"),
    blanks: answers.join("\n"),
    bank: (q.word_bank ?? []).filter((w) => !answers.includes(w)).join("\n"),
    number: q.expected_numeric ?? "",
    line: {
      min: q.entry?.min ?? "0",
      max: q.entry?.max ?? "1",
      step: q.entry?.step ?? "1/4",
      on: q.answer_kind !== "numeric" || !!q.entry || !q.expected_numeric,
    },
    mode: q.activity_mode ?? "write",
    rubric: q.rubric ?? "",
    example: q.example_answer ?? "",
    passage: q.passage ?? "",
  };
}

/** The question's key fields for its format, built from what the partner typed: only the chosen format's fields are sent. */
export function keyFields(
  kind: AddedAnswerKind,
  t: Texts,
): Partial<AddedQuestion> {
  const options = lines(t.options);
  switch (kind) {
    case "mcq":
      return { options, correct_option_index: t.correct[0] };
    case "multi_select":
      return {
        options,
        correct_option_indexes: [...t.correct].sort((a, b) => a - b),
      };
    case "sequence": {
      const entries = lines(t.order);
      return {
        sequence_entries: entries,
        correct_order: entries.map((_, i) => i),
      };
    }
    case "matching": {
      const pairs = lines(t.pairs)
        .map(sides)
        .filter((p): p is readonly [string, string] => !!p && !!p[0] && !!p[1]);
      return {
        match_left: pairs.map((p) => p[0]),
        match_right: pairs.map((p) => p[1]),
        match_pairs: pairs.map((_, i) => ({ left: i, right: i })),
      };
    }
    case "grouping": {
      const names = lines(t.groups);
      const sorted = lines(t.sorted)
        .map(sides)
        .filter((p): p is readonly [string, string] => !!p && !!p[0]);
      return {
        group_names: names,
        group_entries: sorted.map((p) => p[0]),
        group_of: sorted.map((p) => names.indexOf(p[1])),
      };
    }
    case "blanks": {
      const answers = lines(t.blanks);
      return {
        blank_answers: answers.map((a) => [a]),
        word_bank: [...answers, ...lines(t.bank)],
      };
    }
    case "numeric":
      return {
        expected_numeric: t.number.trim(),
        ...(t.line.on
          ? {
              entry: {
                mode: "number_line" as const,
                min: t.line.min.trim(),
                max: t.line.max.trim(),
                step: t.line.step.trim(),
              },
            }
          : {}),
      };
    case "string_set":
      return { accepted_answers: lines(t.accepted) };
    case "activity":
      return {
        activity_mode: t.mode,
        ...(t.rubric.trim() ? { rubric: t.rubric.trim() } : {}),
        ...(t.example.trim() ? { example_answer: t.example.trim() } : {}),
        ...((t.mode === "read_aloud" || t.mode === "listen") && t.passage.trim()
          ? { passage: t.passage.trim() }
          : {}),
      };
  }
}

/** Why the question's key is not complete for its format, or null. */
export function formatProblem(q: AddedQuestion): string | null {
  switch (q.answer_kind) {
    case "mcq": {
      const options = q.options ?? [];
      if (options.length < 2 || new Set(options).size !== options.length)
        return "Give at least two different choices.";
      if (
        q.correct_option_index == null ||
        q.correct_option_index >= options.length
      )
        return "Mark the correct choice.";
      return null;
    }
    case "multi_select": {
      const options = q.options ?? [];
      if (options.length < 3 || new Set(options).size !== options.length)
        return "Give at least three different choices.";
      const right = q.correct_option_indexes ?? [];
      if (!right.length || right.length === options.length)
        return "Mark the correct choices: at least one, and not all of them.";
      return null;
    }
    case "sequence":
      return (q.sequence_entries ?? []).length < 3
        ? "Write at least three entries, in the right order."
        : null;
    case "matching":
      return (q.match_pairs ?? []).length < 3
        ? "Write at least three pairs, one per line, as left = right."
        : null;
    case "grouping": {
      if ((q.group_names ?? []).length < 2) return "Name at least two groups.";
      if (
        (q.group_entries ?? []).length < 3 ||
        (q.group_of ?? []).some((g) => g < 0)
      )
        return "Sort at least three entries into the groups you named, as entry = group.";
      return null;
    }
    case "blanks":
      if (!(q.blank_answers ?? []).length || !q.prompt.includes("___"))
        return "Write ___ in the question for each blank, and its answer.";
      return (q.word_bank ?? []).length < 4
        ? "Give a word bank of at least four words (the answers count)."
        : null;
    case "numeric":
      if (!q.expected_numeric?.trim())
        return "Give the number that answers it.";
      if (q.entry && !(q.entry.min && q.entry.max && q.entry.step))
        return "Give the line's start, end and step.";
      return null;
    case "string_set":
      return (q.accepted_answers ?? []).length
        ? null
        : "Give the answers to accept.";
    case "activity":
      if (!q.activity_mode) return "Choose how the learner answers.";
      if (
        (q.activity_mode === "read_aloud" || q.activity_mode === "listen") &&
        !q.passage?.trim()
      )
        return "Give the passage from the chapter the learner reads or hears.";
      return null;
  }
}

/** The fields of one format. */
export function FormatFields({
  kind,
  texts,
  onTexts,
}: {
  kind: AddedAnswerKind;
  texts: Texts;
  onTexts: (t: Texts) => void;
}) {
  const [t, setT] = useState(texts);
  const change = (next: Partial<Texts>) => {
    const merged = { ...t, ...next };
    setT(merged);
    onTexts(merged);
  };
  const options = lines(t.options);
  const area = (name: keyof Texts, title: string, rows = 3, hint?: string) => (
    <label className="flex flex-col gap-1">
      <span className={label}>{title}</span>
      {hint && <span className="text-[11px] text-[#122D30]/50">{hint}</span>}
      <textarea
        className={field}
        rows={rows}
        value={t[name] as string}
        onChange={(e) => change({ [name]: e.target.value } as Partial<Texts>)}
      />
    </label>
  );
  switch (kind) {
    case "mcq":
    case "multi_select":
      return (
        <>
          {area(
            "options",
            "Choices (one per line)",
            4,
            kind === "mcq"
              ? "Two choices, True and False, make a true/false question."
              : undefined,
          )}
          {options.length > 0 && (
            <fieldset className="flex flex-col gap-1">
              <legend className={label}>
                {kind === "mcq" ? "Correct choice" : "Correct choices"}
              </legend>
              {options.map((o, i) => (
                <label
                  key={i}
                  className="flex items-center gap-2 text-sm text-[#122D30]"
                >
                  <input
                    type={kind === "mcq" ? "radio" : "checkbox"}
                    name="correct"
                    checked={t.correct.includes(i)}
                    onChange={(e) =>
                      change({
                        correct:
                          kind === "mcq"
                            ? [i]
                            : e.target.checked
                              ? [...t.correct, i]
                              : t.correct.filter((x) => x !== i),
                      })
                    }
                  />
                  {o}
                </label>
              ))}
            </fieldset>
          )}
        </>
      );
    case "sequence":
      return area(
        "order",
        "Entries, in the right order (one per line)",
        4,
        "Learners see them shuffled.",
      );
    case "matching":
      return area("pairs", "Pairs (one per line, as left = right)", 4);
    case "grouping":
      return (
        <>
          {area("groups", "Group names (one per line)", 2)}
          {area("sorted", "Entries (one per line, as entry = group)", 4)}
        </>
      );
    case "blanks":
      return (
        <>
          {area(
            "blanks",
            "The answer of each blank, in order (one per line)",
            3,
            "Write ___ in the question for each blank.",
          )}
          {area("bank", "Other words for the word bank (one per line)", 2)}
        </>
      );
    case "numeric":
      return (
        <>
          <label className="flex flex-col gap-1 sm:max-w-[220px]">
            <span className={label}>The answer</span>
            <input
              className={field}
              inputMode="decimal"
              value={t.number}
              onChange={(e) => change({ number: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[#122D30]">
            <input
              type="checkbox"
              checked={t.line.on}
              onChange={(e) =>
                change({ line: { ...t.line, on: e.target.checked } })
              }
            />
            Learners place it on a number line (no typing)
          </label>
          {t.line.on ? (
            <div className="grid grid-cols-3 gap-2">
              {(["min", "max", "step"] as const).map((k) => (
                <label key={k} className="flex flex-col gap-1">
                  <span className={label}>
                    {k === "min"
                      ? "Line starts at"
                      : k === "max"
                        ? "Line ends at"
                        : "Step"}
                  </span>
                  <input
                    className={field}
                    value={t.line[k]}
                    onChange={(e) =>
                      change({ line: { ...t.line, [k]: e.target.value } })
                    }
                  />
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs font-bold text-amber-700">
              Learners would type this number, so it can&rsquo;t pass a step
              until it is on a line.
            </p>
          )}
        </>
      );
    case "string_set":
      return (
        <>
          {area("accepted", "Answers to accept (one per line)")}
          <p className="text-xs font-bold text-amber-700">
            Learners would type this answer, so it can&rsquo;t pass a step.
            Prefer choices or a word bank.
          </p>
        </>
      );
    case "activity":
      return (
        <>
          <label className="flex flex-col gap-1 sm:max-w-[260px]">
            <span className={label}>How the learner answers</span>
            <select
              className={field}
              value={t.mode}
              onChange={(e) => change({ mode: e.target.value as ActivityMode })}
            >
              {(Object.keys(ACTIVITY_MODE) as ActivityMode[]).map((m) => (
                <option key={m} value={m}>
                  {ACTIVITY_MODE[m]}
                </option>
              ))}
            </select>
          </label>
          {area(
            "rubric",
            "What a good answer includes (optional)",
            3,
            "Learners never see this. Leave it empty and the tutor judges from the chapter.",
          )}
          {(t.mode === "read_aloud" || t.mode === "listen") &&
            area(
              "passage",
              t.mode === "listen"
                ? "Passage the learner hears (never shown)"
                : "Passage the learner reads aloud",
              4,
              "Copy it exactly from the chapter.",
            )}
          {area("example", "An example of a good answer (optional)", 3)}
          <p className="text-xs text-[#122D30]/60">
            A free answer with no fixed key. Learners must try it to finish
            the step, and can practise it again.
          </p>
        </>
      );
  }
}

/** A one-line description of the question's key, for its card. */
export function keyText(q: AddedQuestion): string {
  switch (q.answer_kind) {
    case "numeric":
      return `${q.expected_numeric ?? ""}${q.entry ? ` (on a line from ${q.entry.min} to ${q.entry.max})` : " (typed)"}`;
    case "mcq":
      return q.options?.[q.correct_option_index ?? -1] ?? "";
    case "multi_select":
      return (q.correct_option_indexes ?? [])
        .map((i) => q.options?.[i])
        .join(", ");
    case "sequence":
      return (q.correct_order ?? [])
        .map((i) => q.sequence_entries?.[i])
        .join(" → ");
    case "matching":
      return (q.match_pairs ?? [])
        .map((p) => `${q.match_left?.[p.left]} = ${q.match_right?.[p.right]}`)
        .join("; ");
    case "grouping":
      return (q.group_entries ?? [])
        .map((e, i) => `${e} → ${q.group_names?.[q.group_of?.[i] ?? 0]}`)
        .join("; ");
    case "blanks":
      return (q.blank_answers ?? []).map((a) => a[0]).join(", ");
    case "string_set":
      return (q.accepted_answers ?? []).join(" / ");
    case "activity":
      return `${ACTIVITY_MODE[q.activity_mode ?? "write"]}: a free answer, no fixed key`;
  }
}
