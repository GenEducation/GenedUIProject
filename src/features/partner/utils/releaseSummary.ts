import type { ReleaseProposal } from "../types/sources";

/**
 * A release's proposals in a partner's words: what each kind is, in the order a
 * reviewer reads a chapter (its concepts first, the bookkeeping last), and a
 * one-line summary of each proposal's content. The content is the backend's
 * release bundle (gened_curriculum.bundle); only a few well-known fields are
 * read, and anything else stays in the proposal's "Details".
 */
export interface KindInfo {
  label: string;
  /** What the reviewer is agreeing to when they accept one. */
  hint: string;
}

const KINDS: Record<string, KindInfo> = {
  component: { label: "Concepts", hint: "What the chapter teaches, each with its definition and learning outcomes." },
  item: { label: "Questions", hint: "Practice questions with their answers." },
  lesson_node: { label: "Lesson steps", hint: "The steps a student works through, in order." },
  misconception: { label: "Common mistakes", hint: "Mistakes the tutor watches for." },
  figure_group: { label: "Figures", hint: "Textbook figures and where they are shown." },
  asset: { label: "Images", hint: "Images cropped from the textbook." },
  tool: { label: "Tools", hint: "Interactive tools used in the lesson." },
  chapter_plan: { label: "Lesson plan", hint: "The order of the lesson and the outcomes it covers." },
  source_section: { label: "Textbook sections", hint: "The sections read from the PDF." },
  source_manifest: { label: "Book details", hint: "Which book, edition and chapter this is." },
  graph_and_recovery: { label: "Links between concepts", hint: "Which concepts come before others, and how to recover." },
};

export const KIND_ORDER = Object.keys(KINDS);

/** `chapter_plan:6` → `chapter_plan`. */
export const kindOf = (kind: string) => kind.split(":")[0];

export const kindInfo = (kind: string): KindInfo =>
  KINDS[kindOf(kind)] ?? { label: kindOf(kind).replace(/_/g, " "), hint: "" };

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const list = (v: unknown) => (Array.isArray(v) ? v : []);

/** A proposal's title and, when there is one, a line of detail. */
export function summarize(p: ReleaseProposal): { title: string; detail: string | null } {
  const c = p.content;
  switch (kindOf(p.kind)) {
    case "component":
      return { title: str(c.title) ?? "Concept", detail: str(c.definition) };
    case "item": {
      const options = list(c.options)
        .map((o) => (typeof o === "string" ? o : str((o as Record<string, unknown>)?.text) ?? str((o as Record<string, unknown>)?.label)))
        .filter(Boolean);
      return { title: str(c.prompt) ?? "Question", detail: options.length ? `Options: ${options.join(" · ")}` : null };
    }
    case "lesson_node":
      return {
        title: str(c.title) ?? "Lesson step",
        detail: [str(c.type), typeof c.est_minutes === "number" ? `${c.est_minutes} min` : null].filter(Boolean).join(" · ") || null,
      };
    case "misconception":
      return { title: str(c.definition) ?? str(c.code) ?? "Common mistake", detail: str(c.code) };
    case "chapter_plan": {
      const steps = list(c.node_ids).length;
      const los = list(c.lo_codes).map(String);
      return {
        title: `Chapter ${c.chapter_ordinal ?? ""}: ${steps} lesson step${steps === 1 ? "" : "s"}`.trim(),
        detail: los.length ? `Covers ${los.join(", ")}` : null,
      };
    }
    case "source_section":
      return {
        title: str(c.title) ?? "Section",
        detail: c.page_start ? `Pages ${c.page_start}${c.page_end && c.page_end !== c.page_start ? `–${c.page_end}` : ""}` : null,
      };
    case "source_manifest":
      return {
        title: [str(c.book_title), str(c.edition_label)].filter(Boolean).join(" · ") || "Book",
        detail: [str(c.subject), c.grade ? `Grade ${c.grade}` : null, str(c.board)].filter(Boolean).join(" · ") || null,
      };
    case "graph_and_recovery":
      return {
        title: `${list(c.prerequisites).length} prerequisite links`,
        detail: `${list(c.recovery).length} recovery paths`,
      };
    default:
      return {
        title: str(c.title) ?? str(c.caption) ?? str(c.name) ?? str(c.role) ?? kindInfo(p.kind).label,
        detail: str(c.description) ?? str(c.kind),
      };
  }
}

/** The content to show under "Details": everything but embeddings, which mean nothing to a reader. */
export function detailsOf(p: ReleaseProposal): string {
  return JSON.stringify(p.content, (key, value) => (key === "embedding" ? undefined : value), 2);
}

/** Proposals grouped by kind, in reading order. */
export function groupByKind(proposals: ReleaseProposal[]): { kind: string; info: KindInfo; proposals: ReleaseProposal[] }[] {
  const groups = new Map<string, ReleaseProposal[]>();
  for (const p of proposals) groups.set(kindOf(p.kind), [...(groups.get(kindOf(p.kind)) ?? []), p]);
  const rank = (k: string) => (KIND_ORDER.includes(k) ? KIND_ORDER.indexOf(k) : KIND_ORDER.length);
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([kind, ps]) => ({ kind, info: kindInfo(kind), proposals: ps }));
}
