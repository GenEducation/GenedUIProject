import { http, HttpResponse } from "msw";
import type {
  PlacementBlockAnswer,
  PlacementBlockContent,
  PlacementItem,
  PlacementResponse,
} from "@/features/placement/types/placement";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const PLACEMENT = `${BASE}/api/onboarding/placement`;

/**
 * A miniature grade-6/7 form: nine items, one of every `item_type`, split
 * into four batches. Batch 0 deliberately mixes three subjects across its
 * five cards, mirroring the contract's own first-batch example
 * (`mcq_1` English, `mcq_2` Geography, `true_false_1` Science, `visual_1`
 * Geography chart, `flex_1` English order) — a batch carries no subject of
 * its own, so exercising that mix is the whole point of this fixture.
 */
export const PLACEMENT_ITEMS: PlacementItem[] = [
  {
    item_id: "CBSE-G6-ENG-01",
    index: 0,
    subject: "English",
    strand: "Vocabulary",
    item_type: "mcq",
    slot: "mcq_1",
    prompt: "Which word means 'happy'?",
    block_spec: {
      options: [
        { id: "a", text: "Joyful" },
        { id: "b", text: "Angry" },
        { id: "c", text: "Tired" },
        { id: "d", text: "Bored" },
      ],
    },
    item_language: "en",
    expected_time_sec: 30,
  },
  {
    item_id: "CBSE-G6-GEO-01",
    index: 1,
    subject: "Geography",
    strand: "Landforms",
    item_type: "multi_select",
    slot: "mcq_2",
    prompt: "Which of these are landforms?",
    block_spec: {
      options: [
        { id: "a", text: "Plateau" },
        { id: "b", text: "Monsoon" },
        { id: "c", text: "Valley" },
      ],
    },
    item_language: "en",
  },
  {
    item_id: "CBSE-G6-SCI-01",
    index: 2,
    subject: "Science",
    strand: "Matter",
    item_type: "true_false",
    slot: "true_false_1",
    prompt: "Read the statement and decide.",
    block_spec: { statement: "Ice is less dense than liquid water." },
    item_language: "en",
  },
  {
    item_id: "CBSE-G6-GEO-03",
    index: 3,
    subject: "Geography",
    strand: "Rainfall",
    item_type: "chart",
    slot: "visual_1",
    prompt: "Which month received the most rainfall?",
    block_spec: {
      chart_type: "bar",
      data: [
        { id: "jun", label: "Jun", value: 40 },
        { id: "jul", label: "Jul", value: 90 },
        { id: "aug", label: "Aug", value: 70 },
      ],
      y_label: "Rainfall (mm)",
    },
    item_language: "en",
  },
  {
    item_id: "CBSE-G6-ENG-02",
    index: 4,
    subject: "English",
    strand: "Fractions",
    item_type: "order",
    slot: "flex_1",
    prompt: "Put these fractions in order, smallest first.",
    block_spec: {
      items: [
        { id: "f1", text: "1/2" },
        { id: "f2", text: "1/8" },
        { id: "f3", text: "3/4" },
      ],
    },
    item_language: "en",
  },
  {
    item_id: "CBSE-G6-MATH-01",
    index: 5,
    subject: "Mathematics",
    strand: "Money",
    item_type: "numeric",
    slot: "flex_1",
    prompt: "A book costs ₹185 and a pen costs ₹220. What do they cost together?",
    block_spec: { input: "integer", unit: "₹" },
    item_language: "en",
    expected_time_sec: 60,
  },
  {
    item_id: "CBSE-G6-ENG-03",
    index: 6,
    subject: "English",
    strand: "Grammar",
    item_type: "fill_blank",
    slot: "mcq_1",
    prompt: "She wanted to go out, ___ it was raining.",
    block_spec: { input: "word" },
    item_language: "en",
  },
  {
    item_id: "CBSE-G6-HIN-01",
    index: 7,
    subject: "Hindi",
    strand: "व्याकरण",
    item_type: "mcq",
    slot: "mcq_1",
    // Hindi items are authored in Devanagari, prompt and options alike — the
    // fixture keeps that so the Mukta font path is actually exercised.
    prompt: "इनमें से कौन सा शब्द संज्ञा है?",
    block_spec: {
      options: [
        { id: "a", text: "दौड़ना" },
        { id: "b", text: "पुस्तक" },
        { id: "c", text: "सुंदर" },
      ],
    },
    item_language: "hi",
  },
  {
    item_id: "CBSE-G7-GEO-02",
    index: 8,
    subject: "Geography",
    strand: "Rivers",
    item_type: "map_point",
    slot: "visual_1",
    prompt: "On the outline map of India, click on the point where the River Ganga meets the Bay of Bengal.",
    // Real dimensions/tolerance/hash, verified against the backend's
    // assets.json this session. Exercises `india-rivers-outline`.
    block_spec: {
      image: "india-rivers-outline",
      width: 21000,
      height: 29700,
      tolerance: 900,
      source_url: "https://www.d-maps.com/carte.php?num_car=346025&lang=en",
      sha256: "c989ac260d275557e9f7c5d7ff4e973f129ca7abf933e332e1baa87b802c975f",
    },
    item_language: "en",
  },
  {
    item_id: "CBSE-G6-GEO-06",
    index: 9,
    subject: "Geography",
    strand: "Political Map",
    item_type: "map_point",
    slot: "visual_1",
    prompt: "On the outline map of India, click on the state of Uttar Pradesh.",
    // Exercises the other vendored asset, `india-states-outline` — both
    // maps are genuinely served today (two map items per grade, 6-9).
    block_spec: {
      image: "india-states-outline",
      width: 21000,
      height: 29700,
      tolerance: 1100,
      source_url: "https://www.d-maps.com/carte.php?num_car=346069&lang=en",
      sha256: "ded7c92a2f23fa5ff8fab829c1344f5c128434ca2aa0204bad5b80268d450cc9",
    },
    item_language: "en",
  },
  {
    item_id: "CBSE-G6-GEO-07",
    index: 10,
    subject: "Geography",
    strand: "Map Skills",
    item_type: "match",
    slot: "flex_1",
    prompt: "Match each river to the sea it flows into.",
    block_spec: {
      left: [
        { id: "l1", text: "Ganga" },
        { id: "l2", text: "Narmada" },
      ],
      right: [
        { id: "r1", text: "Arabian Sea" },
        { id: "r2", text: "Bay of Bengal" },
      ],
    },
    item_language: "en",
  },
];

