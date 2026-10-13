"use client";

import React, { useMemo, useState } from "react";
import { Target } from "lucide-react";
import { BAND_TONES, type MasteryBand } from "@/components/report-card/subjectVisuals";
import type { Section } from "../../hooks/useSubjectInsights";
import { GlassSkeleton } from "../loader/GlassSkeleton";
import { groupAreas, type Bucket, type SkillArea } from "./insights";
import { EmptyNote, SectionCard } from "./parts";
import { SkillAreaRow } from "./SkillAreaRow";

const BUCKETS: { key: Bucket; title: string; hint: string; tone: MasteryBand }[] = [
  { key: "strengths", title: "Strengths", hint: "60 and above", tone: "Proficient" },
  { key: "building", title: "Building up", hint: "40 to 59", tone: "Approaching" },
  { key: "attention", title: "Needs attention", hint: "Below 40", tone: "Developing" },
];

export function SkillMasterySection({
  section,
  subject,
  childName,
}: {
  section: Section<SkillArea[]>;
  subject: string;
  childName: string;
}) {
  const groups = useMemo(() => groupAreas(section.data), [section.data]);
  const [filter, setFilter] = useState<Bucket | "all">("all");
  const assessedCount = groups.strengths.length + groups.building.length + groups.attention.length;

  const lede =
    section.state !== "ready" || assessedCount === 0
      ? `Each skill area in ${subject}, scored from the questions ${childName} has answered.`
      : `${assessedCount} skill area${assessedCount === 1 ? "" : "s"} checked so far. Tap one to see the concepts inside it and why it scored the way it did.`;

  return (
    <SectionCard id="skills" icon={Target} eyebrow="Skill mastery" title={`Where ${childName} stands`} lede={lede}>
      {section.state === "loading" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => <GlassSkeleton key={i} className="h-[84px] rounded-2xl" />)}
          </div>
          {[0, 1, 2, 3].map((i) => <GlassSkeleton key={i} className="h-[68px] rounded-2xl" />)}
        </div>
      ) : section.state === "error" ? (
        <EmptyNote>Skill scores aren&apos;t available right now. Please check back a little later.</EmptyNote>
      ) : section.data.length === 0 ? (
        <EmptyNote>No skills have been checked in {subject} yet. They&apos;ll show up here after {childName}&apos;s first few lessons.</EmptyNote>
      ) : (
        <>
          <div role="group" aria-label="Filter skill areas" className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {BUCKETS.map((b) => {
              const tone = BAND_TONES[b.tone];
              const count = groups[b.key].length;
              const active = filter === b.key;
              return (
                <button // eslint-disable-line no-restricted-syntax -- filter tile coloured by mastery band
                  key={b.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(active ? "all" : b.key)}
                  className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pp-green)] sm:p-4 ${active ? "shadow-[0_12px_26px_-18px_rgba(19,41,61,0.45)]" : ""}`}
                  style={{
                    background: active ? tone.tint : `linear-gradient(180deg, ${tone.wash[0]}, ${tone.wash[1]})`,
                    borderColor: active ? tone.accent : tone.edge,
                  }}
                >
                  <span className="absolute inset-y-0 left-0 w-1" style={{ background: tone.accent }} aria-hidden />
                  <span className="block text-[26px] font-extrabold leading-none tabular-nums sm:text-[30px]" style={{ color: tone.ink }}>{count}</span>
                  <span className="mt-1.5 block text-[12.5px] font-bold leading-tight text-[var(--pp-ink)] sm:text-[13.5px]">{b.title}</span>
                  <span className="mt-0.5 hidden text-[11px] text-[var(--pp-ink-soft)] sm:block">{b.hint}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 space-y-5">
            {BUCKETS.filter((b) => filter === "all" || filter === b.key).map((b) =>
              groups[b.key].length === 0 ? (
                filter === b.key ? <EmptyNote key={b.key}>Nothing in “{b.title}” right now.</EmptyNote> : null
              ) : (
                <AreaGroup key={b.key} title={b.title} tone={b.tone} areas={groups[b.key]} />
              ),
            )}
            {filter === "all" && groups.notYet.length > 0 && (
              <AreaGroup title="Not checked yet" tone="Not started" areas={groups.notYet} />
            )}
          </div>
        </>
      )}
    </SectionCard>
  );
}

function AreaGroup({ title, tone, areas }: { title: string; tone: MasteryBand; areas: SkillArea[] }) {
  return (
    <div>
      <h3 className="mb-2.5 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--pp-ink-soft)]">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: BAND_TONES[tone].accent }} />
        {title}
        <span className="font-semibold normal-case tracking-normal">({areas.length})</span>
      </h3>
      <ul className="space-y-2">
        {areas.map((a) => <SkillAreaRow key={a.id} area={a} />)}
      </ul>
    </div>
  );
}
