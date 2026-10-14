"use client";

import React from "react";
import { Check, CircleAlert } from "lucide-react";
import type { ReleaseProposal } from "../types/sources";
import { kindOf } from "../utils/releaseSummary";
import {
  FIGURE_ROLES,
  RECOVERY_ROLES,
  SECTION_RELATIONS,
  STEP_TYPES,
  answerOf,
  correctOptionIds,
  difficultyLabel,
  humanize,
  ids,
  list,
  namesFor,
  num,
  str,
  thinkingLevel,
  toolName,
  valueOf,
  type Rec,
  type ReleaseLookup,
} from "../utils/releaseDetails";

/**
 * What a reviewer needs to judge one part of a chapter's release, laid out for people rather than as raw data:
 * each kind (a concept, a question, a lesson step…) shows its own fields in plain words, and ids that point at
 * other parts of the release show those parts' names. Internals (embeddings, hashes, ids) are left out.
 */
export function ReleaseProposalDetails({ proposal, lookup }: { proposal: ReleaseProposal; lookup: ReleaseLookup }) {
  const v = valueOf(proposal);
  const body = (() => {
    switch (kindOf(proposal.kind)) {
      case "component": return <ConceptDetails v={v} lookup={lookup} />;
      case "item": return <QuestionDetails v={v} lookup={lookup} />;
      case "misconception": return <MistakeDetails v={v} lookup={lookup} />;
      case "lesson_node": return <StepDetails v={v} lookup={lookup} />;
      case "figure_group": return <FigureDetails v={v} lookup={lookup} />;
      case "asset": return <ImageDetails v={v} lookup={lookup} />;
      case "tool": return <ToolDetails v={v} lookup={lookup} />;
      case "chapter_plan": return <PlanDetails v={v} lookup={lookup} />;
      case "source_section": return <SectionDetails v={v} />;
      case "source_manifest": return <BookDetails v={v} />;
      case "graph_and_recovery": return <LinksDetails v={v} lookup={lookup} />;
      default: return <FallbackDetails v={v} />;
    }
  })();
  return <div className="mt-3 rounded-xl border border-[#122D30]/5 bg-[#F6F7F2]/70 p-3.5 md:p-4">{body}</div>;
}

/* ── building blocks ─────────────────────────────────────────────────────── */

function Fields({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>;
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  if (children === null || children === undefined || children === false) return null;
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-[10px] font-black uppercase tracking-widest text-[#122D30]/40">{label}</dt>
      <dd className="mt-1 text-[13px] leading-relaxed text-[#122D30]">{children}</dd>
    </div>
  );
}

function Chips({ items, tone = "plain" }: { items: string[]; tone?: "plain" | "good" }) {
  if (items.length === 0) return <span className="text-[#122D30]/40">None</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((t, i) => (
        <span
          key={`${t}-${i}`}
          className={`inline-block max-w-full truncate rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold ${
            tone === "good" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-[#122D30]/10 bg-white text-[#122D30]/80"
          }`}
          title={t}
        >
          {t}
        </span>
      ))}
    </span>
  );
}

/** Names of the ids a record points at, with a count for any not in this release. */
function Names({ idList, names, empty = "None" }: { idList: string[]; names: Map<string, string>; empty?: string }) {
  const { named, unnamed } = namesFor(idList, names);
  if (named.length === 0 && unnamed === 0) return <span className="text-[#122D30]/40">{empty}</span>;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {named.length > 0 && <Chips items={named} />}
      {unnamed > 0 && (
        <span className="text-[11.5px] text-[#122D30]/50">
          {named.length ? "+ " : ""}
          {unnamed} already published
        </span>
      )}
    </span>
  );
}