const BLOCK_SPEC = [
  { item_count: 5, start_index: 0 },
  { item_count: 2, start_index: 5 },
  { item_count: 2, start_index: 7 },
  { item_count: 2, start_index: 9 },
];

/**
 * Attempt state, in module scope so a spec can drive a whole form through the
 * handlers. `resetPlacementFixture` puts it back — call it in `beforeEach`.
 */
const answered = new Map<string, PlacementResponse>();

export function resetPlacementFixture() {
  answered.clear();
}

function itemsForBlock(blockIndex: number): PlacementItem[] {
  const spec = BLOCK_SPEC[blockIndex];
  return PLACEMENT_ITEMS.slice(spec.start_index, spec.start_index + spec.item_count);
}

function answeredCountForBlock(blockIndex: number): number {
  return itemsForBlock(blockIndex).filter((item) => answered.has(item.item_id)).length;
}

/** The first block with an unanswered item, or null once every block is done. */
function firstIncompleteBlockIndex(): number | null {
  for (let i = 0; i < BLOCK_SPEC.length; i++) {
    if (answeredCountForBlock(i) < BLOCK_SPEC[i].item_count) return i;
  }
  return null;
}

function slotsForBlock(blockIndex: number): PlacementItem["slot"][] {
  return itemsForBlock(blockIndex).map((item) => item.slot);
}

function blockSummaries() {
  return BLOCK_SPEC.map((spec, i) => ({
    block_index: i,
    item_count: spec.item_count,
    start_index: spec.start_index,
    answered: answeredCountForBlock(i),
    slots: slotsForBlock(i),
  }));
}

function blockContent(blockIndex: number): PlacementBlockContent {
  const spec = BLOCK_SPEC[blockIndex];
  return {
    block_index: blockIndex,
    item_count: spec.item_count,
    start_index: spec.start_index,
    answered: answeredCountForBlock(blockIndex),
    slots: slotsForBlock(blockIndex),
    items: itemsForBlock(blockIndex),
  };
}

const SUBJECTS = ["English", "Geography", "Science", "Mathematics", "Hindi"];

