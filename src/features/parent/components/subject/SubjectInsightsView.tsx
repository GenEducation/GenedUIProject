"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Library, Target, TrendingUp, type LucideIcon } from "lucide-react";
import { useSubjectInsights } from "../../hooks/useSubjectInsights";
import { usePortalBusy } from "../loader/PortalProgress";
import { GLASS } from "../home/theme";
import { formatDuration } from "../../utils/homeMetrics";
import { helpTips, summarySentence } from "./insights";
import { SubjectHero } from "./SubjectHero";
import { SkillMasterySection } from "./SkillMasterySection";
import { ProgressSection } from "./ProgressSection";
import { ChaptersSection } from "./ChaptersSection";
import { HelpCard } from "./HelpCard";

const SECTIONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "skills", label: "Skills", icon: Target },
  { id: "progress", label: "Progress", icon: TrendingUp },
  { id: "chapters", label: "Chapters", icon: Library },
];

/**
 * One subject in depth, written for a parent: a summary that answers "how
 * are they doing", then where they're strong or weak, whether they're
 * improving, and chapter-by-chapter progress, all on the report-card scale.
 */
export function SubjectInsightsView({
  studentId,
  subject,
  childName: fullName,
}: {
  studentId: string;
  subject: string;
  childName?: string | null;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const insights = useSubjectInsights(studentId, subject);
  const childName = fullName?.trim().split(/\s+/)[0] || "your child";
  const { summary, skills, trend, movers, chapters, subjectState } = insights;

  useEffect(() => {
    // Not one of this child's subjects (e.g. after switching child).
    if (subjectState === "invalid") router.replace(`/parent/${studentId}`);
  }, [subjectState, studentId, router]);

  const busy = [summary, skills, trend, movers, chapters].some((s) => s.state === "loading");
  usePortalBusy(busy);

  // A 0 with nothing checked yet means "not assessed", not "Developing".
  const mastery =
    summary.data.mastery === 0 && skills.state === "ready" && !skills.data.some((a) => a.assessed)
      ? null
      : summary.data.mastery;

  const sentence = useMemo(
    () => (summary.state === "loading" || skills.state === "loading"
      ? null
      : summarySentence(childName, subject, mastery, skills.data)),
    [summary.state, skills, childName, subject, mastery],
  );
  const tips = useMemo(() => (skills.state === "ready" ? helpTips(skills.data) : []), [skills]);

  // Null while loading; "—" when a figure isn't available.
  const stats = useMemo(() => {
    const rows = chapters.state === "ready" ? chapters.data : null;
    const sessions = summary.data.sessions ?? rows?.reduce((s, r) => s + r.sessions, 0);
    return {
      chapters: chapters.state === "loading" ? null : rows ? `${rows.filter((r) => r.started).length}/${rows.length}` : "—",
      sessions: summary.state === "loading" ? null : sessions === undefined ? "—" : String(sessions),
      time: chapters.state === "loading" ? null : rows ? formatDuration(rows.reduce((s, r) => s + r.minutes, 0)) : "—",
    };
  }, [chapters, summary]);

  const item = {
    hidden: reduce ? {} : { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.08 } } }}
      className="space-y-5"
    >
      <motion.div variants={item}>
        <SubjectHero
          studentId={studentId}
          subject={subject}
          childName={childName}
          mastery={mastery}
          loading={summary.state === "loading"}
          sentence={sentence}
          stats={stats}
        />
      </motion.div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
        <div className="min-w-0 space-y-5">
          <div className="sticky top-1 z-20 xl:hidden">
            <SectionNav />
          </div>
          {tips.length > 0 && (
            <motion.div variants={item} className="xl:hidden">
              <HelpCard tips={tips} childName={childName} />
            </motion.div>
          )}
          <motion.div variants={item}>
            <SkillMasterySection section={skills} subject={subject} childName={childName} />
          </motion.div>
          <motion.div variants={item}>
            <ProgressSection trend={trend} moverSection={movers} childName={childName} />
          </motion.div>
          <motion.div variants={item}>
            <ChaptersSection section={chapters} childName={childName} />
          </motion.div>
        </div>

        <motion.aside variants={item} className="hidden xl:block xl:sticky xl:top-1 xl:self-start">
          <div className="space-y-4">
            <SectionNav vertical />
            <HelpCard tips={tips} childName={childName} />
          </div>
        </motion.aside>
      </div>
    </motion.div>
  );
}

/** Jump links that follow the reader: a pill bar on small screens, a list beside the page on wide ones. */
function SectionNav({ vertical = false }: { vertical?: boolean }) {
  const [active, setActive] = useState(SECTIONS[0].id);
  const reduce = useReducedMotion();

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    if (els.length === 0 || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const go = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  if (vertical) {
    return (
      <nav aria-label="On this page" className={`rounded-[24px] p-3 ${GLASS}`}>
        <p className="px-3 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--pp-ink-soft)]">On this page</p>
        <ul className="space-y-0.5">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              {/* eslint-disable-next-line no-restricted-syntax -- in-page nav link styled like the sidebar nav */}
              <button
                type="button"
                onClick={() => go(id)}
                aria-current={active === id ? "true" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--pp-green)] ${
                  active === id ? "bg-[var(--pp-mint-strong)]/70 text-[var(--pp-ink)]" : "text-[var(--pp-ink-soft)] hover:bg-white/70"
                }`}
              >
                <Icon size={17} className={active === id ? "text-[var(--pp-green)]" : ""} />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="On this page" className="flex justify-center">
      <ul className={`inline-flex gap-1 rounded-full p-1 ${GLASS}`}>
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <li key={id} className="relative">
            {active === id && (
              <motion.span
                layoutId="pp-subject-nav"
                className="absolute inset-0 rounded-full bg-[var(--pp-ink)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {/* eslint-disable-next-line no-restricted-syntax -- segmented in-page nav over an animated highlight */}
            <button
              type="button"
              onClick={() => go(id)}
              aria-current={active === id ? "true" : undefined}
              className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--pp-green)] ${
                active === id ? "text-white" : "text-[var(--pp-ink-soft)] hover:text-[var(--pp-ink)]"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
