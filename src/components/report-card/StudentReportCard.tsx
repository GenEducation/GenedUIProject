"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  BookOpen, Zap, ChevronDown, ChevronRight,
  Target, Clock, Star,
  BarChart3, FileText, Brain, Activity,
  Download, Printer, ChevronUp, ScrollText, RefreshCw,
} from "lucide-react";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { studentService } from "@/features/student/services/studentService";
import { getStudentDisplayName, titleCase } from "@/features/student/utils/displayName";

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

interface SubjectData {
  subject: string;
  overall_score: number;
  skill_index: number;
  adaptive_mode: string;
  session_count: number;
}

interface ChapterMasteryItem {
  subject: string;
  document_title: string;
  completion_percentage: number;
  mastery_score: number;
  study_count: number;
  grade: number;
  chapter_report?: string | null;
}

interface SkillLOItem {
  skill_id: string;
  skill_name: string;
  mastery_level: number;
  assessment_count: number;
}

interface SkillConceptItem {
  c_id: string;
  c_name: string;
  los: SkillLOItem[];
}

interface SkillCGItem {
  subject: string;
  cg_id: string;
  cg_name: string;
  avg_mastery: number;
  concepts: SkillConceptItem[];
}

interface TestSubmission {
  submission_id: string;
  test_id: string;
  document_title: string;
  subject: string;
  grade: number;
  overall_score: number;
  overall_verdict: string;
  section_results: Record<string, { score?: number; correct?: number; total?: number; verdict?: string }>;
  submitted_at: string;
}

interface DashboardProfile {
  name: string;
  grade?: number | null;
  board?: string | null;
  avatar_initials: string;
}

interface EvolutionAnalysisData {
  student_id: string;
  subject: string;
  document_title: string;
  conversation_count: number;
  adapted: boolean | null;
  headline: string | null;
  skill_score_trajectory: string | null;
  analysis_json: Record<string, any> | null;
  analysis_markdown: string | null;
  updated_at: string | null;
}

interface SubjectEvolutionData {
  student_id: string;
  subject: string;
  chapter_count: number;
  overall_adapted: boolean | null;
  headline: string | null;
  subject_skill_trajectory: string | null;
  analysis_json: Record<string, any> | null;
  analysis_markdown: string | null;
  updated_at: string | null;
}

interface StudentProgressData {
  student_id: string;
  subject_count: number;
  headline: string | null;
  overall_assessment: string | null;
  tutor_effectiveness: string | null;
  report_json: Record<string, any> | null;
  report_markdown: string | null;
  updated_at: string | null;
}

// ─────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────

const SUBJECT_ACCENTS = [
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
];

// ─────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────

function masteryColor(level: number): string {
  if (level >= 0.8) return "#059F6D";
  if (level >= 0.6) return "#10B981";
  if (level >= 0.4) return "#F59E0B";
  if (level >= 0.2) return "#F97316";
  return "#EF4444";
}

function masteryLabel(level: number): string {
  if (level >= 0.8) return "Advanced";
  if (level >= 0.6) return "Proficient";
  if (level >= 0.4) return "Approaching";
  if (level >= 0.2) return "Developing";
  return "Beginning";
}

function masteryBg(level: number): string {
  if (level >= 0.8) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (level >= 0.6) return "bg-green-50 text-green-700 border-green-200";
  if (level >= 0.4) return "bg-amber-50 text-amber-700 border-amber-200";
  if (level >= 0.2) return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-red-50 text-red-600 border-red-200";
}

function pct(val: number | null | undefined): string {
  if (val == null) return "—";
  return `${Math.round(val * 100)}%`;
}

function formatDate(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
}

// ─────────────────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  subtitle,
  expanded,
  onToggle,
  accent = "#042E5C",
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  accent?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors rounded-xl"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
          style={{ backgroundColor: accent }}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-base font-bold text-[#042E5C]">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="text-slate-400 print-hide">
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>
    </button>
  );
}

function MasteryBar({
  value,
  height = 6,
}: {
  value: number;
  height?: number;
}) {
  return (
    <div
      className="w-full rounded-full bg-slate-100 overflow-hidden"
      style={{ height }}
    >
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${Math.round(value * 100)}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ backgroundColor: masteryColor(value) }}
      />
    </div>
  );
}