function Difficulty({ value }: { value: unknown }) {
  const d = difficultyLabel(value);
  if (!d) return null;
  return (
    <span className="flex items-center gap-2">
      <span className="font-semibold">{d.label}</span>
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-[#122D30]/10" aria-hidden>
        <span className="block h-full rounded-full bg-[#075E63]" style={{ width: `${Math.round(d.value * 100)}%` }} />
      </span>
    </span>
  );
}

function OrderedList({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-[#122D30]/40">None</span>;
  return (
    <ol className="space-y-1">
      {items.map((t, i) => (
        <li key={`${t}-${i}`} className="flex gap-2">
          <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[10.5px] font-black text-[#075E63] ring-1 ring-[#122D30]/10 tabular-nums">
            {i + 1}
          </span>
          <span className="min-w-0">{t}</span>
        </li>
      ))}
    </ol>
  );
}

/* ── one layout per kind ─────────────────────────────────────────────────── */

type KindProps = { v: Rec; lookup: ReleaseLookup };

function ConceptDetails({ v }: KindProps) {
  const passages = ids(v.source_chunk_ids).length;
  return (
    <Fields>
      <Field label="Definition" wide>{str(v.definition)}</Field>
      <Field label="Learning outcomes" wide><Chips items={ids(v.lo_codes)} /></Field>
      <Field label="Thinking level">{thinkingLevel(v.bloom)}</Field>
      <Field label="Difficulty"><Difficulty value={v.difficulty} /></Field>
      <Field label="Strand">{str(v.strand) ? humanize(str(v.strand)!) : null}</Field>
      <Field label="From the textbook">{passages ? `${passages} passage${passages === 1 ? "" : "s"}` : null}</Field>
      {str(v.unassessable_reason) && (
        <Field label="Not assessed" wide>
          <span className="flex items-start gap-1.5 text-amber-800">
            <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden /> {str(v.unassessable_reason)}
          </span>
        </Field>
      )}
    </Fields>
  );
}

function QuestionDetails({ v, lookup }: KindProps) {
  const options = list(v.options).map((o) => o as Rec);
  const optionText = new Map(options.map((o) => [str(o.id) ?? "", str(o.text) ?? "—"]));
  const correct = correctOptionIds(v.rule);
  const answer = answerOf(v.rule, optionText);
  const concepts = list(v.components).map((c) => c as Rec);
  const conceptIds = concepts.map((c) => str(c.component_id)).filter((x): x is string => !!x);
  const figures = ids(v.figure_group_ids).length;
  const checks = list(v.test_vectors).length;

  return (
    <div className="space-y-3.5">
      <Field label="Question" wide>
        <span className="font-semibold">{str(v.prompt)}</span>
      </Field>
      {options.length > 0 && (
        <Field label="Options" wide>
          <ul className="space-y-1.5">
            {options.map((o, i) => {
              const right = correct.has(str(o.id) ?? "");
              const mistake = str(o.misconception_id) ? lookup.mistake.get(str(o.misconception_id)!) : null;
              return (
                <li
                  key={str(o.id) ?? i}
                  className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 ${right ? "border-emerald-200 bg-emerald-50" : "border-[#122D30]/10 bg-white"}`}
                >
                  <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${right ? "bg-emerald-600 text-white" : "ring-1 ring-[#122D30]/20"}`}>
                    {right && <Check size={11} strokeWidth={3} aria-label="Correct" />}
                  </span>
                  <span className="min-w-0">
                    <span className={right ? "font-semibold text-emerald-900" : ""}>{str(o.text)}</span>
                    {mistake && <span className="block text-[11.5px] text-[#122D30]/55">Catches: {mistake}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </Field>
      )}
      <Fields>
        {answer && options.length === 0 && (
          <Field label={answer.label} wide>
            <Chips items={answer.values} tone="good" />
          </Field>
        )}
        <Field label="Tests these concepts" wide>
          <Names idList={conceptIds} names={lookup.concept} />
        </Field>
        <Field label="Thinking level">{thinkingLevel(v.bloom)}</Field>
        <Field label="Difficulty"><Difficulty value={v.difficulty} /></Field>
        <Field label="Counts towards mastery">{typeof v.mastery_eligible === "boolean" ? (v.mastery_eligible ? "Yes" : "No, practice only") : null}</Field>
        <Field label="From section">{str(v.section_version_id) ? lookup.section.get(str(v.section_version_id)!) ?? null : null}</Field>
        <Field label="Figures">{figures ? `${figures} figure${figures === 1 ? "" : "s"}` : null}</Field>
        <Field label="Answer checks">{checks ? `${checks} sample answer${checks === 1 ? "" : "s"} checked` : null}</Field>
      </Fields>
    </div>
  );
}

function MistakeDetails({ v, lookup }: KindProps) {
  return (
    <Fields>
      <Field label="The mistake" wide>{str(v.definition)}</Field>
      <Field label="About these concepts" wide><Names idList={ids(v.component_ids)} names={lookup.concept} /></Field>
      <Field label="Strand">{str(v.strand) ? humanize(str(v.strand)!) : null}</Field>
      <Field label="Code">{str(v.code) ? humanize(str(v.code)!) : null}</Field>
    </Fields>
  );
}

function StepDetails({ v, lookup }: KindProps) {
  const tools = list(v.tool_bindings).map((b) => str((b as Rec)?.tool_id)).filter((x): x is string => !!x);
  const figures = ids(v.figure_group_ids).length;
  return (
    <Fields>
      <Field label="Kind of step">
        {STEP_TYPES[str(v.type) ?? ""] ?? null}
        {v.teach_only === true && <span className="text-[#122D30]/50"> · teaching only</span>}
      </Field>
      <Field label="Time">{num(v.est_minutes) !== null ? `About ${num(v.est_minutes)} min` : null}</Field>
      <Field label="Concepts" wide><Names idList={ids(v.component_ids)} names={lookup.concept} /></Field>
      <Field label="Check questions" wide>
        {ids(v.check_item_ids).length ? <OrderedList items={ids(v.check_item_ids).map((id) => lookup.question.get(id) ?? "A published question")} /> : null}
      </Field>
      <Field label="Textbook sections" wide><Names idList={ids(v.section_version_ids)} names={lookup.section} /></Field>
      <Field label="Thinking level">{thinkingLevel(v.bloom)}</Field>
      <Field label="Talk needed to move on">{num(v.engagement_required) !== null ? `${num(v.engagement_required)} exchange${num(v.engagement_required) === 1 ? "" : "s"}` : null}</Field>
      <Field label="Figures">{figures ? `${figures}` : null}</Field>
      <Field label="Tools">{tools.length ? <Names idList={tools} names={lookup.tool} /> : null}</Field>
    </Fields>
  );
}

function FigureDetails({ v, lookup }: KindProps) {
  const id = str(v.id);
  const images = id ? lookup.figureImages.get(id) ?? [] : [];
  return (
    <Fields>
      <Field label="Used as">{FIGURE_ROLES[str(v.role) ?? ""] ?? null}</Field>
      <Field label="Order in section">{num(v.reading_order)}</Field>
      <Field label="In section" wide>{str(v.section_version_id) ? lookup.section.get(str(v.section_version_id)!) ?? null : null}</Field>
      <Field label="Shows" wide>{images.length ? <OrderedList items={images} /> : null}</Field>
      <Field label="Concepts" wide>{ids(v.component_ids).length ? <Names idList={ids(v.component_ids)} names={lookup.concept} /> : null}</Field>
    </Fields>
  );
}

function ImageDetails({ v, lookup }: KindProps) {
  return (
    <Fields>
      <Field label="What a student is told it shows" wide>{str(v.learner_alt_text)}</Field>
      <Field label="What the tutor sees" wide>{str(v.tutor_description)}</Field>
      <Field label="Text printed in it" wide>{str(v.printed_text)}</Field>
      <Field label="Kind">{str(v.kind) === "verified_render" ? "Redrawn and checked" : str(v.kind) === "textbook_extract" ? "Cropped from the textbook" : null}</Field>
      <Field label="Page">{num(v.source_page)}</Field>
      <Field label="In section" wide>{str(v.section_version_id) ? lookup.section.get(str(v.section_version_id)!) ?? null : null}</Field>
    </Fields>
  );
}

function ToolDetails({ v, lookup }: KindProps) {
  return (
    <Fields>
      <Field label="Tool">{toolName(str(v.code))}</Field>
      <Field label="Version">{str(v.version)}</Field>
      <Field label="Used for these concepts" wide><Names idList={ids(v.component_ids)} names={lookup.concept} /></Field>
    </Fields>
  );
}

function PlanDetails({ v, lookup }: KindProps) {
  const coverage = (v.lo_coverage && typeof v.lo_coverage === "object" ? v.lo_coverage : {}) as Record<string, string>;
  const los = ids(v.lo_codes);
  return (
    <Fields>
      <Field label="Learning outcomes" wide>
        <span className="flex flex-wrap gap-1.5">
          {los.map((lo) => (
            <span key={lo} className="inline-flex items-center gap-1 rounded-full border border-[#122D30]/10 bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-[#122D30]/80">
              {lo}
              {coverage[lo] && (
                <span className={`rounded-full px-1.5 text-[10px] font-bold ${coverage[lo] === "full" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {coverage[lo] === "full" ? "fully" : "partly"}
                </span>
              )}
            </span>
          ))}
        </span>
      </Field>
      <Field label="Lesson steps, in order" wide>
        <OrderedList items={ids(v.node_ids).map((id) => lookup.step.get(id) ?? "A published step")} />
      </Field>
    </Fields>
  );
}

function SectionDetails({ v }: { v: Rec }) {
  const chunks = list(v.chunks).map((c) => c as Rec);
  const path = ids(v.path);
  const start = num(v.page_start);
  const end = num(v.page_end);
  return (
    <Fields>
      <Field label="Where in the chapter" wide>{path.length ? path.join(" › ") : null}</Field>
      <Field label="Pages">{start ? `${start}${end && end !== start ? `–${end}` : ""}` : null}</Field>
      <Field label="Passages read">{chunks.length || null}</Field>
      <Field label="Starts with" wide>
        {chunks.length ? (
          <span className="block border-l-2 border-[#075E63]/30 pl-3 italic text-[#122D30]/70 line-clamp-4">{str(chunks[0].text)}</span>
        ) : null}
      </Field>
    </Fields>
  );
}

function BookDetails({ v }: { v: Rec }) {
  const chapters = list(v.chapters).map((c) => c as Rec);
  return (
    <Fields>
      <Field label="Book">{str(v.book_title)}</Field>
      <Field label="Edition">{str(v.edition_label)}</Field>
      <Field label="Subject">{str(v.subject) ? humanize(str(v.subject)!) : null}</Field>
      <Field label="Grade">{num(v.grade)}</Field>
      <Field label="Board">{str(v.board)?.toUpperCase() ?? null}</Field>
      <Field label="Publisher">{str(v.publisher) ? humanize(str(v.publisher)!) : null}</Field>
      <Field label="Pages in the PDF">{num(v.page_count)}</Field>
      <Field label="Chapters" wide>
        {chapters.length ? <OrderedList items={chapters.map((c) => `Ch ${num(c.ordinal) ?? "?"}: ${str(c.title) ?? ""}`)} /> : null}
      </Field>
    </Fields>
  );
}

function LinksDetails({ v, lookup }: KindProps) {
  const concept = (id: unknown) => (str(id) ? lookup.concept.get(str(id)!) ?? "A published concept" : "—");
  const prereqs = list(v.prerequisites).map((p) => p as Rec);
  const recovery = list(v.recovery).map((r) => r as Rec);
  const sections = list(v.section_components).map((s) => s as Rec);
  return (
    <div className="space-y-4">
      <Field label={`Learn this first · ${prereqs.length}`} wide>
        {prereqs.length ? (
          <ul className="space-y-1.5">
            {prereqs.map((p, i) => (
              <li key={i}>
                <span className="font-semibold">{concept(p.source_id)}</span>
                <span className="text-[#122D30]/45"> before </span>
                <span className="font-semibold">{concept(p.target_id)}</span>
                {str(p.basis) && <span className="block text-[11.5px] text-[#122D30]/55">{str(p.basis)}</span>}
              </li>
            ))}
          </ul>
        ) : <span className="text-[#122D30]/40">None</span>}
      </Field>
      <Field label={`If a student is stuck · ${recovery.length}`} wide>
        {recovery.length ? (
          <ul className="space-y-1">
            {recovery.map((r, i) => (
              <li key={i}>
                On <span className="font-semibold">{concept(r.component_id)}</span>
                <span className="text-[#122D30]/45">: </span>
                {str(r.node_id) ? lookup.step.get(str(r.node_id)!) ?? "a published step" : "a step"}
                {RECOVERY_ROLES[str(r.role) ?? ""] && <span className="text-[#122D30]/50"> ({RECOVERY_ROLES[str(r.role)!].toLowerCase()})</span>}
              </li>
            ))}
          </ul>
        ) : <span className="text-[#122D30]/40">None</span>}
      </Field>
      <Field label={`What each section covers · ${sections.length}`} wide>
        {sections.length ? (
          <ul className="space-y-1">
            {sections.map((s, i) => (
              <li key={i}>
                <span className="font-semibold">{str(s.section_version_id) ? lookup.section.get(str(s.section_version_id)!) ?? "A section" : "A section"}</span>
                <span className="text-[#122D30]/45"> {SECTION_RELATIONS[str(s.relation) ?? ""] ?? "covers"} </span>
                <span className="font-semibold">{concept(s.component_id)}</span>
              </li>
            ))}
          </ul>
        ) : <span className="text-[#122D30]/40">None</span>}
      </Field>
    </div>
  );
}

/** A kind this view doesn't know yet: its plain text fields, never ids or hashes. */
function FallbackDetails({ v }: { v: Rec }) {
  const fields = Object.entries(v).filter(
    ([k, val]) => typeof val === "string" && val.trim() && !/(^id$|_id$|hash|uri|embedding)/.test(k) && val.length < 400,
  );
  if (fields.length === 0) return <p className="text-[13px] text-[#122D30]/50">Nothing more to show for this part.</p>;
  return (
    <Fields>
      {fields.map(([k, val]) => (
        <Field key={k} label={humanize(k)} wide={(val as string).length > 60}>{val as string}</Field>
      ))}
    </Fields>
  );
}
