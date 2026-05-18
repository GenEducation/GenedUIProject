# Test Service — Frontend Migration Guide (v1 → v2)

This document is the single source of truth for integrating the v2 test-service changes into the frontend. The upgrade is **fully backward-compatible** — no existing field was renamed or removed. You can ship support for the new features incrementally without breaking anything already working.

---

## Table of Contents

1. [TL;DR — What Changed](#1-tldr--what-changed)
2. [Response Shape Changes](#2-response-shape-changes)
3. [New Question Fields](#3-new-question-fields)
4. [New Top-Level `paper_meta`](#4-new-top-level-paper_meta)
5. [New Question Types — Rendering Guide](#5-new-question-types--rendering-guide)
6. [Answer Submission Format](#6-answer-submission-format)
7. [Grading Response Changes](#7-grading-response-changes)
8. [Suggested UI Upgrades](#8-suggested-ui-upgrades)
9. [TypeScript Types](#9-typescript-types)
10. [Integration Checklist](#10-integration-checklist)

---

## 1. TL;DR — What Changed

| Area | v1 | v2 |
|---|---|---|
| Question types | 5 types | 9 types (+`true_false`, `match_the_following`, `assertion_reasoning`, `extract_based`, `long_answer`) |
| Marks per question | None | Every question has a `marks` field (1, 2, 3, or 5) |
| Paper sections | None | Every question has a `paper_section` field: `"A"`, `"B"`, or `"C"` |
| Bloom's level | None | Every question has a `blooms_level` tag |
| Paper metadata | None | New `paper_meta` at response root (total marks, time, instructions) |
| Default questions per section | 3 | 5 |
| Grading | Simple average | Marks-weighted; graded questions include `marks_awarded` |
| Breaking changes | — | **None** |

---

## 2. Response Shape Changes

### `POST /create-chapter-test` — what's new

```diff
{
  "test_id": "uuid",
  "document_title": "The Tinkling Bells",
  "subject": "English",
  "grade": 4,

+ "paper_meta": { ... },           ← NEW: paper-level metadata

  "sections": [
    {
      "main_heading": "Chinna and the Festival",
      "tier": "Moderate Scaffolding",
      "avg_mastery": 0.55,
      "questions": [
        {
          "question_id": "...",
          "type": "multiple_choice",
          "prompt": "...",
          "options": [...],
          "expected_answer": "...",
          "expected_answer_rubric": "...",
          "lo_ids": [...],

+         "marks": 1,                   ← NEW
+         "paper_section": "A",         ← NEW
+         "blooms_level": "understand", ← NEW
+         "match_pairs": null,          ← NEW (populated for match_the_following)
+         "assertion": null,            ← NEW (populated for assertion_reasoning)
+         "reason": null,               ← NEW (populated for assertion_reasoning)
+         "extract_passage": null,      ← NEW (populated for extract_based)
+         "justification_required": false ← NEW (true for true_false)
        }
      ]
    }
  ]
}
```

### `POST /tests/{id}/submit` — grading response changes

```diff
{
  "submission_id": "uuid",
  "overall_score": 0.72,
  "overall_verdict": "ABOVE",
  "section_results": {
    "Chinna and the Festival": {
      "actual_score": 0.78,
      "expected_score": 0.55,
      "delta": 0.23,
      "verdict": "ABOVE",
+     "total_marks": 9,          ← NEW
+     "marks_obtained": 7.0      ← NEW
    }
  },
  "graded_questions": [
    {
      "question_id": "...",
      "score_0_1": 1.0,
      "rationale": "...",
+     "marks": 1,                ← NEW
+     "marks_awarded": 1.0       ← NEW
    }
  ]
}
```

---

## 3. New Question Fields

All new fields have safe defaults, so your existing code that ignores them will not break.

| Field | Type | Default | Description |
|---|---|---|---|
| `marks` | `1 \| 2 \| 3 \| 5` | `1` | Marks allocated to this question |
| `paper_section` | `"A" \| "B" \| "C"` | `"A"` | A = objective, B = short answer, C = long answer |
| `blooms_level` | string | `"remember"` | Bloom's taxonomy cognitive level (informational) |
| `match_pairs` | `{left, right}[] \| null` | `null` | Column data for `match_the_following` |
| `assertion` | `string \| null` | `null` | Assertion statement for `assertion_reasoning` |
| `reason` | `string \| null` | `null` | Reason statement for `assertion_reasoning` |
| `extract_passage` | `string \| null` | `null` | Reading passage for `extract_based` |
| `justification_required` | `boolean` | `false` | Whether T/F needs a written justification |

### Paper section → question type mapping

| `paper_section` | Types you'll see | `marks` value |
|---|---|---|
| `"A"` | `multiple_choice`, `true_false`, `fill_in_the_blank` | `1` |
| `"B"` | `short_answer`, `match_the_following`, `assertion_reasoning` | `2` |
| `"C"` | `long_answer`, `extract_based`, `application` | `3` or `5` |

---

## 4. New Top-Level `paper_meta`

Appears at the root of the create-test response. Use it to render the paper header before the questions.

```ts
interface PaperMeta {
  total_marks:            number;        // e.g. 18
  suggested_time_minutes: number;        // e.g. 27
  general_instructions:   string[];      // ready-to-render instruction lines
  sections: {
    label:              "A" | "B" | "C";
    title:              string;          // "Section A: Objective Questions"
    question_types:     string[];        // types present in this section
    marks_per_question: string;          // "1 mark each"
    question_count:     number;
  }[];
}
```

**Example value:**
```json
{
  "total_marks": 18,
  "suggested_time_minutes": 27,
  "general_instructions": [
    "Total marks: 18",
    "Time allowed: 27 minutes",
    "All questions are compulsory.",
    "Section A — Objective questions (1 mark each). Choose the best answer.",
    "Section B — Short answer questions (2 marks each). Answer in 2–3 sentences.",
    "Section C — Long answer questions (3–5 marks each). Answer in detail."
  ],
  "sections": [
    {
      "label": "A",
      "title": "Section A: Objective Questions",
      "question_types": ["fill_in_the_blank", "multiple_choice", "true_false"],
      "marks_per_question": "1 mark each",
      "question_count": 4
    },
    {
      "label": "B",
      "title": "Section B: Short Answer Questions",
      "question_types": ["assertion_reasoning", "short_answer"],
      "marks_per_question": "2 marks each",
      "question_count": 4
    },
    {
      "label": "C",
      "title": "Section C: Long Answer Questions",
      "question_types": ["application", "extract_based"],
      "marks_per_question": "3–5 marks each",
      "question_count": 2
    }
  ]
}
```

> **Guard:** always access via `response.paper_meta?.total_marks` — the field is typed as optional.

---

## 5. New Question Types — Rendering Guide

### Existing types (no change needed)

| Type | Render | Notes |
|---|---|---|
| `multiple_choice` | Radio buttons from `options[]` | Unchanged |
| `fill_in_the_blank` | Inline text input at `___` in `prompt` | Unchanged |
| `short_answer` | Textarea | Unchanged |
| `open_ended` | Textarea | Legacy alias — still returned for old test rows |
| `long_answer` | Textarea | Same as `open_ended`, used in new tests |
| `application` | Textarea | Unchanged |

---

### `true_false`

**Fields:** `prompt` (the statement), `options: ["True", "False"]`, `justification_required`

```
┌──────────────────────────────────────────────────┐  1 mark
│  The tinkling sound of the bells made Chinna     │
│  feel sad and lonely during the festival.        │
│                                                  │
│   ○ True    ○ False                              │
│                                                  │
│  Explain your answer:                            │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │  ← only shown when
│  └────────────────────────────────────────────┘  │    justification_required = true
└──────────────────────────────────────────────────┘
```

**`student_answer` format:**
- Without justification: `"True"` or `"False"`
- With justification: `"False. The bells made Chinna feel proud, not sad."`

```ts
function buildTrueFalseAnswer(
  selection: "True" | "False",
  justification: string
): string {
  const j = justification.trim();
  return j ? `${selection}. ${j}` : selection;
}
```

---

### `match_the_following`

**Fields:** `prompt`, `match_pairs: { left: string; right: string }[]`

`match_pairs` gives you both columns already correctly paired. Display Column A in order, **shuffle** Column B, let the student match them.

```
┌──────────────────────────────────────────────────┐  2 marks
│  Match the items in Column A with Column B.      │
│                                                  │
│  Column A              Column B                  │
│  ──────────────        ──────────────────────    │
│  1. Chinna      →      [ Select ▼ ]              │
│  2. The Ox      →      [ Select ▼ ]              │
│  3. The Bells   →      [ Select ▼ ]              │
│  4. The Village →      [ Select ▼ ]              │
│                                                  │
│  Options: A. Memory  B. Responsibility           │
│           C. Community  D. Celebration           │
└──────────────────────────────────────────────────┘
```

```ts
function buildMatchColumns(question: GeneratedQuestion) {
  const leftItems = question.match_pairs!.map((p, i) => ({
    id: i + 1,
    text: p.left,
  }));

  // Shuffle right column, assign letter labels
  const shuffled = [...question.match_pairs!.map(p => p.right)].sort(() => Math.random() - 0.5);
  const rightItems = shuffled.map((text, i) => ({
    label: String.fromCharCode(65 + i), // A, B, C, D…
    text,
  }));

  // Keep a map from right text → label for serialization
  const labelMap = Object.fromEntries(rightItems.map(r => [r.text, r.label]));

  return { leftItems, rightItems, labelMap };
}
```

**`student_answer` format:** `"1→B, 2→D, 3→A, 4→C"`

```ts
function serializeMatchAnswers(
  selections: Record<number, string>  // { 1: "B", 2: "D", 3: "A", 4: "C" }
): string {
  return Object.entries(selections)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([id, label]) => `${id}→${label}`)
    .join(", ");
}
```

---

### `assertion_reasoning`

**Fields:** `assertion`, `reason`, `options` (the 4 standard choices)

> **Always render using the `assertion` and `reason` fields directly** — not the raw `prompt` string. This ensures consistent styling across all A-R questions.

```
┌──────────────────────────────────────────────────┐  2 marks
│  Assertion (A):                                  │
│  The sound of the bells was important to Chinna  │
│  even after the festival ended.                  │
│                                                  │
│  Reason (R):                                     │
│  Bells are used in temples and are considered    │
│  sacred in Indian culture.                       │
│                                                  │
│  Choose the correct option:                      │
│                                                  │
│   ○  (a) Both A and R are true, and R is the    │
│          correct explanation of A.               │
│   ○  (b) Both A and R are true, but R is not    │
│          the correct explanation of A.           │
│   ○  (c) A is true, but R is false.             │
│   ○  (d) A is false, but R is true.             │
└──────────────────────────────────────────────────┘
```

**`student_answer` format:** The **full text** of the selected option from `options[]`.

```ts
// ✅ Correct — send the full option text
student_answer = "(b) Both A and R are true, but R is not the correct explanation of A."

// ❌ Wrong — the AI grader compares text, not index
student_answer = "b"
student_answer = "(b)"
```

**Safe fallback** if `assertion` or `reason` is null (shouldn't happen on new rows, but for safety):
```ts
const displayText = question.assertion
  ? `Assertion (A): ${question.assertion}\n\nReason (R): ${question.reason}`
  : question.prompt;
```

---

### `extract_based`

**Fields:** `extract_passage` (the reading passage), `prompt` (contains the sub-questions as (a), (b), (c)…), `marks`

Render in two parts: the passage in a visually distinct block, then the questions below it.

```
┌──────────────────────────────────────────────────┐  3 marks
│  Read the passage carefully:                     │
│                                                  │
│  ╔══════════════════════════════════════════╗   │
│  ║  "The market was full of colour and      ║   │
│  ║   noise. Drums beat in the distance.     ║   │
│  ║   But above all the sounds, Chinna       ║   │
│  ║   could hear the gentle tinkle of the   ║   │
│  ║   bells around his ox's neck…"           ║   │
│  ╚══════════════════════════════════════════╝   │
│                                                  │
│  (a) What was Chinna trying to do when he        │
│      stood still? (1 mark)                       │
│  (b) Why could he hear the bells above all       │
│      other sounds? What does this suggest        │
│      about his state of mind? (2 marks)          │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  (a) …                                   │   │
│  │  (b) …                                   │   │
│  └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

**`student_answer` format:** A single combined string with all sub-parts addressed.

```
"(a) Chinna was trying to listen carefully and block out all other distractions.
(b) He could hear them because he was intensely focused on finding the ox. This suggests he was alert and anxious."
```

---

## 6. Answer Submission Format

The endpoint (`POST /tests/{test_id}/submit`) and the request body shape are **unchanged**. The only difference is the string format inside `student_answer` for new question types.

```json
{
  "answers": [
    { "question_id": "Section::q_slug", "student_answer": "..." }
  ]
}
```

**Quick reference — `student_answer` by type:**

| Type | Format | Example |
|---|---|---|
| `multiple_choice` | Exact text of selected option from `options[]` | `"He was mesmerized by their sound."` |
| `true_false` | `"True"` or `"False"`, optionally `". Justification."` | `"False. The bells made him feel proud."` |
| `fill_in_the_blank` | The word/phrase filling the blank | `"mesmerized"` |
| `short_answer` | Full typed response | `"The bells represented…"` |
| `long_answer` / `open_ended` / `application` | Full typed response | `"First, the author establishes…"` |
| `match_the_following` | `"1→B, 2→D, 3→A, 4→C"` | `"1→C, 2→A, 3→D, 4→B"` |
| `assertion_reasoning` | Exact text of selected option from `options[]` | `"(b) Both A and R are true, but R is not…"` |
| `extract_based` | Combined `"(a) … (b) … (c) …"` | `"(a) He was listening. (b) Because…"` |

> Unanswered questions can be omitted from the `answers` array — they score 0 automatically.

---

## 7. Grading Response Changes

### Per graded question

Two new fields alongside the existing `score_0_1` and `rationale`:

| Field | Type | Description |
|---|---|---|
| `marks` | `number` | Maximum marks for this question |
| `marks_awarded` | `number` | Raw marks given (e.g. `1.5` out of `2`) |

`score_0_1` is unchanged and remains the primary 0–1 signal. Use `marks_awarded / marks` to display a raw fraction like **"1.5 / 2"**.

### Per section result

Two new fields in `section_results[heading]`:

| Field | Type | Description |
|---|---|---|
| `total_marks` | `number` | Maximum marks available in this section |
| `marks_obtained` | `number` | Raw marks the student earned |

Use these to display **"7 / 9"** next to the ABOVE/AT/BELOW verdict chip.

### Overall scoring

`overall_score` is now **marks-weighted** — a 5-mark question counts more than a 1-mark question. This is a behaviour change but not a schema change: `overall_score` is still a float in `[0.0, 1.0]` and `overall_verdict` is still `ABOVE / AT / BELOW`.

---

## 8. Suggested UI Upgrades

These are optional enhancements that make the test feel like an authentic exam paper.

### Paper header

Show above question 1, using `paper_meta`:

```
The Tinkling Bells — Chapter Test
Grade 4  ·  English  ·  18 Marks  ·  27 Minutes

General Instructions
• All questions are compulsory.
• Section A (1 mark each) — choose the best answer.
• Section B (2 marks each) — answer in 2–3 sentences.
• Section C (3–5 marks each) — answer in detail.
```

### Section A / B / C dividers

Group all questions globally by `paper_section` and insert a section header between groups:

```ts
const allQuestions = response.sections.flatMap(s => s.questions);

const sectionA = allQuestions.filter(q => q.paper_section === "A");
const sectionB = allQuestions.filter(q => q.paper_section === "B");
const sectionC = allQuestions.filter(q => q.paper_section === "C");
```

Render as:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SECTION A — Objective Questions (1 mark each)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Q1.  [MCQ]
  Q2.  [True / False]
  …

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SECTION B — Short Answer (2 marks each)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Q5.  [Assertion-Reasoning]
  …
```

### Marks badge per question

```
Q3.  [assertion_reasoning]                     [2 marks]
```

Source: `question.marks`.

### Raw score in results

```
Section: Chinna and the Festival
─────────────────────────────────
Score:    7 / 9  (78%)
Verdict:  ▲ ABOVE — better than expected!
```

Source: `section_results[heading].marks_obtained` and `.total_marks`.

---

## 9. TypeScript Types

Drop these into your types file and extend your existing `GeneratedQuestion` / response interfaces.

```ts
type QuestionType =
  | "multiple_choice"
  | "fill_in_the_blank"
  | "short_answer"
  | "long_answer"          // new — same render as open_ended
  | "application"
  | "true_false"           // new
  | "match_the_following"  // new
  | "assertion_reasoning"  // new
  | "extract_based"        // new
  | "open_ended";          // legacy — still returned for old test rows

type BloomsLevel =
  | "remember" | "understand" | "apply"
  | "analyze"  | "evaluate"   | "create";

type PaperSection = "A" | "B" | "C";

interface MatchPair {
  left:  string;
  right: string;
}

interface GeneratedQuestion {
  // ── existing (unchanged) ────────────────────────────────────
  question_id:             string;
  section:                 string;
  tier:                    "Heavy Scaffolding" | "Moderate Scaffolding" | "Socratic" | "Stretch";
  type:                    QuestionType;
  prompt:                  string;
  options:                 string[] | null;
  expected_answer:         string;   // hidden from student
  expected_answer_rubric:  string;   // hidden from student
  lo_ids:                  string[];

  // ── new fields (all have safe defaults) ─────────────────────
  marks:                   1 | 2 | 3 | 5;
  paper_section:           PaperSection;
  blooms_level:            BloomsLevel;
  match_pairs:             MatchPair[] | null;
  assertion:               string | null;
  reason:                  string | null;
  extract_passage:         string | null;
  justification_required:  boolean;
}

interface PaperSectionMeta {
  label:               PaperSection;
  title:               string;
  question_types:      string[];
  marks_per_question:  string;
  question_count:      number;
}

interface PaperMeta {
  total_marks:            number;
  suggested_time_minutes: number;
  general_instructions:   string[];
  sections:               PaperSectionMeta[];
}

interface CreateChapterTestResponse {
  test_id:        string;
  document_title: string;
  subject:        string;
  grade:          number;
  sections:       SectionBlock[];
  paper_meta:     PaperMeta | null;   // new
}

interface GradedQuestion {
  question_id:     string;
  section:         string;
  tier:            string;
  lo_ids:          string[];
  expected_answer: string;
  student_answer:  string;
  score_0_1:       number;
  rationale:       string;
  marks:           number;  // new
  marks_awarded:   number;  // new
}

interface SectionResult {
  main_heading:   string;
  tier:           string;
  expected_score: number;
  actual_score:   number;
  delta:          number;
  verdict:        "ABOVE" | "AT" | "BELOW";
  total_marks:    number;  // new
  marks_obtained: number;  // new
}
```

---

## 10. Integration Checklist

Work top to bottom. Each step is independent — you can ship them separately.

### Phase 1 — Types (no visible change, zero risk)
- [ ] Add new fields to `GeneratedQuestion` interface
- [ ] Add `PaperMeta` and `PaperSectionMeta` interfaces
- [ ] Extend `QuestionType` union with 5 new values
- [ ] Add `marks`, `marks_awarded` to `GradedQuestion`
- [ ] Add `total_marks`, `marks_obtained` to `SectionResult`
- [ ] Add `paper_meta` to `CreateChapterTestResponse`

### Phase 2 — Question renderer (new type support)
- [ ] `true_false` — radio "True"/"False" + conditional justification textarea
- [ ] `match_the_following` — two-column UI from `match_pairs`; serialize as `"1→B, 2→D, …"`
- [ ] `assertion_reasoning` — render `assertion` + `reason` fields + radio from `options[]`
- [ ] `extract_based` — `extract_passage` in shaded box + combined textarea
- [ ] `long_answer` — identical to your existing `open_ended` renderer

### Phase 3 — Paper header (recommended, low effort)
- [ ] Render `paper_meta.general_instructions` above the first question
- [ ] Show total marks and time from `paper_meta`

### Phase 4 — Section grouping (recommended)
- [ ] Group all questions by `paper_section` across all chapter sections
- [ ] Insert Section A / B / C headers between groups
- [ ] Show `question.marks` as a badge on each question card

### Phase 5 — Results screen upgrade
- [ ] Show `marks_obtained / total_marks` per section
- [ ] Keep `overall_score` display unchanged (still 0–1, still maps to ABOVE/AT/BELOW)

---

## Backward-Compatibility Notes

| Scenario | What happens |
|---|---|
| Old test row returned by `GET /tests/{id}` | New nullable fields are absent or null; `marks` defaults to `1`, `paper_section` to `"A"`. Existing render logic still works. |
| `type: "open_ended"` on old rows | Valid type — render the same as `long_answer`. |
| `paper_meta` is `null` | Can occur if test was created before v2. Guard all access with `?.` — nothing should crash. |
| Student submits partial answers (skips some questions) | Safe — unsubmitted questions score 0. No API change needed. |