function ScorePill({ value }: { value: number }) {
  const pctVal = Math.round(value * 100);
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${masteryBg(value)}`}
    >
      {pctVal}%
    </span>
  );
}

function AdaptiveModeBadge({ mode }: { mode: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    CHALLENGE: { bg: "bg-blue-100", text: "text-blue-700", label: "Challenge Mode" },
    PRACTICE:  { bg: "bg-amber-100", text: "text-amber-700", label: "Practice Mode" },
    REMEDIAL:  { bg: "bg-red-100", text: "text-red-600", label: "Remedial Mode" },
  };
  const c = config[mode] ?? config.PRACTICE;
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-10 text-center text-slate-400 text-sm">{message}</div>
  );
}

// ─────────────────────────────────────────────────────────
// SECTION COMPONENTS — receiving real data as props
// ─────────────────────────────────────────────────────────

function SubjectSummarySection({
  subjects,
  expanded,
  onToggle,
}: {
  subjects: SubjectData[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <SectionHeader
        icon={<BarChart3 size={16} />}
        title="Subject-wise Performance"
        subtitle="Overall score, skill index & adaptive mode per subject"
        expanded={expanded}
        onToggle={onToggle}
        accent="#042E5C"
      />
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden section-body"
          >
            <div className="px-6 pb-6">
              {subjects.length === 0 ? (
                <EmptyState message="No subject data available yet." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {subjects.map((s, idx) => {
                    const accent = SUBJECT_ACCENTS[idx % SUBJECT_ACCENTS.length];
                    return (
                      <div
                        key={s.subject}
                        className="rounded-xl p-5 border no-break"
                        style={{ borderColor: `${accent}30`, backgroundColor: `${accent}08` }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-bold text-[#042E5C] text-sm">{s.subject}</h4>
                          <AdaptiveModeBadge mode={s.adaptive_mode} />
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                              <span>Overall Score</span>
                              <span
                                className="font-bold"
                                style={{ color: masteryColor(s.overall_score) }}
                              >
                                {pct(s.overall_score)}
                              </span>
                            </div>
                            <MasteryBar value={s.overall_score} />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                              <span>Skill Index</span>
                              <span
                                className="font-bold"
                                style={{ color: masteryColor(s.skill_index) }}
                              >
                                {pct(s.skill_index)}
                              </span>
                            </div>
                            <MasteryBar value={s.skill_index} />
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500 pt-1">
                            <Clock size={11} />
                            <span>{s.session_count} learning sessions</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CurriculumSection({
  subjects,
  chapters,
  expanded,
  onToggle,
}: {
  subjects: SubjectData[];
  chapters: ChapterMasteryItem[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const [activeSubject, setActiveSubject] = useState(
    subjects[0]?.subject ?? ""
  );

  // Keep activeSubject in sync when subjects load
  useEffect(() => {
    if (subjects.length > 0 && !subjects.find((s) => s.subject === activeSubject)) {
      setActiveSubject(subjects[0].subject);
    }
  }, [subjects, activeSubject]);

  const visibleChapters = chapters.filter(
    (c) => c.subject === activeSubject
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <SectionHeader
        icon={<BookOpen size={16} />}
        title="Curriculum Coverage"
        subtitle="Chapter-by-chapter completion and mastery"
        expanded={expanded}
        onToggle={onToggle}
        accent="#7C3AED"
      />
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden section-body"
          >
            <div className="px-6 pb-6">
              {subjects.length === 0 ? (
                <EmptyState message="No curriculum data available yet." />
              ) : (
                <>
                  {/* Subject tabs */}
                  <div className="flex gap-2 mb-5 border-b border-slate-100 pb-3 flex-wrap">
                    {subjects.map((s) => (
                      <button
                        key={s.subject}
                        onClick={() => setActiveSubject(s.subject)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          activeSubject === s.subject
                            ? "bg-[#042E5C] text-white"
                            : "text-slate-500 hover:text-[#042E5C] hover:bg-slate-100"
                        }`}
                      >
                        {s.subject}
                      </button>
                    ))}
                  </div>

                  {visibleChapters.length === 0 ? (
                    <EmptyState message={`No chapters found for ${activeSubject}.`} />
                  ) : (
                    <div className="space-y-3">
                      {visibleChapters.map((ch) => (
                        <div key={ch.document_title} className="group no-break">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: masteryColor(ch.mastery_score),
                                }}
                              />
                              <span className="text-sm text-[#042E5C] font-medium truncate">
                                {ch.document_title}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                              <span className="text-xs text-slate-400">
                                {ch.study_count} sessions
                              </span>
                              <ScorePill value={ch.mastery_score} />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${ch.completion_percentage}%`,
                                }}
                                transition={{ duration: 0.7, ease: "easeOut" }}
                                style={{
                                  backgroundColor: masteryColor(ch.mastery_score),
                                }}
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-slate-500 w-8 text-right">
                              {Math.round(ch.completion_percentage)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Legend */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4 flex-wrap">
                    <span className="text-xs text-slate-400 font-medium">
                      Mastery:
                    </span>
                    {[
                      { label: "Advanced (≥80%)", color: "#059F6D" },
                      { label: "Proficient (60–79%)", color: "#10B981" },
                      { label: "Approaching (40–59%)", color: "#F59E0B" },
                      { label: "Developing (<40%)", color: "#EF4444" },
                    ].map((l) => (
                      <div key={l.label} className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: l.color }}
                        />
                        <span className="text-xs text-slate-500">{l.label}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SkillMasterySection({
  subjects,
  skillTree,
  expanded,
  onToggle,
}: {
  subjects: SubjectData[];
  skillTree: SkillCGItem[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const [activeSubject, setActiveSubject] = useState(
    subjects[0]?.subject ?? ""
  );
  const [expandedCGs, setExpandedCGs] = useState<Record<string, boolean>>({});
  const [expandedConcepts, setExpandedConcepts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (subjects.length > 0 && !subjects.find((s) => s.subject === activeSubject)) {
      setActiveSubject(subjects[0].subject);
    }
  }, [subjects, activeSubject]);

  const visibleCGs = skillTree.filter((cg) => cg.subject === activeSubject);

  const toggleCG = (id: string) =>
    setExpandedCGs((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleConcept = (id: string) =>
    setExpandedConcepts((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <SectionHeader
        icon={<Target size={16} />}
        title="Skill Mastery Breakdown"
        subtitle="Concept Groups → Concepts → Learning Outcomes"
        expanded={expanded}
        onToggle={onToggle}
        accent="#059F6D"
      />
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden section-body"
          >
            <div className="px-6 pb-6">
              {subjects.length === 0 ? (
                <EmptyState message="No skill data available yet." />
              ) : (
                <>
                  {/* Subject tabs */}
                  <div className="flex gap-2 mb-4 border-b border-slate-100 pb-3 flex-wrap">
                    {subjects.map((s) => (
                      <button
                        key={s.subject}
                        onClick={() => setActiveSubject(s.subject)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          activeSubject === s.subject
                            ? "bg-[#059F6D] text-white"
                            : "text-slate-500 hover:text-[#059F6D] hover:bg-slate-100"
                        }`}
                      >
                        {s.subject}
                      </button>
                    ))}
                  </div>

                  {visibleCGs.length === 0 ? (
                    <EmptyState message={`No skill tree data found for ${activeSubject}.`} />
                  ) : (
                    <div className="space-y-3">
                      {visibleCGs.map((cg) => (
                        <div
                          key={cg.cg_id}
                          className="border border-slate-200 rounded-xl overflow-hidden no-break"
                        >
                          <button
                            onClick={() => toggleCG(cg.cg_id)}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              {expandedCGs[cg.cg_id] ? (
                                <ChevronDown size={14} className="text-slate-400" />
                              ) : (
                                <ChevronRight size={14} className="text-slate-400" />
                              )}
                              <span className="text-sm font-bold text-[#042E5C]">
                                {cg.cg_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-28 hidden sm:block">
                                <MasteryBar value={cg.avg_mastery} height={5} />
                              </div>
                              <span
                                className="text-xs font-bold w-8 text-right"
                                style={{ color: masteryColor(cg.avg_mastery) }}
                              >
                                {pct(cg.avg_mastery)}
                              </span>
                              <span
                                className={`hidden sm:block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${masteryBg(cg.avg_mastery)}`}
                              >
                                {masteryLabel(cg.avg_mastery)}
                              </span>
                            </div>
                          </button>

                          <AnimatePresence initial={false}>
                            {expandedCGs[cg.cg_id] && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: "auto" }}
                                exit={{ height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden border-t border-slate-100"
                              >
                                {cg.concepts.map((concept) => (
                                  <div
                                    key={concept.c_id}
                                    className="border-b border-slate-100 last:border-0"
                                  >
                                    <button
                                      onClick={() => toggleConcept(concept.c_id)}
                                      className="w-full flex items-center gap-2 px-6 py-2.5 hover:bg-slate-50 transition-colors text-left"
                                    >
                                      {expandedConcepts[concept.c_id] ? (
                                        <ChevronDown
                                          size={12}
                                          className="text-slate-400 flex-shrink-0"
                                        />
                                      ) : (
                                        <ChevronRight
                                          size={12}
                                          className="text-slate-400 flex-shrink-0"
                                        />
                                      )}
                                      <span className="text-sm text-slate-600 font-medium flex-1">
                                        {concept.c_name}
                                      </span>
                                      <span className="text-xs text-slate-400">
                                        {concept.los.length} LOs
                                      </span>
                                    </button>

                                    <AnimatePresence initial={false}>
                                      {expandedConcepts[concept.c_id] && (
                                        <motion.div
                                          initial={{ height: 0 }}
                                          animate={{ height: "auto" }}
                                          exit={{ height: 0 }}
                                          transition={{ duration: 0.15 }}
                                          className="overflow-hidden bg-slate-50"
                                        >
                                          <div className="px-8 py-2 space-y-2">
                                            {concept.los.map((lo) => (
                                              <div
                                                key={lo.skill_id}
                                                className="flex items-center gap-3"
                                              >
                                                <div
                                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                  style={{
                                                    backgroundColor: masteryColor(
                                                      lo.mastery_level
                                                    ),
                                                  }}
                                                />
                                                <span className="text-xs text-slate-600 flex-1">
                                                  {lo.skill_name}
                                                </span>
                                                <div className="w-20 hidden sm:block">
                                                  <MasteryBar
                                                    value={lo.mastery_level}
                                                    height={4}
                                                  />
                                                </div>
                                                <span
                                                  className="text-xs font-bold w-8 text-right"
                                                  style={{
                                                    color: masteryColor(lo.mastery_level),
                                                  }}
                                                >
                                                  {pct(lo.mastery_level)}
                                                </span>
                                                <span className="text-[10px] text-slate-400 w-16 text-right">
                                                  {lo.assessment_count}× assessed
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TestPerformanceSection({
  testSubmissions,
  expanded,
  onToggle,
}: {
  testSubmissions: TestSubmission[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <SectionHeader
        icon={<FileText size={16} />}
        title="Chapter Test Results"
        subtitle="ZPD-calibrated tests: scores and section-wise breakdown"
        expanded={expanded}
        onToggle={onToggle}
        accent="#F59E0B"
      />
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden section-body"
          >
            <div className="px-6 pb-6 space-y-3">
              {testSubmissions.length === 0 ? (
                <EmptyState message="No chapter tests taken yet." />
              ) : (
                testSubmissions.map((test) => {
                  const key = test.submission_id;
                  const isOpen = expandedTest === key;
                  return (
                    <div
                      key={key}
                      className="border border-slate-200 rounded-xl overflow-hidden no-break"
                    >
                      <button
                        onClick={() =>
                          setExpandedTest(isOpen ? null : key)
                        }
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-[#042E5C] truncate">
                              {test.document_title}
                            </span>
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
                              {test.subject}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">
                            {formatDate(test.submitted_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-20 hidden sm:block">
                            <MasteryBar value={test.overall_score} height={5} />
                          </div>
                          <span
                            className="text-sm font-bold"
                            style={{ color: masteryColor(test.overall_score) }}
                          >
                            {pct(test.overall_score)}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              test.overall_verdict === "PASS" ||
                              test.overall_verdict === "pass"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {test.overall_verdict.toUpperCase()}
                          </span>
                          {isOpen ? (
                            <ChevronUp size={14} className="text-slate-400" />
                          ) : (
                            <ChevronDown size={14} className="text-slate-400" />
                          )}
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden border-t border-slate-100 bg-slate-50"
                          >
                            <div className="px-5 py-3 space-y-2">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                                Section Results
                              </p>
                              {Object.keys(test.section_results).length === 0 ? (
                                <p className="text-xs text-slate-400">
                                  No section breakdown available.
                                </p>
                              ) : (
                                Object.entries(test.section_results).map(
                                  ([section, data]) => {
                                    const score =
                                      typeof data.score === "number"
                                        ? data.score
                                        : (data.correct ?? 0) /
                                          (data.total ?? 1);
                                    return (
                                      <div
                                        key={section}
                                        className="flex items-center gap-3"
                                      >
                                        <span className="text-xs text-slate-600 flex-1">
                                          {section}
                                        </span>
                                        {data.correct != null &&
                                          data.total != null && (
                                            <span className="text-xs text-slate-400">
                                              {data.correct}/{data.total} correct
                                            </span>
                                          )}
                                        <div className="w-16 hidden sm:block">
                                          <MasteryBar value={score} height={4} />
                                        </div>
                                        <span
                                          className="text-xs font-bold w-8 text-right"
                                          style={{ color: masteryColor(score) }}
                                        >
                                          {pct(score)}
                                        </span>
                                      </div>
                                    );
                                  }
                                )
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChapterReportsSection({
  chapters,
  expanded,
  onToggle,
}: {
  chapters: ChapterMasteryItem[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const [openChapter, setOpenChapter] = useState<string | null>(null);
  const chaptersWithReports = chapters.filter((ch) => ch.chapter_report);
  const chaptersWithoutReports = chapters.filter((ch) => !ch.chapter_report);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <SectionHeader
        icon={<ScrollText size={16} />}
        title="AI Chapter Reports"
        subtitle="AI-generated pedagogical analysis per chapter — session summary, traits, concept trajectory & scores"
        expanded={expanded}
        onToggle={onToggle}
        accent="#6366F1"
      />
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden section-body"
          >
            <div className="px-6 pb-6 space-y-3">
              <p className="text-xs text-slate-400 mb-1">
                Reports are auto-generated by the AI evaluator after each
                chapter session. Each report covers student traits,
                concept-by-concept analysis, trajectory and section scores.
              </p>

              {chaptersWithReports.length === 0 ? (
                <EmptyState message="No AI chapter reports generated yet. Reports appear after chapter sessions." />
              ) : (
                chaptersWithReports.map((ch) => {
                  const isOpen = openChapter === `${ch.subject}-${ch.document_title}`;
                  const key = `${ch.subject}-${ch.document_title}`;
                  return (
                    <div
                      key={key}
                      className="border border-slate-200 rounded-xl overflow-hidden no-break"
                    >
                      <button
                        onClick={() =>
                          setOpenChapter(isOpen ? null : key)
                        }
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-[#042E5C]">
                              {ch.document_title}
                            </span>
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              {ch.subject}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">
                            {ch.study_count} sessions ·{" "}
                            {Math.round(ch.completion_percentage)}% complete
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <ScorePill value={ch.mastery_score} />
                          {isOpen ? (
                            <ChevronUp size={14} className="text-slate-400" />
                          ) : (
                            <ChevronDown size={14} className="text-slate-400" />
                          )}
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-slate-100"
                          >
                            <div className="px-5 py-4 bg-indigo-50/40">
                              <div
                                className="prose prose-sm max-w-none
                                  prose-h3:text-[#042E5C] prose-h3:font-bold prose-h3:text-sm prose-h3:mt-5 prose-h3:mb-2 prose-h3:first:mt-0
                                  prose-h4:text-[#042E5C] prose-h4:font-semibold prose-h4:text-xs prose-h4:mt-3 prose-h4:mb-1
                                  prose-p:text-slate-600 prose-p:text-xs prose-p:leading-relaxed prose-p:my-1
                                  prose-li:text-xs prose-li:text-slate-600 prose-li:my-0.5
                                  prose-strong:text-[#042E5C] prose-strong:font-semibold
                                  prose-ul:my-1 prose-ul:pl-4"
                              >
                                <ReactMarkdown>{ch.chapter_report!}</ReactMarkdown>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}

              {chaptersWithoutReports.length > 0 && (
                <p className="text-xs text-slate-400 pt-1">
                  + {chaptersWithoutReports.length} chapter
                  {chaptersWithoutReports.length > 1 ? "s" : ""} without
                  reports yet (sessions too short or not yet evaluated).
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// AI ANALYSIS SECTION COMPONENTS
// ─────────────────────────────────────────────────────────

function AIInsightsSection({
  progressReport,
  expanded,
  onToggle,
}: {
  progressReport: StudentProgressData | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [showFullReport, setShowFullReport] = useState(false);

  const reportJson = progressReport?.report_json ?? {};
  const focusAreas: any[] = reportJson.focus_areas ?? [];
  const crossSubjectPatterns: any[] = reportJson.cross_subject_patterns ?? [];
  const universalStrengths: string[] = reportJson.universal_strengths ?? [];
  const universalWeaknesses: string[] = reportJson.universal_weaknesses ?? [];

  const priorityCfg: Record<string, { bg: string; text: string; border: string }> = {
    high:   { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200" },
    medium: { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
    low:    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <SectionHeader
        icon={<Brain size={16} />}
        title="AI Learning Insights"
        subtitle="Holistic progress analysis across all subjects and sessions"
        expanded={expanded}
        onToggle={onToggle}
        accent="#7C2D96"
      />
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden section-body"
          >
            <div className="px-6 pb-6">
              {!progressReport ? (
                <EmptyState message="Progress report not yet generated. Complete 2+ sessions per chapter to unlock AI insights." />
              ) : (
                <div className="space-y-5 pt-2">
                  {/* Headline banner */}
                  {progressReport.headline && (
                    <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                      <p className="text-sm font-semibold text-purple-800 leading-snug">
                        {progressReport.headline}
                      </p>
                    </div>
                  )}

                  {/* Overall Assessment */}
                  {progressReport.overall_assessment && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                        Overall Assessment
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {progressReport.overall_assessment}
                      </p>
                    </div>
                  )}

                  {/* Strengths & Weaknesses */}
                  {(universalStrengths.length > 0 || universalWeaknesses.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 no-break">
                      {universalStrengths.length > 0 && (
                        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                          <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <Star size={10} /> Strengths
                          </h4>
                          <ul className="space-y-1.5">
                            {universalStrengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                <span className="text-emerald-500 font-bold mt-px flex-shrink-0">✓</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {universalWeaknesses.length > 0 && (
                        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                          <h4 className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <Target size={10} /> Areas to Improve
                          </h4>
                          <ul className="space-y-1.5">
                            {universalWeaknesses.map((w, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                <span className="text-amber-500 font-bold mt-px flex-shrink-0">→</span>
                                <span>{w}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Focus Areas */}
                  {focusAreas.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                        Recommended Focus Areas
                      </h4>
                      <div className="space-y-2">
                        {focusAreas.map((fa, i) => {
                          const priority = (fa.priority ?? "medium").toLowerCase();
                          const cfg = priorityCfg[priority] ?? priorityCfg.medium;
                          return (
                            <div
                              key={i}
                              className={`flex items-start gap-3 rounded-xl p-3 border no-break ${cfg.bg} ${cfg.border}`}
                            >
                              <span
                                className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border flex-shrink-0 ${cfg.bg} ${cfg.border} ${cfg.text}`}
                              >
                                {fa.priority ?? "medium"}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-sm font-semibold ${cfg.text}`}>
                                    {fa.area}
                                  </span>
                                  {fa.subject && (
                                    <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                      {fa.subject}
                                    </span>
                                  )}
                                </div>
                                {fa.suggested_approach && (
                                  <p className="text-xs text-slate-600 mt-0.5">
                                    {fa.suggested_approach}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Cross-subject patterns */}
                  {crossSubjectPatterns.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                        Cross-Subject Patterns
                      </h4>
                      <div className="space-y-2">
                        {crossSubjectPatterns.map((pattern, i) => (
                          <div
                            key={i}
                            className="bg-slate-50 rounded-xl p-3 border border-slate-100 no-break"
                          >
                            <div className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                              <div>
                                <span className="text-sm font-semibold text-[#042E5C]">
                                  {pattern.pattern_name}
                                </span>
                                {pattern.description && (
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {pattern.description}
                                  </p>
                                )}
                                {pattern.subjects_involved?.length > 0 && (
                                  <div className="flex gap-1 flex-wrap mt-1">
                                    {pattern.subjects_involved.map((s: string) => (
                                      <span
                                        key={s}
                                        className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full"
                                      >
                                        {s}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full Report toggle */}
                  {progressReport.report_markdown && (
                    <div>
                      <button
                        onClick={() => setShowFullReport(!showFullReport)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors print-hide"
                      >
                        {showFullReport ? (
                          <ChevronUp size={13} />
                        ) : (
                          <ChevronDown size={13} />
                        )}
                        {showFullReport ? "Hide" : "View"} full AI report
                      </button>
                      <AnimatePresence initial={false}>
                        {showFullReport && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div
                              className="mt-3 px-4 py-4 bg-purple-50/50 rounded-xl border border-purple-100 prose prose-sm max-w-none
                                prose-h3:text-[#042E5C] prose-h3:font-bold prose-h3:text-sm prose-h3:mt-5 prose-h3:mb-2 prose-h3:first:mt-0
                                prose-h4:text-[#042E5C] prose-h4:font-semibold prose-h4:text-xs prose-h4:mt-3 prose-h4:mb-1
                                prose-p:text-slate-600 prose-p:text-xs prose-p:leading-relaxed prose-p:my-1
                                prose-li:text-xs prose-li:text-slate-600 prose-li:my-0.5
                                prose-strong:text-[#042E5C] prose-strong:font-semibold
                                prose-ul:my-1 prose-ul:pl-4"
                            >
                              <ReactMarkdown>{progressReport.report_markdown}</ReactMarkdown>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {progressReport.updated_at && (
                    <p className="text-[11px] text-slate-400">
                      Last updated: {formatDate(progressReport.updated_at)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubjectEvolutionSection({
  subjects,
  subjectEvolutions,
  expanded,
  onToggle,
}: {
  subjects: SubjectData[];
  subjectEvolutions: SubjectEvolutionData[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const [openSubject, setOpenSubject] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <SectionHeader
        icon={<Activity size={16} />}
        title="Subject Learning Trends"
        subtitle="How learning evolved across chapters within each subject"
        expanded={expanded}
        onToggle={onToggle}
        accent="#0891B2"
      />
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden section-body"
          >
            <div className="px-6 pb-6 space-y-3">
              {subjectEvolutions.length === 0 ? (
                <EmptyState message="Subject evolution analysis appears after studying 2+ chapters per subject." />
              ) : (
                subjectEvolutions.map((evo) => {
                  const isOpen = openSubject === evo.subject;
                  const analysisJson = evo.analysis_json ?? {};
                  const patterns: any[] = analysisJson.cross_chapter_patterns ?? [];
                  const strengths: string[] = analysisJson.universal_strengths ?? [];
                  const weaknesses: string[] = analysisJson.universal_weaknesses ?? [];
                  const recommendations: any[] = analysisJson.recommendations ?? [];

                  return (
                    <div
                      key={evo.subject}
                      className="border border-slate-200 rounded-xl overflow-hidden no-break"
                    >
                      <button
                        onClick={() => setOpenSubject(isOpen ? null : evo.subject)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-[#042E5C]">
                              {evo.subject}
                            </span>
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              {evo.chapter_count} chapter{evo.chapter_count !== 1 ? "s" : ""}
                            </span>
                          </div>
                          {evo.headline && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                              {evo.headline}
                            </p>
                          )}
                        </div>
                        {isOpen ? (
                          <ChevronUp size={14} className="text-slate-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
                        )}
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-slate-100"
                          >
                            <div className="px-5 py-4 bg-cyan-50/30 space-y-4">
                              {/* Skill trajectory */}
                              {evo.subject_skill_trajectory && (
                                <div>
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
                                    Skill Trajectory
                                  </h4>
                                  <p className="text-sm text-slate-600">
                                    {evo.subject_skill_trajectory}
                                  </p>
                                </div>
                              )}

                              {/* Cross-chapter patterns */}
                              {patterns.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                                    Cross-Chapter Patterns
                                  </h4>
                                  <div className="space-y-2">
                                    {patterns.map((p, i) => (
                                      <div key={i} className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                                        <div>
                                          <span className="text-xs font-semibold text-[#042E5C]">
                                            {p.pattern_name}
                                          </span>
                                          {p.trend && (
                                            <span
                                              className={`ml-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                                                p.trend === "improving"
                                                  ? "bg-emerald-100 text-emerald-600"
                                                  : p.trend === "declining"
                                                  ? "bg-red-100 text-red-600"
                                                  : "bg-slate-100 text-slate-500"
                                              }`}
                                            >
                                              {p.trend}
                                            </span>
                                          )}
                                          {p.description && (
                                            <p className="text-xs text-slate-500 mt-0.5">
                                              {p.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Strengths / Weaknesses */}
                              {(strengths.length > 0 || weaknesses.length > 0) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {strengths.length > 0 && (
                                    <div>
                                      <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1">
                                        Strengths
                                      </h4>
                                      {strengths.slice(0, 3).map((s, i) => (
                                        <p key={i} className="text-xs text-slate-600">
                                          • {s}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                  {weaknesses.length > 0 && (
                                    <div>
                                      <h4 className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1">
                                        Areas to Improve
                                      </h4>
                                      {weaknesses.slice(0, 3).map((w, i) => (
                                        <p key={i} className="text-xs text-slate-600">
                                          • {w}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Recommendations */}
                              {recommendations.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                                    Recommendations
                                  </h4>
                                  <div className="space-y-1.5">
                                    {recommendations.map((r: any, i: number) => (
                                      <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                        <span className="text-cyan-500 font-bold mt-px flex-shrink-0">›</span>
                                        <span>{typeof r === "string" ? r : (r.action ?? r.recommendation ?? JSON.stringify(r))}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Full markdown */}
                              {evo.analysis_markdown && (
                                <div
                                  className="prose prose-sm max-w-none
                                    prose-h3:text-[#042E5C] prose-h3:font-bold prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1
                                    prose-h4:text-[#042E5C] prose-h4:text-xs prose-h4:mt-3 prose-h4:mb-1
                                    prose-p:text-slate-600 prose-p:text-xs prose-p:leading-relaxed prose-p:my-1
                                    prose-li:text-xs prose-li:text-slate-600 prose-li:my-0.5
                                    prose-strong:text-[#042E5C] prose-ul:my-1 prose-ul:pl-4"
                                >
                                  <ReactMarkdown>{evo.analysis_markdown}</ReactMarkdown>
                                </div>
                              )}

                              {evo.updated_at && (
                                <p className="text-[11px] text-slate-400">
                                  Updated: {formatDate(evo.updated_at)}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChapterEvolutionSection({
  subjects,
  chapterEvolutions,
  expanded,
  onToggle,
}: {
  subjects: SubjectData[];
  chapterEvolutions: EvolutionAnalysisData[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const [activeSubject, setActiveSubject] = useState(subjects[0]?.subject ?? "");
  const [openChapter, setOpenChapter] = useState<string | null>(null);

  useEffect(() => {
    if (subjects.length > 0 && !subjects.find((s) => s.subject === activeSubject)) {
      setActiveSubject(subjects[0].subject);
    }
  }, [subjects, activeSubject]);

  // Only show tabs for subjects that have evolution data
  const subjectsWithData = subjects.filter((s) =>
    chapterEvolutions.some((e) => e.subject === s.subject)
  );
  const visibleEvolutions = chapterEvolutions.filter(
    (e) => e.subject === activeSubject
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <SectionHeader
        icon={<Zap size={16} />}
        title="Chapter Learning Evolution"
        subtitle="AI analysis of how learning progressed across sessions for each chapter"
        expanded={expanded}
        onToggle={onToggle}
        accent="#EA580C"
      />
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden section-body"
          >
            <div className="px-6 pb-6">
              {chapterEvolutions.length === 0 ? (
                <EmptyState message="Chapter evolution analysis appears after 2+ sessions on the same chapter." />
              ) : (
                <>
                  {/* Subject tabs */}
                  {subjectsWithData.length > 1 && (
                    <div className="flex gap-2 mb-5 border-b border-slate-100 pb-3 flex-wrap">
                      {subjectsWithData.map((s) => (
                        <button
                          key={s.subject}
                          onClick={() => setActiveSubject(s.subject)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            activeSubject === s.subject
                              ? "bg-[#EA580C] text-white"
                              : "text-slate-500 hover:text-[#EA580C] hover:bg-slate-100"
                          }`}
                        >
                          {s.subject}
                        </button>
                      ))}
                    </div>
                  )}

                  {visibleEvolutions.length === 0 ? (
                    <EmptyState
                      message={`No chapter evolution data for ${activeSubject} yet.`}
                    />
                  ) : (
                    <div className="space-y-3">
                      {visibleEvolutions.map((evo) => {
                        const key = `${evo.subject}-${evo.document_title}`;
                        const isOpen = openChapter === key;
                        const analysisJson = evo.analysis_json ?? {};
                        const dimensions: any[] = analysisJson.dimension_analyses ?? [];
                        const recommendations: string[] =
                          analysisJson.recommendations ?? [];

                        return (
                          <div
                            key={key}
                            className="border border-slate-200 rounded-xl overflow-hidden no-break"
                          >
                            <button
                              onClick={() => setOpenChapter(isOpen ? null : key)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex-1 text-left min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-[#042E5C]">
                                    {evo.document_title}
                                  </span>
                                  <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                    {evo.conversation_count} session
                                    {evo.conversation_count !== 1 ? "s" : ""}
                                  </span>
                                </div>
                                {evo.headline && (
                                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                    {evo.headline}
                                  </p>
                                )}
                              </div>
                              {isOpen ? (
                                <ChevronUp size={14} className="text-slate-400 flex-shrink-0" />
                              ) : (
                                <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
                              )}
                            </button>

                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: "auto" }}
                                  exit={{ height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden border-t border-slate-100"
                                >
                                  <div className="px-5 py-4 bg-orange-50/30 space-y-4">
                                    {/* Skill trajectory */}
                                    {evo.skill_score_trajectory && (
                                      <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
                                          Skill Trajectory
                                        </h4>
                                        <p className="text-sm text-slate-600">
                                          {evo.skill_score_trajectory}
                                        </p>
                                      </div>
                                    )}

                                    {/* Dimension score bars */}
                                    {dimensions.length > 0 && (
                                      <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                                          Skill Dimension Analysis
                                        </h4>
                                        <div className="space-y-2.5">
                                          {dimensions.map((dim, i) => {
                                            const afterScore =
                                              typeof dim.after_score === "number"
                                                ? dim.after_score
                                                : null;
                                            const delta =
                                              typeof dim.delta === "number"
                                                ? dim.delta
                                                : 0;
                                            return (
                                              <div key={i}>
                                                <div className="flex items-center justify-between mb-0.5">
                                                  <span className="text-xs font-medium text-slate-600 truncate flex-1">
                                                    {dim.dimension_name}
                                                  </span>
                                                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                                    {afterScore != null && (
                                                      <span
                                                        className="text-xs font-bold"
                                                        style={{
                                                          color: masteryColor(afterScore),
                                                        }}
                                                      >
                                                        {pct(afterScore)}
                                                      </span>
                                                    )}
                                                    {delta !== 0 && (
                                                      <span
                                                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                                          delta > 0
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : "bg-red-100 text-red-600"
                                                        }`}
                                                      >
                                                        {delta > 0 ? "+" : ""}
                                                        {Math.round(delta * 100)}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                                {afterScore != null && (
                                                  <MasteryBar value={afterScore} height={4} />
                                                )}
                                                {dim.key_observation && (
                                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                                    {dim.key_observation}
                                                  </p>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Recommendations */}
                                    {recommendations.length > 0 && (
                                      <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
                                          Recommendations
                                        </h4>
                                        <ul className="space-y-1">
                                          {recommendations.map((r, i) => (
                                            <li
                                              key={i}
                                              className="flex items-start gap-1.5 text-xs text-slate-600"
                                            >
                                              <span className="text-orange-400 mt-px flex-shrink-0">›</span>
                                              <span>{r}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Full Markdown */}
                                    {evo.analysis_markdown && (
                                      <div
                                        className="prose prose-sm max-w-none
                                          prose-h3:text-[#042E5C] prose-h3:font-bold prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1 prose-h3:first:mt-0
                                          prose-h4:text-[#042E5C] prose-h4:text-xs prose-h4:mt-3 prose-h4:mb-1
                                          prose-p:text-slate-600 prose-p:text-xs prose-p:leading-relaxed prose-p:my-1
                                          prose-li:text-xs prose-li:text-slate-600 prose-li:my-0.5
                                          prose-strong:text-[#042E5C] prose-ul:my-1 prose-ul:pl-4"
                                      >
                                        <ReactMarkdown>{evo.analysis_markdown}</ReactMarkdown>
                                      </div>
                                    )}

                                    {evo.updated_at && (
                                      <p className="text-[11px] text-slate-400">
                                        Updated: {formatDate(evo.updated_at)}
                                      </p>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────

export function StudentReportCard({ parentId, teacherId, childId, childName }: { parentId?: string; teacherId?: string; childId?: string; childName?: string } = {}) {
  const { studentProfile } = useStudentStore();

  // ── State ──────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  const [dashboardProfile, setDashboardProfile] = useState<DashboardProfile | null>(null);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [chapters, setChapters] = useState<ChapterMasteryItem[]>([]);
  const [skillTree, setSkillTree] = useState<SkillCGItem[]>([]);
  const [testSubmissions, setTestSubmissions] = useState<TestSubmission[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);

  // AI Analysis Reports
  const [progressReport, setProgressReport] = useState<StudentProgressData | null>(null);
  const [subjectEvolutions, setSubjectEvolutions] = useState<SubjectEvolutionData[]>([]);
  const [chapterEvolutions, setChapterEvolutions] = useState<EvolutionAnalysisData[]>([]);

  const [sections, setSections] = useState({
    subjects: true,
    curriculum: false,
    skills: false,
    tests: false,
    reports: false,
    aiInsights: true,
    subjectEvolution: false,
    chapterEvolution: false,
  });

  const toggle = (key: keyof typeof sections) =>
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── New layout UI state ────────────────────────────────
  // Subjects default OPEN; track which have been explicitly closed.
  const [closedSubjects, setClosedSubjects] = useState<Set<string>>(() => new Set());
  // Generic nested expanders (learning arc, session log, full report, subject trends…) default CLOSED.
  const [openExpanders, setOpenExpanders] = useState<Set<string>>(() => new Set());
  // Clamp toggles (AI insight long text) default CLAMPED (collapsed).
  const [expandedClamps, setExpandedClamps] = useState<Set<string>>(() => new Set());

  const toggleSubjectOpen = (name: string) =>
    setClosedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  const toggleExpanderOpen = (key: string) =>
    setOpenExpanders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const toggleClampOpen = (key: string) =>
    setExpandedClamps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const handlePrint = async () => {
    if (isPdfGenerating || teacherId) return;
    setIsPdfGenerating(true);

    try {
      // Server-rendered PDF, fetched through the gateway like every other
      // API call (a parent downloads a linked child's report via the
      // parent-service endpoint; a student downloads their own via
      // core-service directly).
      const targetStudentId = parentId ? childId : studentId;
      if (!targetStudentId) {
        alert("Unable to determine which student's report to download.");
        return;
      }

      const blob = await studentService.downloadReportCardPdf(targetStudentId, parentId);
      const safeName = (displayName || "Student").replace(/[^a-z0-9]/gi, "_");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}_Report_Card.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[PDF] Generation failed:", err);
      alert("PDF generation failed — please try again.");
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // ── Data Fetching ─────────────────────────────────────
  const studentId = studentProfile?.user_id;

  const fetchParentReportData = useCallback(async () => {
    if (!childId || !(parentId || teacherId)) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = parentId
        ? await studentService.fetchParentReport(parentId, childId)
        : await studentService.fetchTeacherReport(teacherId!, childId);
      setDashboardProfile(data.profile ?? null);
      setTotalSessions(data.total_sessions ?? 0);
      setSubjects(data.subjects ?? []);
      setChapters(data.chapters ?? []);
      setSkillTree(data.skill_tree ?? []);
      setTestSubmissions(data.test_submissions ?? []);
      setProgressReport(data.progress_report ?? null);
      setSubjectEvolutions(data.subject_evolutions ?? []);
      setChapterEvolutions(data.chapter_evolutions ?? []);
    } catch (err) {
      console.error("[ReportCard] Failed to load parent report data:", err);
      setError("Failed to load report data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [parentId, teacherId, childId]);

  const fetchAll = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch profile + subjects list in parallel
      const [profileData, subjectListData] = await Promise.all([
        studentService.fetchDashboardProfile(studentId).catch(() => null),
        studentService.fetchAnalyticsSubjects(studentId).catch(() => ({ subjects: [] })),
      ]);

      if (profileData) setDashboardProfile(profileData);
      const subjectNames: string[] = subjectListData?.subjects ?? [];
      setTotalSessions(subjectListData?.session_count ?? 0);

      // 2. For each subject, fetch skill-summary + chapter-mastery + skill-tree + subject-evolution in parallel
      const perSubjectResults = await Promise.all(
        subjectNames.map(async (subject) => {
          const [summaryData, masteryData, treeData, subjectEvoData] = await Promise.all([
            studentService.fetchSkillSummary(studentId, subject).catch(() => null),
            studentService.fetchChapterMastery(studentId, subject).catch(() => []),
            studentService.fetchSkillTree(studentId, subject).catch(() => []),
            studentService.fetchSubjectEvolution(studentId, subject).catch(() => null),
          ]);

          const subjectEntry: SubjectData | null = summaryData
            ? {
                subject,
                overall_score: summaryData.overall_score ?? 0,
                skill_index: summaryData.skill_index ?? 0,
                adaptive_mode: summaryData.adaptive_mode ?? "PRACTICE",
                session_count: summaryData.session_count ?? 0,
              }
            : null;

          const chapterEntries: ChapterMasteryItem[] = Array.isArray(masteryData)
            ? masteryData.map((ch: ChapterMasteryItem) => ({ ...ch, subject }))
            : [];

          const cgEntries: SkillCGItem[] = Array.isArray(treeData)
            ? treeData.map((cg: SkillCGItem) => ({ ...cg, subject }))
            : [];

          return { subjectEntry, chapterEntries, cgEntries, subjectEvoData };
        })
      );

      const allSubjects: SubjectData[] = [];
      const allChapters: ChapterMasteryItem[] = [];
      const allCGs: SkillCGItem[] = [];
      const allSubjectEvos: SubjectEvolutionData[] = [];

      for (const { subjectEntry, chapterEntries, cgEntries, subjectEvoData } of perSubjectResults) {
        if (subjectEntry) allSubjects.push(subjectEntry);
        allChapters.push(...chapterEntries);
        allCGs.push(...cgEntries);
        if (subjectEvoData && !subjectEvoData.detail) allSubjectEvos.push(subjectEvoData);
      }

      setSubjects(allSubjects);
      setChapters(allChapters);
      setSkillTree(allCGs);
      setSubjectEvolutions(allSubjectEvos);

      // 3. Fetch test submissions + progress report in parallel
      const [testData, progressData] = await Promise.all([
        studentService.fetchTestSubmissions(studentId).catch(() => []),
        studentService.fetchProgressReport(studentId).catch(() => null),
      ]);

      if (Array.isArray(testData)) setTestSubmissions(testData);
      if (progressData && !progressData.detail) setProgressReport(progressData);

      // 4. Fetch chapter evolution for each chapter in parallel
      const chapterEvoResults = await Promise.all(
        allChapters.map((ch) =>
          studentService
            .fetchChapterEvolution(studentId, ch.subject, ch.document_title)
            .catch(() => null)
        )
      );
      const allChapterEvos = chapterEvoResults.filter(
        (r) => r && !r.detail
      ) as EvolutionAnalysisData[];
      setChapterEvolutions(allChapterEvos);
    } catch (err) {
      console.error("[ReportCard] Failed to load data:", err);
      setError("Failed to load report data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (childId && (parentId || teacherId)) {
      fetchParentReportData();
    } else {
      fetchAll();
    }
  }, [fetchAll, fetchParentReportData, parentId, teacherId, childId]);

  // Watchdog: fetchAll() no-ops (leaving isLoading true forever) if studentId
  // never hydrates from the store, and a hung network request has no other
  // timeout — both looked identical to a student as an infinite spinner.
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      setIsLoading((stillLoading) => {
        if (stillLoading) {
          setError("This is taking longer than expected. Please try again.");
        }
        return false;
      });
    }, 15000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // ── Derived values ─────────────────────────────────────
  const resolvedStudentName =
    studentProfile?.name || studentProfile?.username
      ? getStudentDisplayName(studentProfile)
      : undefined;
  const displayName =
    (childId && (parentId || teacherId) ? childName : undefined) ||
    resolvedStudentName ||
    (dashboardProfile?.name ? titleCase(dashboardProfile.name) : undefined) ||
    "Student";
  const displayGrade =
    studentProfile?.grade ?? dashboardProfile?.grade ?? null;
  const displayBoard =
    studentProfile?.school_board ?? dashboardProfile?.board ?? null;
  const displayAiName = studentProfile?.ai_name ?? "AI Tutor";
  const displayInitials =
    dashboardProfile?.avatar_initials ||
    displayName
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const overallAvg =
    subjects.length > 0
      ? subjects.reduce((sum, s) => sum + s.overall_score, 0) / subjects.length
      : 0;

  const generatedAt = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // ── Loading State ─────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw size={28} className="text-[#059F6D] animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">
            Generating your report card…
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Aggregating data across all subjects
          </p>
        </div>
      </div>
    );
  }

  // ── Error State ─────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-sm text-red-500 font-medium mb-3">{error}</p>
          <button
            onClick={fetchAll}
            className="px-4 py-2 rounded-lg bg-[#042E5C] text-white text-sm font-medium hover:bg-[#031d3a] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────
  
  // Derived data for the new layout
  const aiInsights = progressReport?.report_json || {};

  const bandFor = (score: number) => {
    if (score >= 80) return "Advanced";
    if (score >= 60) return "Proficient";
    if (score >= 40) return "Approaching";
    return "Developing";
  };

  const reportPeriod = new Date(progressReport?.updated_at ?? Date.now()).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  
  const levels = { beginning:1, developing:2, approaching:3, proficient:4, advanced:5 };
  const colors = { beginning: "#94a3b8", developing: "#be123c", approaching: "#b45309", proficient: "#1d4ed8", advanced: "#047857" };

  return (
    <div
      className="report-root"
      data-ready={isLoading ? undefined : "true"}
      style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-body)" }}
    >
      {/* ── PRINT STYLES ── */}
      <style>{`
        /* Scoped to .report-root, not :root — --font-body/--font-report-display/
           --font-mono are declared on <body> (same element as next/font's
           generated font variables), and :root (the ancestor <html>) can't see
           a descendant's custom properties, which silently invalidated these. */
        .report-root {
          --navy:#042E5C; --emerald:#059F6D; --bg:#F7F6F2; --border:#E4E1D8; --text:#1B2430; --muted:#6B7280;
          --surface:#ffffff; --surface-2:#FBFAF6; --rule:#EDEAE0;
          --adv-fg:#047857; --adv-bg:#ECFDF5; --adv-bd:#A7F3D0;
          --pro-fg:#1D4ED8; --pro-bg:#EFF6FF; --pro-bd:#BFDBFE;
          --app-fg:#B45309; --app-bg:#FFFBEB; --app-bd:#FDE68A;
          --dev-fg:#BE123C; --dev-bg:#FFF1F2; --dev-bd:#FECDD3;
          --r:10px; --r-sm:6px; --r-lg:16px;
          --sans: var(--font-body); --display: var(--font-report-display); --mono: var(--font-mono);
          --shadow: 0 1px 2px rgba(4,46,92,.04), 0 8px 24px -12px rgba(4,46,92,.10);
        }
        .report-root { background: var(--bg); font-family: var(--sans); color: var(--text); font-size: 15px; line-height: 1.55; }
        .rc-wrap { max-width: 1080px; margin: 0 auto; padding: 0 28px 60px; }

        /* header */
        .rc-head { padding: 36px 0 26px; border-bottom: 1px solid var(--border); }
        .rc-head-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
        .rc-brand-row { display: flex; align-items: center; gap: 10px; }
        .rc-brand-mark { width: 28px; height: 28px; border-radius: 7px; background: var(--navy); color: #fff; display: flex; align-items: center; justify-content: center; font-family: var(--display); font-weight: 700; font-size: 15px; }
        .rc-brand-name { font-family: var(--mono); font-size: 12px; letter-spacing: .06em; color: var(--navy); font-weight: 600; }
        .rc-report-no { font-family: var(--mono); font-size: 11px; color: var(--muted); }
        .rc-eyebrow { font-family: var(--mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--emerald); font-weight: 600; margin: 20px 0 10px; }
        .rc-head h1 { font-family: var(--display); font-weight: 600; font-size: 32px; line-height: 1.2; margin: 0 0 12px; color: var(--navy); }
        .rc-head h1 em { font-style: italic; color: var(--emerald); }
        .rc-deck { font-size: 15px; color: var(--muted); max-width: 640px; margin: 0 0 20px; }
        .rc-meta-row { display: flex; gap: 26px; flex-wrap: wrap; font-size: 12.5px; }
        .rc-meta-item { display: flex; flex-direction: column; gap: 2px; }
        .rc-meta-item .k { font-family: var(--mono); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
        .rc-meta-item .v { font-weight: 600; color: var(--navy); }

        /* summary band */
        .rc-summary { margin-top: 22px; background: linear-gradient(160deg,var(--navy),#06407D); border-radius: var(--r-lg); padding: 26px 26px 22px; color: #fff; box-shadow: var(--shadow); }
        .rc-summary-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 26px; }
        .rc-summary-lead-label { font-family: var(--mono); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: #8FB4DE; margin-bottom: 8px; }
        .rc-summary-lead { font-family: var(--display); font-size: 18px; line-height: 1.5; font-weight: 500; }
        .rc-summary-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; align-content: start; }
        .rc-sstat { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); border-radius: var(--r); padding: 11px 13px; }
        .rc-sstat .num { font-family: var(--display); font-size: 21px; font-weight: 700; }
        .rc-sstat .lbl { font-size: 10.5px; color: #B9D0E8; margin-top: 2px; }
        .rc-subject-dials { display: flex; gap: 12px; margin-top: 18px; flex-wrap: wrap; }
        .rc-dial { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); border-radius: 999px; padding: 6px 14px 6px 6px; }
        .rc-dial svg { width: 36px; height: 36px; }
        .rc-dial-txt .name { font-size: 12.5px; font-weight: 600; }
        .rc-dial-txt .band { font-size: 10.5px; color: #B9D0E8; }

        /* section framework */
        .rc-section { padding: 40px 0; border-bottom: 1px solid var(--border); }
        .rc-section:last-of-type { border-bottom: none; }
        .rc-sec-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 6px; }
        .rc-sec-n { font-family: var(--mono); font-size: 12px; color: var(--emerald); font-weight: 700; }
        .rc-sec-head h2 { font-family: var(--display); font-size: 22px; font-weight: 600; margin: 0; color: var(--navy); }
        .rc-sec-sub { color: var(--muted); font-size: 13px; margin: 0 0 20px; max-width: 620px; }

        /* subject cards */
        .rc-subject-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); margin-bottom: 16px; overflow: hidden; box-shadow: var(--shadow); }
        .rc-sc-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 20px; border-bottom: 1px solid var(--rule); cursor: pointer; background: var(--surface-2); }
        .rc-sc-head:hover { background: #F5F3EC; }
        .rc-sc-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .rc-sc-accent { width: 5px; height: 34px; border-radius: 3px; flex-shrink: 0; }
        .rc-sc-title { font-family: var(--display); font-size: 17px; font-weight: 600; color: var(--navy); }
        .rc-sc-headline { font-size: 12px; color: var(--muted); margin-top: 2px; font-style: italic; }
        .rc-sc-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .rc-chip { font-family: var(--mono); font-size: 10.5px; font-weight: 600; padding: 4px 10px; border-radius: 999px; border: 1px solid; letter-spacing: .02em; white-space: nowrap; }
        .rc-chip.advanced { color: var(--adv-fg); background: var(--adv-bg); border-color: var(--adv-bd); }
        .rc-chip.proficient { color: var(--pro-fg); background: var(--pro-bg); border-color: var(--pro-bd); }
        .rc-chip.approaching { color: var(--app-fg); background: var(--app-bg); border-color: var(--app-bd); }
        .rc-chip.developing { color: var(--dev-fg); background: var(--dev-bg); border-color: var(--dev-bd); }
        .rc-sc-score { font-family: var(--display); font-weight: 700; font-size: 20px; color: var(--navy); min-width: 44px; text-align: right; }
        .rc-sc-body { padding: 18px 20px 20px; }

        .rc-chapter-row { display: grid; grid-template-columns: 1fr auto 110px; gap: 14px; align-items: center; padding: 11px 0; border-bottom: 1px solid var(--rule); }
        .rc-chapter-row:last-child { border-bottom: none; }
        .rc-ch-title { font-weight: 600; font-size: 13.5px; color: var(--text); }
        .rc-ch-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
        .rc-ch-mastery { font-family: var(--mono); font-size: 12px; font-weight: 600; color: var(--navy); text-align: right; }
        .rc-bar-track { height: 6px; background: var(--rule); border-radius: 99px; overflow: hidden; width: 110px; }
        .rc-bar-fill { height: 100%; border-radius: 99px; }

        /* expanders */
        .rc-expander { margin-top: 14px; border: 1px solid var(--rule); border-radius: var(--r); overflow: hidden; }
        .rc-expander-btn { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--surface-2); border: none; padding: 11px 16px; cursor: pointer; text-align: left; font-family: var(--sans); font-size: 12.5px; font-weight: 600; color: var(--navy); }
        .rc-expander-btn:hover { background: #F2F0E8; }
        .rc-expander-btn .plus { font-family: var(--mono); font-size: 15px; color: var(--emerald); transition: transform .2s; display: inline-block; }
        .rc-expander-panel { padding: 16px 18px 18px; border-top: 1px solid var(--rule); background: #fff; }

        .rc-clamp { font-size: 13.5px; color: var(--ink-2, #334155); line-height: 1.6; }
        .rc-clamp.collapsed { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
        .rc-more-btn { background: none; border: none; color: var(--emerald); font-weight: 600; font-size: 12.5px; cursor: pointer; padding: 6px 0 0; font-family: var(--sans); }

        .rc-dim-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(200px,1fr)); gap: 10px; margin-top: 12px; }
        .rc-dim-card { background: var(--surface-2); border: 1px solid var(--rule); border-radius: var(--r-sm); padding: 10px 12px; }
        .rc-dim-head { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 600; gap: 6px; }
        .rc-dim-delta { font-family: var(--mono); font-size: 10.5px; font-weight: 700; padding: 1px 6px; border-radius: 5px; white-space: nowrap; }
        .rc-dim-delta.up { color: var(--adv-fg); background: var(--adv-bg); }
        .rc-dim-delta.down { color: var(--dev-fg); background: var(--dev-bg); }
        .rc-dim-obs { font-size: 11.5px; color: var(--muted); margin-top: 6px; line-height: 1.5; }

        .rc-log-row { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px dashed var(--rule); font-size: 12.5px; }
        .rc-log-row:last-child { border-bottom: none; }
        .rc-log-idx { font-family: var(--mono); color: var(--muted); width: 20px; flex-shrink: 0; }
        .rc-log-stage { font-weight: 600; color: var(--navy); margin-bottom: 2px; }
        .rc-log-obs { color: var(--muted); font-size: 12px; margin: 0; padding-left: 16px; }

        .rc-spark-wrap { margin-top: 4px; }
        .rc-spark-legend { display: flex; gap: 12px; flex-wrap: wrap; font-size: 10.5px; color: var(--muted); margin-top: 6px; }
        .rc-spark-legend span { display: inline-flex; align-items: center; gap: 4px; }
        .rc-spark-legend i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

        /* tests */
        .rc-test-row { display: grid; grid-template-columns: 1fr auto auto auto; gap: 16px; align-items: center; padding: 13px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); margin-bottom: 8px; box-shadow: var(--shadow); }
        .rc-test-title { font-weight: 600; font-size: 13.5px; }
        .rc-test-sub { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
        .rc-test-score { font-family: var(--display); font-weight: 700; font-size: 18px; color: var(--navy); }
        .rc-test-date { font-family: var(--mono); font-size: 11px; color: var(--muted); }
        .rc-verdict { font-family: var(--mono); font-size: 10.5px; font-weight: 700; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
        .rc-verdict.pass { color: var(--adv-fg); background: var(--adv-bg); }
        .rc-verdict.fail { color: var(--dev-fg); background: var(--dev-bg); }

        /* focus areas */
        .rc-focus-row { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--rule); align-items: flex-start; }
        .rc-focus-row:last-child { border-bottom: none; }
        .rc-pri { font-family: var(--mono); font-size: 9.5px; font-weight: 700; padding: 3px 8px; border-radius: 5px; flex-shrink: 0; margin-top: 2px; letter-spacing: .05em; white-space: nowrap; }
        .rc-pri.high { background: var(--dev-bg); color: var(--dev-fg); }
        .rc-pri.medium { background: var(--app-bg); color: var(--app-fg); }
        .rc-pri.low { background: var(--pro-bg); color: var(--pro-fg); }
        .rc-focus-area { font-weight: 600; font-size: 13px; }
        .rc-focus-rat { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
        .rc-focus-tag { font-size: 10.5px; color: var(--navy); font-family: var(--mono); margin-top: 4px; }

        .rc-pat-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(240px,1fr)); gap: 12px; margin-top: 16px; }
        .rc-pat-card { border-radius: var(--r); padding: 14px 16px; border: 1px solid; }
        .rc-pat-card.good { background: var(--adv-bg); border-color: var(--adv-bd); }
        .rc-pat-card.warn { background: var(--app-bg); border-color: var(--app-bd); }
        .rc-pat-name { font-weight: 700; font-size: 12.5px; margin-bottom: 4px; }
        .rc-pat-desc { font-size: 12px; color: var(--ink-2, #334155); line-height: 1.5; }
        .rc-pat-subjects { font-family: var(--mono); font-size: 10px; color: var(--muted); margin-top: 6px; }

        .rc-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .rc-list-card { background: var(--surface-2); border: 1px solid var(--rule); border-radius: var(--r); padding: 14px 16px; }
        .rc-list-card h4 { margin: 0 0 10px; font-size: 12px; font-family: var(--mono); text-transform: uppercase; letter-spacing: .05em; }
        .rc-list-card.strength h4 { color: var(--adv-fg); }
        .rc-list-card.weakness h4 { color: var(--dev-fg); }
        .rc-list-card ul { margin: 0; padding-left: 18px; font-size: 12.5px; color: var(--ink-2, #334155); }
        .rc-list-card li { margin-bottom: 6px; line-height: 1.5; }

        .rc-hero { background: linear-gradient(160deg,#FBFAF6,#F2EFE5); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 24px 26px; margin-bottom: 20px; }
        .rc-hero blockquote { font-family: var(--display); font-style: italic; font-size: 19px; color: var(--navy); margin: 0 0 10px; line-height: 1.5; }

        .rc-markdown { font-size: 13px; line-height: 1.7; color: var(--ink-2, #334155); }

        .rc-foot { padding: 36px 0 10px; text-align: center; }
        .rc-print-btn { background: var(--navy); color: #fff; border: none; border-radius: 999px; padding: 13px 28px; font-family: var(--sans); font-weight: 600; font-size: 13.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: var(--shadow); }
        .rc-print-btn:hover:not(:disabled) { background: #06407D; }
        .rc-print-btn:disabled { cursor: not-allowed; opacity: .6; }
        .rc-foot-note { font-size: 11px; color: var(--muted); margin-top: 10px; font-family: var(--mono); }

        .rc-empty { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 40px 32px; text-align: center; }
        .rc-empty p { font-family: var(--display); font-size: 17px; color: var(--muted); max-width: 60ch; margin: 0 auto; }

        @media (max-width: 820px) {
          .rc-summary-grid { grid-template-columns: 1fr; }
          .rc-two-col { grid-template-columns: 1fr; }
          .rc-chapter-row { grid-template-columns: 1fr auto; }
          .rc-bar-track { display: none; }
          .rc-test-row { grid-template-columns: 1fr; gap: 8px; }
          .rc-pat-grid { grid-template-columns: 1fr; }
        }

        /* Page-break sentinel — invisible on screen, hard break in print */
        .pb { display: none; }

        @media print {
          .rc-print-btn, .rc-foot { display: none !important; }
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; height: auto !important; overflow: visible !important; }
          .rc-wrap { max-width: 100% !important; padding: 0 24px 32px !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .pb { display: block !important; break-before: page !important; page-break-before: always !important; height: 0 !important; margin: 0 !important; padding: 0 !important; border: none !important; background: none !important; }
          .rc-section { overflow: visible !important; border-bottom: none !important; }
          .rc-subject-card, .rc-test-row, .rc-pat-card, .rc-dim-card, .rc-expander {
            break-inside: avoid; page-break-inside: avoid; overflow: visible !important;
          }
          .rc-sc-body, .rc-expander-panel { display: block !important; }
          .rc-two-col { display: block !important; }
          .rc-two-col > div { max-width: 100% !important; margin-bottom: 16px !important; }
        }
      `}</style>

      <div className="rc-wrap">
        {/* ── HEADER ── */}
        <header className="rc-head" id="rc-summary">
          <div className="rc-head-top">
            <div className="rc-eyebrow" style={{ margin: 0 }}>Learner Report · {reportPeriod}</div>
            <div className="rc-report-no">AR-{generatedAt.replace(/\s/g, "").toUpperCase()}</div>
          </div>
          <h1>{progressReport?.headline ? <>{displayName} — <em>{progressReport.headline}</em></> : <>{displayName} — Learning Report</>}</h1>
          <p className="rc-deck">{progressReport?.overall_assessment ?? `A snapshot of ${displayName.split(" ")[0]}'s learning progress so far.`}</p>
          <div className="rc-meta-row">
            <div className="rc-meta-item"><span className="k">Student</span><span className="v">{displayName}</span></div>
            <div className="rc-meta-item"><span className="k">Grade · Board</span><span className="v">{displayGrade ?? "—"} · {displayBoard ?? "—"}</span></div>
            <div className="rc-meta-item"><span className="k">Sessions</span><span className="v">{totalSessions}</span></div>
            <div className="rc-meta-item"><span className="k">Issued</span><span className="v">{generatedAt}</span></div>
          </div>

          {subjects.length === 0 && !progressReport && totalSessions === 0 ? null : (
            <div className="rc-summary">
              <div className="rc-summary-grid">
                <div>
                  <div className="rc-summary-lead-label">The Short Version</div>
                  <div className="rc-summary-lead">
                    {progressReport?.overall_assessment
                      ? progressReport.overall_assessment
                      : subjects.length > 0
                      ? `${displayName.split(" ")[0]} is currently ${subjects
                          .map((s) => `${bandFor(s.overall_score * 100).toLowerCase()} in ${s.subject}`)
                          .join(", ")}.`
                      : "Insights will appear here once sessions begin."}
                  </div>
                </div>
                <div className="rc-summary-stats">
                  <div className="rc-sstat"><div className="num">{totalSessions}</div><div className="lbl">Sessions</div></div>
                  <div className="rc-sstat"><div className="num">{chapters.length}</div><div className="lbl">Chapters</div></div>
                  <div className="rc-sstat"><div className="num">{Math.round(overallAvg * 100)}%</div><div className="lbl">Avg. Mastery</div></div>
                </div>
              </div>
              {subjects.length > 0 && (
                <div className="rc-subject-dials">
                  {subjects.map((s) => {
                    const score = Math.round(s.overall_score * 100);
                    const r = 16;
                    const circ = 2 * Math.PI * r;
                    const offset = circ * (1 - score / 100);
                    return (
                      <div className="rc-dial" key={s.subject}>
                        <svg viewBox="0 0 40 40">
                          <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="4" />
                          <circle cx="20" cy="20" r={r} fill="none" stroke="#5EEAD4" strokeWidth="4" strokeDasharray={circ.toFixed(1)} strokeDashoffset={offset.toFixed(1)} strokeLinecap="round" transform="rotate(-90 20 20)" />
                          <text x="20" y="24" textAnchor="middle" fontFamily="var(--display)" fontWeight="700" fontSize="14" fill="#fff">{score}</text>
                        </svg>
                        <div className="rc-dial-txt">
                          <div className="name">{s.subject}</div>
                          <div className="band">{bandFor(score)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </header>

        {subjects.length === 0 && !progressReport && totalSessions === 0 ? (
          <div className="rc-empty">
            <p>No sessions yet. {displayName.split(" ")[0]}&apos;s report will appear here after the first learning session — every score and insight below is generated from real session activity, so there&apos;s nothing to show until then.</p>
          </div>
        ) : (
          <>
            {/* ── 01 SUBJECTS & CHAPTERS ── */}
            {subjects.length > 0 && (
              <>
                <div className="pb" />
                <section className="rc-section" id="rc-subjects">
                  <div className="rc-sec-head"><span className="rc-sec-n">01</span><h2>Subjects &amp; Chapters</h2></div>
                  <p className="rc-sec-sub">Tap a subject to see chapter-level mastery, the learning arc across sessions, and skill dimensions.</p>

                  {subjects.map((subj, si) => {
                    const isOpen = !closedSubjects.has(subj.subject);
                    const accent = SUBJECT_ACCENTS[si % SUBJECT_ACCENTS.length];
                    const score = Math.round(subj.overall_score * 100);
                    const band = bandFor(score).toLowerCase();
                    const subjChapters = chapters.filter((c) => c.subject === subj.subject);
                    return (
                      <div className="rc-subject-card" key={subj.subject}>
                        <div className="rc-sc-head" onClick={() => toggleSubjectOpen(subj.subject)}>
                          <div className="rc-sc-left">
                            <div className="rc-sc-accent" style={{ background: accent }} />
                            <div style={{ minWidth: 0 }}>
                              <div className="rc-sc-title">{subj.subject}</div>
                              {progressReport?.headline && (
                                <div className="rc-sc-headline">{subjChapters.length} chapter{subjChapters.length !== 1 ? "s" : ""} · {subj.session_count} sessions</div>
                              )}
                            </div>
                          </div>
                          <div className="rc-sc-right">
                            <span className={`rc-chip ${band}`}>{bandFor(score)}</span>
                            <span className="rc-sc-score">{score}%</span>
                            <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ display: "flex", color: "var(--muted)" }}>
                              <ChevronDown size={18} />
                            </motion.span>
                          </div>
                        </div>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22 }}
                              style={{ overflow: "hidden" }}
                            >
                              <div className="rc-sc-body">
                                {subjChapters.length === 0 && (
                                  <p style={{ fontSize: "13px", color: "var(--muted)" }}>No chapters recorded yet.</p>
                                )}
                                {subjChapters.map((ch, chi) => {
                                  const chScore = Math.round(ch.mastery_score * 100);
                                  const chBand = bandFor(chScore).toLowerCase();
                                  const evo = chapterEvolutions.find(
                                    (e) => e.subject === subj.subject && e.document_title === ch.document_title
                                  );
                                  const chapterKey = `${subj.subject}::${ch.document_title}`;
                                  const arcOpen = openExpanders.has(`${chapterKey}::arc`);
                                  const logOpen = openExpanders.has(`${chapterKey}::log`);
                                  const reportOpen = openExpanders.has(`${chapterKey}::report`);

                                  let sparkPath = "";
                                  let mappedLog: { n: number; level: string; obs: string[]; stage: string }[] = [];
                                  let sessionLog: any[] = [];
                                  let dimensions: any[] = [];
                                  if (evo) {
                                    const analysis = evo.analysis_json ?? ({} as any);
                                    dimensions = analysis.dimension_analyses ?? analysis.dimensions ?? [];
                                    sessionLog = analysis.per_conversation ?? [];
                                    mappedLog = sessionLog.map((s: any, idx: number) => {
                                      const rawScore = s.overall_score ?? (idx / Math.max(sessionLog.length - 1, 1));
                                      let level = "beginning";
                                      if (rawScore > 0.8) level = "advanced";
                                      else if (rawScore > 0.6) level = "proficient";
                                      else if (rawScore > 0.4) level = "approaching";
                                      else if (rawScore > 0.2) level = "developing";
                                      return {
                                        n: idx + 1,
                                        level,
                                        obs: s.tutor_observations ?? s.observations ?? [],
                                        stage: s.stage_label ?? `Session ${idx + 1}`,
                                      };
                                    });
                                    const W = 480, H = 100, pad = 20;
                                    const xs = (i: number, n: number) => pad + i * ((W - pad * 2) / (n > 1 ? n - 1 : 1));
                                    const ys = (lvl: string) => H - pad - ((levels[lvl as keyof typeof levels] || 1) - 1) * ((H - pad * 2) / 4);
                                    sparkPath = mappedLog.length > 1
                                      ? mappedLog.map((s, i) => `${i === 0 ? "M" : "L"} ${xs(i, mappedLog.length).toFixed(1)} ${ys(s.level).toFixed(1)}`).join(" ")
                                      : "";
                                    (mappedLog as any)._xs = xs;
                                    (mappedLog as any)._ys = ys;
                                  }

                                  return (
                                    <div key={chapterKey}>
                                      <div className="rc-chapter-row">
                                        <div>
                                          <div className="rc-ch-title">{ch.document_title}</div>
                                          <div className="rc-ch-sub">{ch.study_count} sessions · {subj.subject}</div>
                                        </div>
                                        <div className="rc-ch-mastery">{chScore}%</div>
                                        <div className="rc-bar-track"><div className="rc-bar-fill" style={{ width: `${chScore}%`, background: masteryColor(ch.mastery_score) }} /></div>
                                      </div>

                                      {evo && (
                                        <div className="rc-expander">
                                          <button className="rc-expander-btn" onClick={() => toggleExpanderOpen(`${chapterKey}::arc`)}>
                                            <span>📈 Learning arc &amp; skill dimensions — {ch.document_title}</span>
                                            <span className="plus" style={{ transform: arcOpen ? "rotate(45deg)" : "none" }}>+</span>
                                          </button>
                                          {arcOpen && (
                                            <div className="rc-expander-panel">
                                              {evo.headline && (
                                                <p style={{ fontFamily: "var(--display)", fontStyle: "italic", color: "var(--pro-fg)", fontSize: "14.5px", margin: "0 0 10px" }}>{evo.headline}</p>
                                              )}
                                              {mappedLog.length > 1 && (
                                                <div className="rc-spark-wrap">
                                                  <svg viewBox={`0 0 480 100`} width="100%" height="100">
                                                    <line x1="20" y1="80" x2="460" y2="80" stroke="#E4E1D8" strokeWidth="1" />
                                                    <path d={sparkPath} fill="none" stroke="#1D4ED8" strokeWidth="2.5" />
                                                    {mappedLog.map((s, i) => (
                                                      <circle key={i} cx={(mappedLog as any)._xs(i, mappedLog.length)} cy={(mappedLog as any)._ys(s.level)} r="4" fill={colors[s.level as keyof typeof colors] || colors.beginning} />
                                                    ))}
                                                  </svg>
                                                  <div className="rc-spark-legend">
                                                    {(["beginning", "developing", "approaching", "proficient", "advanced"] as const).map((l) => (
                                                      <span key={l}><i style={{ background: colors[l] }} />{l.charAt(0).toUpperCase() + l.slice(1)}</span>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                              {dimensions.length > 0 && (
                                                <div className="rc-dim-grid">
                                                  {dimensions.map((d: any, i: number) => {
                                                    const delta = typeof d.delta === "number" ? Math.round(d.delta * 100) : null;
                                                    const name = d.dimension_name ?? d.dimension ?? d.name ?? "";
                                                    const obs = d.key_observation ?? d.analysis ?? d.desc ?? "";
                                                    return (
                                                      <div className="rc-dim-card" key={i}>
                                                        <div className="rc-dim-head">
                                                          <span>{name}</span>
                                                          {delta != null && delta !== 0 && (
                                                            <span className={`rc-dim-delta ${delta > 0 ? "up" : "down"}`}>{delta > 0 ? "+" : ""}{delta}</span>
                                                          )}
                                                        </div>
                                                        {obs && <div className="rc-dim-obs">{obs}</div>}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}

                                              {sessionLog.length > 0 && (
                                                <div className="rc-expander" style={{ marginTop: "14px" }}>
                                                  <button className="rc-expander-btn" onClick={() => toggleExpanderOpen(`${chapterKey}::log`)}>
                                                    <span>🗒 Session log ({sessionLog.length} sessions)</span>
                                                    <span className="plus" style={{ transform: logOpen ? "rotate(45deg)" : "none" }}>+</span>
                                                  </button>
                                                  {logOpen && (
                                                    <div className="rc-expander-panel">
                                                      {mappedLog.map((s, i) => (
                                                        <div className="rc-log-row" key={i}>
                                                          <span className="rc-log-idx">{s.n}</span>
                                                          <div style={{ flex: 1 }}>
                                                            <div className="rc-log-stage">{s.stage}</div>
                                                            {s.obs.length > 0 && (
                                                              <ul className="rc-log-obs">
                                                                {s.obs.slice(0, 3).map((o, j) => <li key={j}>{o}</li>)}
                                                              </ul>
                                                            )}
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                              )}

                                              {ch.chapter_report && (
                                                <div className="rc-expander" style={{ marginTop: "10px" }}>
                                                  <button className="rc-expander-btn" onClick={() => toggleExpanderOpen(`${chapterKey}::report`)}>
                                                    <span>📄 Full chapter report</span>
                                                    <span className="plus" style={{ transform: reportOpen ? "rotate(45deg)" : "none" }}>+</span>
                                                  </button>
                                                  {reportOpen && (
                                                    <div className="rc-expander-panel">
                                                      <div className="rc-markdown prose prose-sm max-w-none
                                                        prose-h3:font-serif prose-h3:text-[var(--navy)] prose-h3:font-medium prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2 prose-h3:first:mt-0
                                                        prose-p:text-[var(--ink-2,#334155)] prose-p:my-1.5
                                                        prose-li:text-[var(--ink-2,#334155)] prose-li:my-0.5
                                                        prose-strong:text-[var(--navy)] prose-ul:my-1 prose-ul:pl-4">
                                                        <ReactMarkdown>{ch.chapter_report}</ReactMarkdown>
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </section>
              </>
            )}

            {/* ── 02 CHAPTER TESTS ── */}
            {testSubmissions.length > 0 && (
              <>
                <div className="pb" />
                <section className="rc-section" id="rc-tests">
                  <div className="rc-sec-head"><span className="rc-sec-n">02</span><h2>Chapter Tests</h2></div>
                  <p className="rc-sec-sub">{testSubmissions.length} test{testSubmissions.length !== 1 ? "s" : ""} submitted this term.</p>
                  {testSubmissions.map((t) => {
                    const correct = Object.values(t.section_results).reduce((sum, r) => sum + (r.correct ?? 0), 0);
                    const total = Object.values(t.section_results).reduce((sum, r) => sum + (r.total ?? 0), 0);
                    const pass = t.overall_verdict === "PASS";
                    return (
                      <div className="rc-test-row" key={t.submission_id}>
                        <div>
                          <div className="rc-test-title">{t.document_title}</div>
                          <div className="rc-test-sub">{t.subject}{total > 0 ? ` · ${correct}/${total} correct` : ""}</div>
                        </div>
                        <div className="rc-test-score">{Math.round(t.overall_score * 100)}%</div>
                        <span className={`rc-verdict ${pass ? "pass" : "fail"}`}>{pass ? "PASS" : "RETRY"}</span>
                        <div className="rc-test-date">{formatDate(t.submitted_at)}</div>
                      </div>
                    );
                  })}
                </section>
              </>
            )}

            {/* ── 03 AI LEARNING INSIGHTS ── */}
            {progressReport && (
              <>
                <div className="pb" />
                <section className="rc-section" id="rc-insights">
                  <div className="rc-sec-head"><span className="rc-sec-n">03</span><h2>AI Learning Insights</h2></div>
                  <p className="rc-sec-sub">Cross-subject patterns synthesized from all sessions this term.</p>

                  {progressReport.headline && (
                    <div className="rc-hero">
                      <blockquote>&quot;{progressReport.headline}&quot;</blockquote>
                      {progressReport.overall_assessment && (
                        <>
                          <p className={`rc-clamp ${expandedClamps.has("overall") ? "" : "collapsed"}`}>{progressReport.overall_assessment}</p>
                          <button className="rc-more-btn" onClick={() => toggleClampOpen("overall")}>
                            {expandedClamps.has("overall") ? "Show less" : "Read full analysis"}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {(() => {
                    const strengths: string[] = (aiInsights as any)?.universal_strengths ?? [];
                    const weaknesses: string[] = (aiInsights as any)?.universal_weaknesses ?? [];
                    return (strengths.length > 0 || weaknesses.length > 0) ? (
                      <div className="rc-two-col">
                        {strengths.length > 0 && (
                          <div className="rc-list-card strength">
                            <h4>Universal Strengths</h4>
                            <ul>{strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                          </div>
                        )}
                        {weaknesses.length > 0 && (
                          <div className="rc-list-card weakness">
                            <h4>Areas to Improve</h4>
                            <ul>{weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()}

                  {(() => {
                    const focusAreas: any[] = (aiInsights as any)?.focus_areas ?? [];
                    if (focusAreas.length === 0) return null;
                    const faOpen = openExpanders.has("focus-areas");
                    return (
                      <div className="rc-expander" style={{ marginTop: "20px" }}>
                        <button className="rc-expander-btn" onClick={() => toggleExpanderOpen("focus-areas")}>
                          <span>🎯 Focus areas for next term ({focusAreas.length})</span>
                          <span className="plus" style={{ transform: faOpen ? "rotate(45deg)" : "none" }}>+</span>
                        </button>
                        {faOpen && (
                          <div className="rc-expander-panel">
                            {focusAreas.map((fa, i) => {
                              const pri = (fa.priority ?? "medium").toLowerCase();
                              return (
                                <div className="rc-focus-row" key={i}>
                                  <span className={`rc-pri ${pri}`}>{pri.toUpperCase()}</span>
                                  <div>
                                    <div className="rc-focus-area">{fa.area}</div>
                                    {(fa.suggested_approach || fa.rationale) && (
                                      <div className="rc-focus-rat">{fa.suggested_approach ?? fa.rationale}</div>
                                    )}
                                    {fa.subject && <div className="rc-focus-tag">{fa.subject}</div>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {(() => {
                    const patterns: any[] = (aiInsights as any)?.cross_subject_patterns ?? [];
                    if (patterns.length === 0) return null;
                    return (
                      <div className="rc-pat-grid">
                        {patterns.map((p, i) => (
                          <div className={`rc-pat-card ${p.is_positive ? "good" : "warn"}`} key={i}>
                            <div className="rc-pat-name">{p.is_positive ? "✓" : "⚠"} {p.pattern_name}</div>
                            <div className="rc-pat-desc">{p.summary ?? p.description}</div>
                            {p.subjects && <div className="rc-pat-subjects">{Array.isArray(p.subjects) ? p.subjects.join(" · ") : p.subjects}</div>}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </section>
              </>
            )}

            {/* ── 04 SUBJECT LEARNING TRENDS ── */}
            {subjectEvolutions.length > 0 && (
              <>
                <div className="pb" />
                <section className="rc-section" id="rc-trends">
                  <div className="rc-sec-head"><span className="rc-sec-n">04</span><h2>Subject Learning Trends</h2></div>
                  <p className="rc-sec-sub">How each subject evolved chapter to chapter.</p>
                  {subjectEvolutions.map((evo) => {
                    const sj = evo.analysis_json ?? ({} as any);
                    const strengths: string[] = sj.universal_strengths ?? sj.subject_strengths ?? [];
                    const weaknesses: string[] = sj.universal_weaknesses ?? sj.subject_weaknesses ?? [];
                    const patterns: any[] = sj.cross_chapter_patterns ?? [];
                    const recommendations: any[] = sj.recommendations ?? [];
                    const key = `trend::${evo.subject}`;
                    const isOpen = openExpanders.has(key);
                    const clampKey = `trend-clamp::${evo.subject}`;
                    return (
                      <div className="rc-expander" key={evo.subject} style={{ marginTop: "12px" }}>
                        <button className="rc-expander-btn" onClick={() => toggleExpanderOpen(key)}>
                          <span>📘 {evo.subject} — {evo.chapter_count} chapter{evo.chapter_count !== 1 ? "s" : ""}{evo.overall_adapted ? " · trending up" : ""}</span>
                          <span className="plus" style={{ transform: isOpen ? "rotate(45deg)" : "none" }}>+</span>
                        </button>
                        {isOpen && (
                          <div className="rc-expander-panel">
                            {evo.headline && (
                              <p style={{ fontFamily: "var(--display)", fontStyle: "italic", color: "var(--navy)", fontSize: "15px", margin: "0 0 10px" }}>&quot;{evo.headline}&quot;</p>
                            )}
                            {evo.subject_skill_trajectory && (
                              <>
                                <p className={`rc-clamp ${expandedClamps.has(clampKey) ? "" : "collapsed"}`} style={{ WebkitLineClamp: expandedClamps.has(clampKey) ? "unset" : 2 } as any}>{evo.subject_skill_trajectory}</p>
                                <button className="rc-more-btn" onClick={() => toggleClampOpen(clampKey)}>
                                  {expandedClamps.has(clampKey) ? "Show less" : "Read more"}
                                </button>
                              </>
                            )}
                            {(strengths.length > 0 || weaknesses.length > 0) && (
                              <div className="rc-two-col" style={{ marginTop: "14px" }}>
                                {strengths.length > 0 && (
                                  <div className="rc-list-card strength"><h4>Strengths</h4><ul>{strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                                )}
                                {weaknesses.length > 0 && (
                                  <div className="rc-list-card weakness"><h4>Weaknesses</h4><ul>{weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul></div>
                                )}
                              </div>
                            )}
                            {recommendations.length > 0 && (
                              <div style={{ marginTop: "14px" }}>
                                <h4 style={{ margin: "0 0 6px", font: "600 10.5px/1 var(--mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>Recommendations</h4>
                                <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12.5px", color: "var(--ink-2, #334155)", lineHeight: 1.65 }}>
                                  {recommendations.map((r, i) => <li key={i}>{typeof r === "string" ? r : (r.action ?? r.text ?? "")}</li>)}
                                </ul>
                              </div>
                            )}
                            {patterns.length > 0 && (
                              <div className="rc-dim-grid" style={{ marginTop: "14px" }}>
                                {patterns.slice(0, 4).map((p: any, i: number) => (
                                  <div className="rc-dim-card" key={i}>
                                    <div className="rc-dim-head"><span>{p.pattern_name}</span></div>
                                    <div className="rc-dim-obs">{p.summary ?? p.description}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </section>
              </>
            )}

            {/* ── FOOTER ── */}
            <footer className="rc-foot">
              <button
                className="rc-print-btn"
                onClick={handlePrint}
                disabled={isPdfGenerating || !!teacherId}
                title={teacherId ? "PDF download isn't available in the teacher view yet" : undefined}
              >
                {isPdfGenerating ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Generating PDF…
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" />
                    </svg>
                    Download PDF
                  </>
                )}
              </button>
              <div className="rc-foot-note">GenEducation Report Card v2</div>
            </footer>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </>
        )}
      </div>
    </div>
  );
}