export const placementHandlers = [
  http.get(`${PLACEMENT}/status/:studentId`, () => {
    const incompleteIdx = firstIncompleteBlockIndex();
    return HttpResponse.json({
      board: "CBSE",
      grade: 6,
      attempt_status: incompleteIdx === null ? "COMPLETED" : answered.size === 0 ? "NOT_STARTED" : "IN_PROGRESS",
      current_index: answered.size,
      total_items: PLACEMENT_ITEMS.length,
      subjects: SUBJECTS.map((subject) => ({ subject, status: "PENDING" })),
    });
  }),

  // Idempotent by construction: it reports the same frozen order and
  // whichever block is still incomplete, which is exactly what resume relies
  // on — including re-serving a block half-answered from a previous session.
  http.post(`${PLACEMENT}/start`, () => {
    const incompleteIdx = firstIncompleteBlockIndex();
    return HttpResponse.json({
      attempt_id: "attempt-1",
      student_id: "student-1",
      board: "CBSE",
      grade: 6,
      bank_version: "2.0",
      status: incompleteIdx === null ? "COMPLETED" : "IN_PROGRESS",
      current_index: answered.size,
      total_items: PLACEMENT_ITEMS.length,
      total_blocks: BLOCK_SPEC.length,
      blocks: blockSummaries(),
      current_block: incompleteIdx === null ? null : blockContent(incompleteIdx),
      is_complete: incompleteIdx === null,
    });
  }),

  http.get(`${PLACEMENT}/:attemptId/block`, ({ request }) => {
    const requested = Number(new URL(request.url).searchParams.get("block_index") ?? "0");
    const currentIdx = firstIncompleteBlockIndex() ?? BLOCK_SPEC.length - 1;
    if (requested > currentIdx) {
      return HttpResponse.json({ error_code: "ONBD_1106" }, { status: 400 });
    }
    return HttpResponse.json(blockContent(requested));
  }),

  http.post(`${PLACEMENT}/:attemptId/block`, async ({ request }) => {
    const body = (await request.json()) as { answers: PlacementBlockAnswer[] };

    // Re-answering is a no-op that returns current state — it does not
    // re-grade and does not advance. Specs rely on this to test retries.
    let accepted = 0;
    for (const answer of body.answers) {
      if (!answered.has(answer.item_id)) {
        answered.set(answer.item_id, answer.response);
        accepted += 1;
      }
    }

    const incompleteIdx = firstIncompleteBlockIndex();
    return HttpResponse.json({
      accepted,
      current_index: answered.size,
      total_items: PLACEMENT_ITEMS.length,
      is_complete: incompleteIdx === null,
      next_block: incompleteIdx === null ? null : blockContent(incompleteIdx),
    });
  }),

  http.get(`${PLACEMENT}/:attemptId/result`, () => {
    if (firstIncompleteBlockIndex() !== null) {
      return HttpResponse.json({ error_code: "ONBD_1107" }, { status: 409 });
    }
    return HttpResponse.json({
      attempt_id: "attempt-1",
      board: "CBSE",
      grade: 6,
      bank_version: "2.0",
      correct: 8,
      total: 11,
      normalized_score: 0.73,
      raw_score: 3,
      subjects: [
        { subject: "English", correct: 2, total: 3, normalized_score: 0.67, raw_score: 3 },
        { subject: "Geography", correct: 4, total: 5, normalized_score: 0.8, raw_score: 3 },
        { subject: "Science", correct: 1, total: 1, normalized_score: 1, raw_score: 4 },
        { subject: "Mathematics", correct: 1, total: 1, normalized_score: 1, raw_score: 4 },
        { subject: "Hindi", correct: 0, total: 1, normalized_score: 0, raw_score: 0 },
      ],
      skills: [
        {
          skill_ref: "CBSE.G6.GEO.PHYS.LANDFORMS",
          subject: "Geography",
          strand: "Landforms",
          correct: 1,
          total: 1,
          normalized_score: 1,
          raw_score: 4,
        },
      ],
      items: PLACEMENT_ITEMS.map((item, i) => ({
        item_id: item.item_id,
        subject: item.subject,
        strand: item.strand,
        prompt: item.prompt,
        response: answered.get(item.item_id) ?? { choice: "a" },
        is_correct: i % 4 !== 1,
        answer_key: { choice: "b" },
        explanation: "Because that is the one the rule applies to.",
      })),
    });
  }),
];
