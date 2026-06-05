"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  BookOpen, Zap, ChevronDown, ChevronRight,
  Target, Clock, Star,
  BarChart3, FileText, Mic, Brain, Activity,
  Download, Printer, ChevronUp, ScrollText, RefreshCw,
} from "lucide-react";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { studentService } from "@/features/student/services/studentService";

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

interface EnglishModeStats {
  mode: string;
  session_count: number;
  avg_accuracy?: number | null;
  avg_fluency?: number | null;
  avg_expression?: number | null;
  avg_comprehension?: number | null;
  avg_wpm?: number | null;
  avg_overall?: number | null;
}

interface EnglishSkillsSummary {
  total_sessions: number;
  avg_accuracy?: number | null;
  avg_fluency?: number | null;
  avg_expression?: number | null;
  avg_comprehension?: number | null;
  avg_wpm?: number | null;
  by_mode: EnglishModeStats[];
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

const MODE_LABELS: Record<string, string> = {
  speak_para: "Speak Paragraph",
  difficult_word: "Difficult Words",
  read_aloud: "Read Aloud",
  karaoke: "Karaoke Reading",
  show_figure_describe: "Describe Figure",
  listen_comprehension: "Listen & Comprehend",
};

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

function EnglishSkillsSection({
  englishSkills,
  expanded,
  onToggle,
}: {
  englishSkills: EnglishSkillsSummary | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <SectionHeader
        icon={<Mic size={16} />}
        title="English Skills Profile"
        subtitle="Oral reading, fluency, comprehension across session modes"
        expanded={expanded}
        onToggle={onToggle}
        accent="#0EA5E9"
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
              {!englishSkills || englishSkills.total_sessions === 0 ? (
                <EmptyState message="No English skill sessions recorded yet." />
              ) : (
                <>
                  {/* Aggregate metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                    {[
                      {
                        label: "Accuracy",
                        val: englishSkills.avg_accuracy,
                        icon: <Target size={13} />,
                      },
                      {
                        label: "Fluency",
                        val: englishSkills.avg_fluency,
                        icon: <Activity size={13} />,
                      },
                      {
                        label: "Expression",
                        val: englishSkills.avg_expression,
                        icon: <Star size={13} />,
                      },
                      {
                        label: "Comprehension",
                        val: englishSkills.avg_comprehension,
                        icon: <Brain size={13} />,
                      },
                      {
                        label: "WPM",
                        val: null,
                        wpm: englishSkills.avg_wpm
                          ? Math.round(englishSkills.avg_wpm)
                          : null,
                        icon: <Zap size={13} />,
                      },
                    ].map((m) => (
                      <div
                        key={m.label}
                        className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-center"
                      >
                        <div className="flex justify-center mb-1 text-sky-500">
                          {m.icon}
                        </div>
                        <div
                          className="text-xl font-bold"
                          style={{
                            color:
                              m.val != null
                                ? masteryColor(m.val)
                                : "#0EA5E9",
                          }}
                        >
                          {"wpm" in m && m.wpm != null
                            ? m.wpm
                            : m.val != null
                            ? pct(m.val)
                            : "—"}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                          {m.label}
                        </div>
                        {m.val != null && (
                          <div className="mt-1.5">
                            <MasteryBar value={m.val} height={3} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Per-mode breakdown */}
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
                    Session Mode Breakdown
                  </h4>
                  <div className="space-y-2">
                    {englishSkills.by_mode.map((mode) => (
                      <div
                        key={mode.mode}
                        className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-lg no-break"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-sm font-medium text-[#042E5C]">
                              {MODE_LABELS[mode.mode] ?? mode.mode}
                            </span>
                            <span className="text-xs text-slate-400">
                              {mode.session_count} sessions
                            </span>
                          </div>
                          <div className="flex gap-3 text-xs text-slate-500 flex-wrap">
                            {mode.avg_accuracy != null && (
                              <span>
                                Accuracy:{" "}
                                <b style={{ color: masteryColor(mode.avg_accuracy) }}>
                                  {pct(mode.avg_accuracy)}
                                </b>
                              </span>
                            )}
                            {mode.avg_fluency != null && (
                              <span>
                                Fluency:{" "}
                                <b style={{ color: masteryColor(mode.avg_fluency) }}>
                                  {pct(mode.avg_fluency)}
                                </b>
                              </span>
                            )}
                            {mode.avg_comprehension != null && (
                              <span>
                                Comprehension:{" "}
                                <b
                                  style={{
                                    color: masteryColor(mode.avg_comprehension),
                                  }}
                                >
                                  {pct(mode.avg_comprehension)}
                                </b>
                              </span>
                            )}
                            {mode.avg_wpm != null && (
                              <span>
                                WPM:{" "}
                                <b className="text-sky-600">
                                  {Math.round(mode.avg_wpm)}
                                </b>
                              </span>
                            )}
                          </div>
                        </div>
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

export function StudentReportCard({ parentId, childId, childName }: { parentId?: string; childId?: string; childName?: string } = {}) {
  const { studentProfile } = useStudentStore();

  // ── State ──────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  const [dashboardProfile, setDashboardProfile] = useState<DashboardProfile | null>(null);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [chapters, setChapters] = useState<ChapterMasteryItem[]>([]);
  const [skillTree, setSkillTree] = useState<SkillCGItem[]>([]);
  const [englishSkills, setEnglishSkills] = useState<EnglishSkillsSummary | null>(null);
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
    english: false,
    tests: false,
    reports: false,
    aiInsights: true,
    subjectEvolution: false,
    chapterEvolution: false,
  });

  const toggle = (key: keyof typeof sections) =>
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handlePrint = async () => {
    if (isPdfGenerating) return;
    setIsPdfGenerating(true);

    try {
      // ═══════════════════════════════════════════════════════════
      // Server-side PDF generation via Puppeteer
      //
      // We POST the user's auth context to /api/student/report-card/pdf.
      // The route launches headless Chromium, seeds localStorage with
      // the token, navigates to /student/report-card?print=1, waits for
      // data to hydrate, and uses Chromium's native paginator to produce
      // a perfect, selectable-text PDF. The user just gets a download.
      // ═══════════════════════════════════════════════════════════

      // Pull the auth context the same way authFetch does
      const token = typeof window !== "undefined" ? localStorage.getItem("gened_auth_token") ?? "" : "";
      const profileStr = typeof window !== "undefined" ? localStorage.getItem("gened_user_profile") ?? "{}" : "{}";
      const role = typeof window !== "undefined" ? localStorage.getItem("gened_user_role") ?? "student" : "student";

      let userProfile: Record<string, unknown> = {};
      try { userProfile = JSON.parse(profileStr); } catch { /* empty */ }

      if (!token) {
        alert("You must be logged in to download the report card.");
        return;
      }

      const response = await fetch("/api/student/report-card/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, userProfile, role }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "PDF generation failed");
        throw new Error(errText);
      }

      const blob = await response.blob();
      const safeName = (displayName || "Student").replace(/[^a-z0-9]/gi, "_");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}_Report_Card.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;

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
    if (!parentId || !childId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await studentService.fetchParentReport(parentId, childId);
      setDashboardProfile(data.profile ?? null);
      setTotalSessions(data.total_sessions ?? 0);
      setSubjects(data.subjects ?? []);
      setChapters(data.chapters ?? []);
      setSkillTree(data.skill_tree ?? []);
      setEnglishSkills(data.english_skills ?? null);
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
  }, [parentId, childId]);

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

      // 3. Fetch English skills + test submissions + progress report in parallel
      const [englishData, testData, progressData] = await Promise.all([
        studentService.fetchEnglishSkillsSummary(studentId).catch(() => null),
        studentService.fetchTestSubmissions(studentId).catch(() => []),
        studentService.fetchProgressReport(studentId).catch(() => null),
      ]);

      if (englishData) setEnglishSkills(englishData);
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
    if (parentId && childId) {
      fetchParentReportData();
    } else {
      fetchAll();
    }
  }, [fetchAll, fetchParentReportData, parentId, childId]);

  // ── Derived values ─────────────────────────────────────
  const displayName =
    (parentId && childId ? childName : undefined) ||
    studentProfile?.name ||
    studentProfile?.username ||
    dashboardProfile?.name ||
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
  const ep: Partial<EnglishSkillsSummary> = englishSkills || {};

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
      style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "Inter, sans-serif" }}
    >
      {/* ── PRINT STYLES ── */}
      <style>{`
        :root {
          --navy:    #042E5C;
          --emerald: #059F6D;
          --bg:      #F8F9FA;
          --border:  #E2E8F0;
          --text:    #042E5C;
          --muted:   #64748B;
          --light:   #F1F5F9;
          
          /* New Theme vars */
          --surface: #ffffff;
          --surface-2: #f8fafc;
          --rule-faint: #f1f5f9;
          --ink: #0f172a;
          --ink-2: #334155;
          --r: 8px;
          --r-sm: 4px;
          --r-lg: 12px;
          --sans: 'Inter', sans-serif;
          --mono: 'JetBrains Mono', monospace;
          --display: 'Source Serif 4', 'Charter', Georgia, 'Times New Roman', serif;

          --advanced: #047857;
          --advanced-bg: #ecfdf5;
          --advanced-bd: #a7f3d0;
          --proficient: #1d4ed8;
          --proficient-bg: #eff6ff;
          --proficient-bd: #bfdbfe;
          --approaching: #b45309;
          --approaching-bg: #fffbeb;
          --approaching-bd: #fde68a;
          --developing: #be123c;
          --developing-bg: #fff1f2;
          --developing-bd: #fecdd3;
        }

        .report-root { max-width: 1080px; margin: 0 auto; padding: 32px 28px 80px; }

        .head { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 26px 32px; margin-bottom: 24px; }
        .head-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .head-pre { font: 600 11px/1 var(--mono); letter-spacing: 0.2em; text-transform: uppercase; color: var(--proficient); margin-bottom: 10px; }
        .head-title { font-family: var(--display); font-size: 42px; font-weight: 500; line-height: 1.05; letter-spacing: -0.018em; margin: 0 0 8px; max-width: 26ch; }
        .head-title em { font-style: italic; color: var(--proficient); }
        .head-deck { color: var(--ink-2); font-size: 15px; max-width: 56ch; margin: 0 0 18px; }
        .head-meta { display: flex; gap: 26px; flex-wrap: wrap; padding-top: 14px; border-top: 1px solid var(--border); font-size: 13px; }
        .head-meta span { color: var(--muted); }
        .head-meta b { color: var(--ink); font-weight: 600; margin-left: 4px; }

        .section { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); margin-bottom: 18px; overflow: hidden; }
        .s-head { padding: 20px 32px 18px; border-bottom: 1px solid var(--border); display: grid; grid-template-columns: 36px 1fr auto; gap: 14px; align-items: baseline; }
        .s-head .n { width: 28px; height: 28px; background: var(--ink); color: #fff; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font: 600 13px/1 var(--sans); }
        .s-head h2 { margin: 0; font-family: var(--display); font-size: 22px; font-weight: 500; letter-spacing: -0.012em; }
        .s-head .sub { color: var(--muted); font-size: 13px; max-width: 50ch; }
        .s-head .trail { font: 500 11px/1 var(--mono); color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; }
        .s-body { padding: 28px 32px 32px; }

        .split { display: grid; grid-template-columns: 1.45fr 1fr; gap: 40px; align-items: start; }
        .split-narrow { grid-template-columns: 1.8fr 1fr; }
        .narrative h3 { font-family: var(--display); font-size: 24px; font-weight: 500; line-height: 1.25; letter-spacing: -0.01em; margin: 0 0 12px; max-width: 32ch; }
        .narrative p { font-size: 15px; line-height: 1.7; color: var(--ink-2); margin: 0 0 14px; max-width: 56ch; }
        .narrative p.lead { font-family: var(--display); font-size: 19px; line-height: 1.5; color: var(--ink); margin-bottom: 16px; max-width: 50ch; }

        .rail { border-left: 1px solid var(--border); padding-left: 28px; }
        .rail h4 { margin: 0 0 10px; font: 600 11px/1 var(--mono); letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
        .rail h4.accent { color: var(--proficient); }

        .rail-kpi { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; margin-bottom: 16px; }
        .rail-kpi > div { padding: 14px 16px; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .rail-kpi > div:nth-child(2n) { border-right: 0; }
        .rail-kpi > div:nth-last-child(-n+2) { border-bottom: 0; }
        .rail-kpi .k { font: 600 10.5px/1 var(--mono); color: var(--muted); letter-spacing: 0.12em; text-transform: uppercase; }
        .rail-kpi .v { font-size: 24px; font-weight: 600; line-height: 1; margin-top: 6px; font-variant-numeric: tabular-nums; letter-spacing: -0.012em; }
        .rail-kpi .v small { font-size: 12px; color: var(--muted); font-weight: 500; }
        .rail-kpi .sub { margin-top: 4px; font-size: 12px; color: var(--muted); }

        .chap-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .chap { border: 1px solid var(--border); border-radius: var(--r); padding: 16px 18px; }
        .chap .ctop { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 6px; }
        .chap .title { font-size: 16px; font-weight: 600; }
        .chap .subj { font: 500 11px/1 var(--mono); color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; }
        .chap .row { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 13px; }
        .chap .row b { font-size: 18px; font-variant-numeric: tabular-nums; font-weight: 600; }
        .chap .row .l { color: var(--muted); font: 600 10.5px/1 var(--mono); letter-spacing: 0.1em; text-transform: uppercase; }
        .chap .progress { margin-top: 10px; }
        .bar { height: 4px; background: var(--border); border-radius: 2px; width: 100%; overflow: hidden; display: flex; }
        .bar i { height: 100%; display: block; border-radius: 2px; }
        .bar.advanced i { background: var(--advanced); }
        .bar.proficient i { background: var(--proficient); }
        .bar.approaching i { background: var(--approaching); }
        .bar.developing i { background: var(--developing); }

        .chip { padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid transparent; }
        .chip.advanced { background: var(--advanced-bg); color: var(--advanced); border-color: var(--advanced-bd); }
        .chip.proficient { background: var(--proficient-bg); color: var(--proficient); border-color: var(--proficient-bd); }
        .chip.approaching { background: var(--approaching-bg); color: var(--approaching); border-color: var(--approaching-bd); }
        .chip.developing { background: var(--developing-bg); color: var(--developing); border-color: var(--developing-bd); }

        .ep-feature { display: grid; grid-template-columns: 1.4fr 1fr; gap: 36px; align-items: start; }
        .ep-rings { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .ring { border: 1px solid var(--border); border-radius: var(--r); padding: 14px 16px 12px; }
        .ring .k { font: 600 10.5px/1 var(--mono); color: var(--muted); letter-spacing: 0.12em; text-transform: uppercase; }
        .ring .v { font-size: 30px; font-weight: 600; line-height: 1; margin: 8px 0 8px; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
        .ring .v small { font-size: 12px; color: var(--muted); font-weight: 500; }
        .wpm-card { grid-column: 1 / -1; margin-top: 6px; background: var(--ink); color: #fff; border-radius: var(--r); padding: 14px 18px; display: flex; align-items: baseline; justify-content: space-between; }
        .wpm-card .k { font: 600 10.5px/1 var(--mono); color: rgba(255,255,255,0.65); letter-spacing: 0.12em; text-transform: uppercase; }
        .wpm-card .v { font-size: 32px; font-weight: 600; letter-spacing: -0.02em; }
        .wpm-card .v small { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.65); margin-left: 4px; }

        .test-feature { border: 1px solid var(--border); border-radius: var(--r); padding: 20px 24px; margin-top: 14px; display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: center; }
        .test-feature .tt { font-family: var(--display); font-size: 22px; font-weight: 500; margin: 0 0 4px; }
        .test-feature .tt .subj { font-family: var(--mono); font-size: 11px; color: var(--muted); margin-left: 8px; letter-spacing: 0.08em; text-transform: uppercase; }
        .test-feature .narr { color: var(--ink-2); font-size: 14px; line-height: 1.55; margin: 0 0 14px; }
        .test-feature .secs { display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; }
        .test-feature .secs > div { padding: 6px 12px; background: var(--surface-2); border-radius: var(--r-sm); }
        .test-feature .secs b { font-weight: 600; font-variant-numeric: tabular-nums; margin-left: 4px; }
        .test-feature .right .score { font-size: 48px; font-weight: 600; letter-spacing: -0.025em; font-variant-numeric: tabular-nums; line-height: 1; text-align: center; }
        .test-feature .right .score small { font-size: 16px; color: var(--muted); font-weight: 500; }
        .test-feature .right .pass { display: block; text-align: center; margin-top: 8px; font: 700 11px/1 var(--mono); letter-spacing: 0.16em; background: var(--advanced-bg); color: var(--advanced); border: 1px solid var(--advanced-bd); padding: 5px 10px; border-radius: var(--r-sm); }

        .feature-hero { display: grid; grid-template-columns: 1.5fr 1fr; gap: 40px; }
        .feature-hero .lead-quote { font-family: var(--display); font-size: 30px; line-height: 1.22; letter-spacing: -0.015em; color: var(--ink); margin: 0 0 22px; font-weight: 500; }
        .feature-hero .lead-quote em { font-style: italic; color: var(--proficient); }

        .pat-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-top: 8px; }
        .pat { border: 1px solid var(--border); border-radius: var(--r); padding: 16px 18px; background: var(--surface); }
        .pat.warn { border-color: var(--approaching-bd); background: var(--approaching-bg); }
        .pat.good { border-color: var(--advanced-bd); background: var(--advanced-bg); }
        .pat .tg { font: 600 10.5px/1 var(--mono); letter-spacing: 0.14em; text-transform: uppercase; }
        .pat.warn .tg { color: var(--approaching); }
        .pat.good .tg { color: var(--advanced); }
        .pat h5 { font-family: var(--display); font-size: 18px; font-weight: 500; margin: 8px 0 8px; line-height: 1.25; }

        .focus { display: grid; grid-template-columns: 64px 1fr 120px; gap: 14px; padding: 14px 0; border-top: 1px solid var(--rule-faint); align-items: start; }
        .focus:first-of-type { border-top: 1px solid var(--border); }
        .focus .area { font-size: 15px; font-weight: 500; }
        .focus .rat { font-size: 13px; color: var(--muted); line-height: 1.55; margin-top: 4px; max-width: 60ch; }
        .focus .stag { text-align: right; font: 600 11px/1 var(--mono); color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; }
        .pri { font: 600 10px/1 var(--mono); padding: 3px 6px; border-radius: 4px; }
        .pri.HIGH { background: var(--developing-bg); color: var(--developing); }
        .pri.MEDIUM { background: var(--approaching-bg); color: var(--approaching); }

        .arc { border-top: 1px solid var(--border); margin-top: 10px; }
        .arc-row { display: grid; grid-template-columns: 50px 100px 1fr; gap: 16px; padding: 14px 0; border-bottom: 1px dashed var(--border); align-items: start; }
        .arc-row .n { font-family: var(--display); font-size: 24px; font-weight: 500; color: var(--proficient); line-height: 1; }
        .arc-row .lvl { font: 600 10.5px/1.4 var(--mono); letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 8px; border-radius: var(--r-sm); display: inline-block; }
        .lvl-beginning  { background: var(--surface-2); color: var(--muted); }
        .lvl-developing { background: var(--developing-bg); color: var(--developing); }
        .lvl-approaching{ background: var(--approaching-bg); color: var(--approaching); }
        .lvl-proficient { background: var(--proficient-bg); color: var(--proficient); }
        .lvl-advanced   { background: var(--advanced-bg); color: var(--advanced); }

        .arc-spark { border: 1px solid var(--border); border-radius: var(--r); padding: 16px 18px; margin: 8px 0 18px; }
        .arc-spark .h { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
        .arc-spark .h .l { font: 600 11px/1 var(--mono); color: var(--muted); letter-spacing: 0.14em; text-transform: uppercase; }
        .arc-spark svg { display: block; width: 100%; height: 80px; }

        .level-key { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 10px; font: 500 11px/1 var(--mono); color: var(--muted); letter-spacing: 0.06em; }
        .level-key span { display: inline-flex; align-items: center; gap: 4px; }
        .level-key i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

        .dim-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
        .dim { padding: 14px 16px; background: var(--surface-2); border-radius: var(--r); }
        .dim .dn { font-size: 14.5px; font-weight: 600; margin-bottom: 4px; }
        .dim .dd { font-size: 13px; color: var(--ink-2); line-height: 1.55; }

        .cr { border-top: 1px solid var(--border); padding-top: 20px; margin-top: 24px; }
        .cr:first-child { border-top: 0; padding-top: 0; margin-top: 0; }
        .cr-h { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; gap: 12px; }
        .cr-h .name { font-family: var(--display); font-size: 24px; font-weight: 500; }
        .cr-summary { font-size: 15px; line-height: 1.65; color: var(--ink-2); margin: 0 0 18px; max-width: 70ch; }
        
        .kp-grid { display: grid; grid-template-columns: 240px 1fr 1fr; gap: 14px; padding: 12px 0; border-top: 1px solid var(--rule-faint); }
        .kp-area { font-size: 14.5px; font-weight: 600; }

        /* Page-break sentinel — invisible on screen, hard break in print */
        .pb { display: none; }

        @media print {
          /* Hide chrome */
          .toolbar, .subnav, .print-btn { display: none !important; }

          /* Reset page chrome */
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }

          /* Report takes full page width */
          .report-root {
            max-width: 100% !important;
            padding: 16px 24px 32px !important;
            margin: 0 !important;
          }

          /* Ensure all backgrounds and colors print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* ── Page-break sentinels (DOM nodes, most reliable in Chromium) ── */
          .pb {
            display: block !important;
            break-before: page !important;
            page-break-before: always !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: none !important;
          }

          /* ── Sections: unlock overflow so content flows across pages ── */
          .section {
            overflow: visible !important;
            border-radius: 0 !important;
          }
          .s-body {
            overflow: visible !important;
          }

          /* ── Two-column grids → vertical stack in print ────────────────
             Chromium's print engine treats a CSS grid containing
             break-inside:avoid children as a single atomic block and
             defers the ENTIRE grid to the next page when it doesn't
             predict it'll fit — leaving a huge blank gap after the
             section heading. Collapsing to block flow fixes this
             permanently. Content stacks: narrative first, rail below. */
          .split {
            display: block !important;
          }
          .split .narrative {
            max-width: 100% !important;
            margin-bottom: 24px !important;
          }
          .split .rail {
            border-left: none !important;
            padding-left: 0 !important;
            border-top: 1px solid var(--border) !important;
            padding-top: 20px !important;
          }
          .split .rail h4 {
            margin-top: 0 !important;
          }

          /* Small atomic cards stay intact */
          .chap, .ring, .test-feature, .pat, .dim,
          .arc-spark, .focus, .cr, .wpm-card {
            break-inside: avoid;
            page-break-inside: avoid;
            overflow: visible !important;
          }
        }
      `}</style>

      {/* HEADER */}
      <header className="head">
        <div className="head-top">
          <span className="brand" style={{ fontWeight: 700 }}><span className="brand-mark">G</span><span>enEducation</span></span>
          <span className="label" style={{ fontSize: '12px', color: 'var(--muted)' }}>Report No. AR-{generatedAt.replace(/\s/g,"").toUpperCase()}</span>
        </div>
        <div className="head-pre">Learner Report · {reportPeriod}</div>
        <h1 className="head-title">{progressReport?.headline ? <>{displayName} — <em>{progressReport.headline}</em></> : <>{displayName} — Learning Report</>}</h1>
        <p className="head-deck">{progressReport?.overall_assessment ?? `A snapshot of ${displayName.split(' ')[0]}'s learning progress so far.`}</p>
        <div className="head-meta">
          <span>Student<b>{displayName}</b></span>
          <span>Grade<b>{displayGrade} · {displayBoard}</b></span>
          <span>Sessions<b>{totalSessions}</b></span>
          <span>Issued<b>{generatedAt}</b></span>
        </div>
      </header>

      {subjects.length === 0 && !progressReport && totalSessions === 0 ? (
        <section className="section">
          <div className="s-body">
            <p className="lead">No sessions yet. {displayName.split(' ')[0]}&apos;s report will appear here after the first learning session — every score and insight below is generated from real session activity, so there&apos;s nothing to show until then.</p>
          </div>
        </section>
      ) : (
        <>

      {/* 1. SUBJECTS */}
      <section className="section">
        <div className="s-head">
          <span className="n">1</span>
          <div>
            <h2>Two subjects, two stories.</h2>
            <div className="sub">Where {displayName.split(' ')[0]} stands as of {reportPeriod}.</div>
          </div>
        </div>
        <div className="s-body">
          <div className="split">
            <div className="narrative">
              {progressReport?.overall_assessment ? (
                <p className="lead">{progressReport.overall_assessment}</p>
              ) : (
                <p className="lead">{subjects.map(s => `${s.subject} is at ${Math.round(s.overall_score*100)}% (${bandFor(s.overall_score*100)})`).join('. ')}{subjects.length ? '.' : ''}</p>
              )}
              <p>Every score is computed from interactions during sessions, using adaptive grading — not from a single end-of-term test.</p>
            </div>
            <aside className="rail">
              <h4 className="accent">At a glance</h4>
              <div className="rail-kpi">
                {subjects.map(s => (
                  <div key={s.subject}>
                    <div className="k">{s.subject}</div>
                    <div className="v">{Math.round(s.overall_score * 100)}<small>%</small></div>
                    <div className="sub">{bandFor(s.overall_score * 100)}</div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* 2. COVERAGE */}
      <div className="pb" />
      <section className="section">
        <div className="s-head">
          <span className="n">2</span>
          <div>
            <h2>What he is reading and learning.</h2>
            <div className="sub">Chapter-by-chapter completion and mastery.</div>
          </div>
        </div>
        <div className="s-body">
          <div className="narrative" style={{ marginBottom: "22px" }}>
            <p className="lead" style={{ maxWidth: "72ch" }}>{chapters.length > 0 ? `${chapters.length} chapter${chapters.length !== 1 ? 's' : ''} across ${subjects.length} subject${subjects.length !== 1 ? 's' : ''}. Each chapter sets its own ZPD; completion reflects how far through the calibrated path ${displayName.split(' ')[0]} has worked, not raw page count.` : `Chapter coverage will appear here once ${displayName.split(' ')[0]} starts studying.`}</p>
          </div>
          {chapters.length > 0 && (
            <>
              <h4 className="accent" style={{ margin: "0 0 14px", font: "600 11px/1 var(--mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--proficient)" }}>Coverage</h4>
              <div className="chap-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                {chapters.map((c, ci) => {
                  const score = Math.round(c.mastery_score * 100);
                  const band = bandFor(score).toLowerCase();
                  return (
                    <div className="chap" key={`${c.subject}-${c.grade}-${c.document_title}-${ci}`}>
                      <div className="ctop">
                        <div><div className="title">{c.document_title}</div><div className="meta">{c.subject} · {c.study_count} sessions</div></div>
                        <span className={`chip ${band}`}>{bandFor(score)}</span>
                      </div>
                      {/* <div className="row"><span className="l">Score</span><b>{score}%</b></div> */}
                      <div className="progress">
                        <div style={{ display:"flex", justifyContent: "space-between", fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
                          <span>Completion</span><span style={{ color: "var(--ink)", fontWeight: 600 }}>{Math.round(c.completion_percentage)}%</span>
                        </div>
                        <div className={`bar ${band}`}><i style={{ width: `${c.completion_percentage}%` }}></i></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* 3. ENGLISH PROFILE */}
      {englishSkills && (<>
      <div className="pb" />
      <section className="section">
        <div className="s-head">
          <span className="n">3</span>
          <div>
            <h2>How he reads aloud.</h2>
            <div className="sub">Oral reading, fluency, comprehension across session modes.</div>
          </div>
        </div>
        <div className="s-body">
          <div className="ep-feature">
            <div className="ep-rings">
              <div className="ring"><div className="k">Accuracy</div><div className="v">{Math.round(ep.avg_accuracy || 0)}<small>%</small></div><div className="bar proficient"><i style={{width: `${ep.avg_accuracy || 0}%`}}></i></div></div>
              <div className="ring"><div className="k">Fluency</div><div className="v">{Math.round(ep.avg_fluency || 0)}<small>%</small></div><div className="bar proficient"><i style={{width: `${ep.avg_fluency || 0}%`}}></i></div></div>
              <div className="ring"><div className="k">Expression</div><div className="v">{Math.round(ep.avg_expression || 0)}<small>%</small></div><div className="bar approaching"><i style={{width: `${ep.avg_expression || 0}%`}}></i></div></div>
              <div className="ring"><div className="k">Comprehension</div><div className="v">{Math.round(ep.avg_comprehension || 0)}<small>%</small></div><div className="bar proficient"><i style={{width: `${ep.avg_comprehension || 0}%`}}></i></div></div>
              <div className="wpm-card"><span className="k">Reading speed</span><span className="v">{Math.round(ep.avg_wpm || 0)}<small>wpm</small></span></div>
            </div>
            <aside>
              <h4 style={{ margin: "0 0 10px", font: "600 11px/1 var(--mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>Session mode breakdown</h4>
              <div className="modes-list">
                {(ep.by_mode || []).map((m: any) => (
                  <div className="mode-row" key={m.mode}>
                    <div><div className="nm">{m.mode.replace('_', ' ')}</div><div className="sub">{m.session_count} sessions</div></div>
                    <div className="mt">
                      <span style={{ color: "var(--muted)" }}>Acc <b>{Math.round(m.avg_accuracy || 0)}%</b></span>
                      <span style={{ color: "var(--muted)" }}>Flu <b>{Math.round(m.avg_fluency || 0)}%</b></span>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>
      </>)}

      {/* 4. CHAPTER TESTS */}
      {testSubmissions.length > 0 && (<>
      <div className="pb" />
      <section className="section">
        <div className="s-head">
          <span className="n">4</span>
          <div>
            <h2>Chapter Test Results</h2>
            <div className="sub">ZPD-calibrated tests.</div>
          </div>
        </div>
        <div className="s-body">
          {testSubmissions.map((t, idx) => (
            <div className="test-feature" key={idx}>
              <div>
                <h3 className="tt">{t.document_title}<span className="subj">{t.subject}</span></h3>
                <div className="secs">
                  {Object.entries(t.section_results).map(([sName, res]) => (
                    <div key={sName}>{sName} <b>{res.correct}/{res.total}</b> · <b>{res.score ? Math.round(res.score * 100) : 0}%</b></div>
                  ))}
                </div>
              </div>
              <div className="right">
                <div className="score">{Math.round(t.overall_score * 100)}<small>%</small></div>
                <span className="pass" style={{ color: t.overall_verdict === "PASS" ? "var(--advanced)" : "var(--developing)", background: t.overall_verdict === "PASS" ? "var(--advanced-bg)" : "var(--developing-bg)" }}>{t.overall_verdict}</span>
                <div className="date">{formatDate(t.submitted_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
      </>)}

      {/* 5. EVOLUTION LINE CHART */}
      {chapterEvolutions.length > 0 && (<>
      <div className="pb" />
      <section className="section">
        <div className="s-head">
          <span className="n">5</span>
          <div>
            <h2>Chapter Learning Evolution</h2>
            <div className="sub">Session-by-session arc with skill dimensions.</div>
          </div>
        </div>
        <div className="s-body">
          {chapterEvolutions.map((c, ci) => {
            const analysis = c.analysis_json || {};
            const dimensions = analysis.dimension_analyses || [];
            const sessionLog = analysis.per_conversation || [];
            const mappedLog = sessionLog.map((s: any, idx: number) => {
               // Assign a mock level based on score/progression if not strictly available
               const score = s.overall_score || (idx / sessionLog.length);
               let level = "beginning";
               if (score > 0.8) level = "advanced";
               else if (score > 0.6) level = "proficient";
               else if (score > 0.4) level = "approaching";
               else if (score > 0.2) level = "developing";
               return { n: idx + 1, level, notes: s.observations || [] };
            });

            const W2 = 720, H2 = 100, pad2 = 18;
            const xs2 = (i: number, n: number) => pad2 + i * ((W2 - pad2*2) / (n > 1 ? n - 1 : 1));
            const ys2 = (lvl: string) => H2 - pad2 - ((levels[lvl as keyof typeof levels] || 1) - 1) * ((H2 - pad2*2) / 4);
            const path = mappedLog.map((s: any, i: number) => `${i === 0 ? "M" : "L"} ${xs2(i, mappedLog.length).toFixed(1)} ${ys2(s.level).toFixed(1)}`).join(" ");

            return (
              <div key={`${c.subject}-${c.document_title}-${ci}`} style={{ marginTop: ci > 0 ? '32px' : '0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div><span style={{ fontSize: '24px', fontFamily: 'var(--display)' }}>{c.document_title}</span></div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{c.conversation_count} sessions</div>
                </div>
                <h3 style={{ fontFamily: 'var(--display)', fontSize: '20px', margin: '6px 0 14px' }}>{c.headline}</h3>

                {mappedLog.length > 0 && (
                <div className="arc-spark">
                  <div className="h"><span className="l">Session arc</span></div>
                  <svg viewBox={`0 0 ${W2} ${H2}`} preserveAspectRatio="none">
                    {[1,2,3,4,5].map(l => (
                       <line key={l} x1={pad2} x2={W2-pad2} y1={H2 - pad2 - (l-1)*((H2-pad2*2)/4)} y2={H2 - pad2 - (l-1)*((H2-pad2*2)/4)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2 3" />
                    ))}
                    <path d={path} fill="none" stroke="#0f172a" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
                    {mappedLog.map((s: any, i: number) => (
                      <g key={i}>
                        <circle cx={xs2(i, mappedLog.length)} cy={ys2(s.level)} r="4" fill={colors[s.level as keyof typeof colors] || colors.beginning} stroke="#fff" strokeWidth="2" />
                        <text x={xs2(i, mappedLog.length)} y={H2 - 4} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill="#94a3b8">{s.n}</text>
                      </g>
                    ))}
                  </svg>
                </div>
                )}

                <div className="dim-grid">
                  {dimensions.map((d: any, i: number) => (
                    <div className="dim" key={i}><div className="dn">{d.dimension || d.name}</div><div className="dd">{d.analysis || d.desc}</div></div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      </>)}

      {/* 6. AI LEARNING INSIGHTS */}
      {progressReport && (<>
      <div className="pb" />
      <section className="section">
        <div className="s-head">
          <span className="n">6</span>
          <div>
            <h2>AI Learning Insights</h2>
            <div className="sub">Holistic progress analysis across all subjects and sessions.</div>
          </div>
        </div>
        <div className="s-body">
          {progressReport.headline && (
            <div className="feature-hero" style={{ marginBottom: "28px" }}>
              <div>
                <p className="lead-quote">"{progressReport.headline}"</p>
                {progressReport.overall_assessment && (
                  <p style={{ fontSize: "15px", lineHeight: 1.7, color: "var(--ink-2)", maxWidth: "60ch" }}>
                    {progressReport.overall_assessment}
                  </p>
                )}
              </div>
              {/* Strengths & Weaknesses */}
              {(() => {
                const strengths: string[] = (progressReport.report_json as any)?.universal_strengths ?? [];
                const weaknesses: string[] = (progressReport.report_json as any)?.universal_weaknesses ?? [];
                return (strengths.length > 0 || weaknesses.length > 0) ? (
                  <aside className="rail">
                    {strengths.length > 0 && (
                      <div style={{ marginBottom: "16px" }}>
                        <h4 style={{ margin: "0 0 8px", font: "600 11px/1 var(--mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--advanced)" }}>Strengths</h4>
                        <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13px", color: "var(--ink-2)", lineHeight: 1.65 }}>
                          {strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {weaknesses.length > 0 && (
                      <div>
                        <h4 style={{ margin: "0 0 8px", font: "600 11px/1 var(--mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--approaching)" }}>Areas to Improve</h4>
                        <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13px", color: "var(--ink-2)", lineHeight: 1.65 }}>
                          {weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    )}
                  </aside>
                ) : null;
              })()}
            </div>
          )}

          {/* Focus Areas */}
          {(() => {
            const focusAreas: any[] = (progressReport.report_json as any)?.focus_areas ?? [];
            return focusAreas.length > 0 ? (
              <div style={{ marginBottom: "28px" }}>
                <h4 style={{ margin: "0 0 4px", font: "600 11px/1 var(--mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>Recommended Focus Areas</h4>
                {focusAreas.map((fa, i) => {
                  const pri = (fa.priority ?? "medium").toUpperCase();
                  return (
                    <div className="focus" key={i}>
                      <span className={`pri ${pri}`}>{pri}</span>
                      <div>
                        <div className="area">{fa.area}</div>
                        {(fa.suggested_approach || fa.rationale) && (
                          <div className="rat">{fa.suggested_approach ?? fa.rationale}</div>
                        )}
                      </div>
                      {fa.subject && <div className="stag">{fa.subject}</div>}
                    </div>
                  );
                })}
              </div>
            ) : null;
          })()}

          {/* Cross-subject patterns */}
          {(() => {
            const patterns: any[] = (progressReport.report_json as any)?.cross_subject_patterns ?? [];
            return patterns.length > 0 ? (
              <div>
                <h4 style={{ margin: "0 0 10px", font: "600 11px/1 var(--mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>Cross-Subject Patterns</h4>
                <div className="pat-grid">
                  {patterns.map((p, i) => (
                    <div key={i} className={`pat ${p.is_positive ? "good" : "warn"}`}>
                      <div className="tg">{p.is_positive ? "Strength" : "Watch"}</div>
                      <h5>{p.pattern_name}</h5>
                      <p style={{ fontSize: "13px", color: "var(--ink-2)", lineHeight: 1.55, margin: 0 }}>{p.summary ?? p.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}
        </div>
      </section>
      </>)}

      {/* 7. SUBJECT LEARNING TRENDS */}
      {subjectEvolutions.length > 0 && (<>
      <div className="pb" />
      <section className="section">
        <div className="s-head">
          <span className="n">7</span>
          <div>
            <h2>Subject Learning Trends</h2>
            <div className="sub">How learning evolved across chapters within each subject.</div>
          </div>
        </div>
        <div className="s-body">
          {subjectEvolutions.map((evo, idx) => {
            const sj = evo.analysis_json ?? ({} as any);
            const strengths: string[] = sj.universal_strengths ?? sj.subject_strengths ?? [];
            const weaknesses: string[] = sj.universal_weaknesses ?? sj.subject_weaknesses ?? [];
            const patterns: any[] = sj.cross_chapter_patterns ?? [];
            const recommendations: any[] = sj.recommendations ?? [];
            return (
              <div key={evo.subject} style={{ borderTop: idx > 0 ? "1px solid var(--border)" : "none", paddingTop: idx > 0 ? "28px" : "0", marginTop: idx > 0 ? "28px" : "0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                  <h3 style={{ fontFamily: "var(--display)", fontSize: "24px", fontWeight: 500, margin: 0 }}>{evo.subject}</h3>
                  <span style={{ font: "500 11px/1 var(--mono)", color: "var(--muted)", letterSpacing: "0.1em" }}>
                    {evo.chapter_count} chapter{evo.chapter_count !== 1 ? "s" : ""}
                  </span>
                </div>
                {evo.headline && (
                  <p style={{ fontFamily: "var(--display)", fontSize: "18px", color: "var(--proficient)", margin: "0 0 10px", fontStyle: "italic" }}>{evo.headline}</p>
                )}
                {evo.subject_skill_trajectory && (
                  <p style={{ fontSize: "15px", lineHeight: 1.7, color: "var(--ink-2)", margin: "0 0 16px", maxWidth: "70ch" }}>{evo.subject_skill_trajectory}</p>
                )}
                {(strengths.length > 0 || weaknesses.length > 0) && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "16px" }}>
                    {strengths.length > 0 && (
                      <div>
                        <h4 style={{ margin: "0 0 6px", font: "600 10.5px/1 var(--mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--advanced)" }}>Strengths</h4>
                        <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13px", color: "var(--ink-2)", lineHeight: 1.65 }}>
                          {strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {weaknesses.length > 0 && (
                      <div>
                        <h4 style={{ margin: "0 0 6px", font: "600 10.5px/1 var(--mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--approaching)" }}>Areas to Improve</h4>
                        <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13px", color: "var(--ink-2)", lineHeight: 1.65 }}>
                          {weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {patterns.length > 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <h4 style={{ margin: "0 0 8px", font: "600 10.5px/1 var(--mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>Patterns Across Chapters</h4>
                    <div className="dim-grid">
                      {patterns.slice(0, 4).map((p: any, i: number) => (
                        <div className="dim" key={i}>
                          <div className="dn">{p.pattern_name}</div>
                          <div className="dd">{p.summary ?? p.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {recommendations.length > 0 && (
                  <div>
                    <h4 style={{ margin: "0 0 6px", font: "600 10.5px/1 var(--mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>Recommendations</h4>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13px", color: "var(--ink-2)", lineHeight: 1.65 }}>
                      {recommendations.slice(0, 4).map((r: any, i: number) => (
                        <li key={i}>{typeof r === "string" ? r : (r.action ?? r.text ?? "")}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      </>)}

      {/* 8. AI CHAPTER REPORTS */}
      {chapters.some((ch) => ch.chapter_report) && (<>
      <div className="pb" />
      <section className="section">
        <div className="s-head">
          <span className="n">8</span>
          <div>
            <h2>AI Chapter Reports</h2>
            <div className="sub">AI-generated pedagogical analysis per chapter — session summary, traits, concept trajectory.</div>
          </div>
        </div>
        <div className="s-body">
          {chapters.filter((ch) => ch.chapter_report).map((ch, idx) => (
            <div key={`${ch.subject}-${ch.document_title}`} className="cr">
              <div className="cr-h">
                <span className="name">{ch.document_title}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  <span style={{ font: "500 11px/1 var(--mono)", color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{ch.subject}</span>
                  <span className={`chip ${bandFor(ch.mastery_score * 100).toLowerCase()}`}>{bandFor(ch.mastery_score * 100)}</span>
                  <span style={{ font: "500 11px/1 var(--mono)", color: "var(--muted)" }}>{ch.study_count} sessions · {Math.round(ch.completion_percentage)}% complete</span>
                </div>
              </div>
              <div
                className="cr-summary prose prose-sm max-w-none
                  prose-h3:font-display prose-h3:text-[var(--ink)] prose-h3:font-medium prose-h3:text-lg prose-h3:mt-5 prose-h3:mb-2 prose-h3:first:mt-0
                  prose-h4:text-[var(--ink)] prose-h4:font-semibold prose-h4:text-sm prose-h4:mt-3 prose-h4:mb-1
                  prose-p:text-[var(--ink-2)] prose-p:leading-relaxed prose-p:my-1
                  prose-li:text-[var(--ink-2)] prose-li:my-0.5
                  prose-strong:text-[var(--ink)] prose-ul:my-1 prose-ul:pl-4"
              >
                <ReactMarkdown>{ch.chapter_report!}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      </section>
      </>)}

      {/* 9. SUBJECT-WISE CHAPTER REPORTS */}
      {subjects.length > 0 && (<>
      <div className="pb" />
      <section className="section">
        <div className="s-head">
          <span className="n">9</span>
          <div>
            <h2>Chapter-by-Chapter Breakdown</h2>
            <div className="sub">Full analysis for every chapter, grouped by subject — mastery, session arc, skill dimensions, and AI report.</div>
          </div>
        </div>
        <div className="s-body">
          {subjects.map((subj, si) => {
            const subjChapters = chapters.filter((c) => c.subject === subj.subject);
            if (subjChapters.length === 0) return null;
            return (
              <div key={subj.subject} style={{ borderTop: si > 0 ? "2px solid var(--border)" : "none", paddingTop: si > 0 ? "36px" : "0", marginTop: si > 0 ? "36px" : "0" }}>
                {/* Subject heading */}
                <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "20px" }}>
                  <h3 style={{ fontFamily: "var(--display)", fontSize: "28px", fontWeight: 500, margin: 0, letterSpacing: "-0.01em" }}>{subj.subject}</h3>
                  <span style={{ font: "500 11px/1 var(--mono)", color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {subjChapters.length} chapter{subjChapters.length !== 1 ? "s" : ""} · {subj.session_count} sessions
                  </span>
                  <span className={`chip ${bandFor(subj.overall_score * 100).toLowerCase()}`}>{bandFor(subj.overall_score * 100)}</span>
                </div>

                {/* Each chapter */}
                {subjChapters.map((ch, chi) => {
                  const evo = chapterEvolutions.find(
                    (e) => e.subject === subj.subject && e.document_title === ch.document_title
                  );
                  const analysis = evo?.analysis_json ?? ({} as any);
                  const dimensions: any[] = analysis.dimension_analyses ?? analysis.dimensions ?? [];
                  const sessionLog: any[] = analysis.per_conversation ?? [];
                  const recommendations: any[] = analysis.recommendations ?? [];

                  // Build sparkline path from session log
                  const mappedLog = sessionLog.map((s: any, idx: number) => {
                    const rawScore = s.overall_score ?? (idx / Math.max(sessionLog.length - 1, 1));
                    let level = "beginning";
                    if (rawScore > 0.8) level = "advanced";
                    else if (rawScore > 0.6) level = "proficient";
                    else if (rawScore > 0.4) level = "approaching";
                    else if (rawScore > 0.2) level = "developing";
                    return { n: idx + 1, level, obs: s.tutor_observations ?? s.observations ?? [] };
                  });

                  const W = 680, H = 80, pad = 16;
                  const xs = (i: number, n: number) => pad + i * ((W - pad * 2) / (n > 1 ? n - 1 : 1));
                  const ys = (lvl: string) => H - pad - ((levels[lvl as keyof typeof levels] || 1) - 1) * ((H - pad * 2) / 4);
                  const sparkPath = mappedLog.length > 1
                    ? mappedLog.map((s: any, i: number) => `${i === 0 ? "M" : "L"} ${xs(i, mappedLog.length).toFixed(1)} ${ys(s.level).toFixed(1)}`).join(" ")
                    : "";

                  return (
                    <div key={`${subj.subject}-${ch.document_title}-${chi}`} style={{ borderTop: chi === 0 ? "1px solid var(--rule-faint)" : "1px solid var(--border)", paddingTop: "20px", marginTop: "20px" }}>
                      {/* Chapter header row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", gap: "16px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
                            <span style={{ fontFamily: "var(--display)", fontSize: "20px", fontWeight: 500 }}>{ch.document_title}</span>
                            <span className={`chip ${bandFor(ch.mastery_score * 100).toLowerCase()}`}>{bandFor(ch.mastery_score * 100)}</span>
                          </div>
                          <div style={{ font: "500 11px/1 var(--mono)", color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                            {ch.study_count} session{ch.study_count !== 1 ? "s" : ""}
                          </div>
                        </div>
                        {/* Mastery + completion stats */}
                        <div style={{ display: "flex", gap: "24px", flexShrink: 0 }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ font: "600 10.5px/1 var(--mono)", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "4px" }}>Mastery</div>
                            <div style={{ fontSize: "24px", fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", color: masteryColor(ch.mastery_score) }}>
                              {Math.round(ch.mastery_score * 100)}<small style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>%</small>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ font: "600 10.5px/1 var(--mono)", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "4px" }}>Complete</div>
                            <div style={{ fontSize: "24px", fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>
                              {Math.round(ch.completion_percentage)}<small style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>%</small>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Completion bar */}
                      <div className={`bar ${bandFor(ch.mastery_score * 100).toLowerCase()}`} style={{ marginBottom: "20px" }}>
                        <i style={{ width: `${Math.round(ch.completion_percentage)}%` }} />
                      </div>

                      {/* Evolution headline + sparkline */}
                      {evo && (
                        <div style={{ marginBottom: "18px" }}>
                          {evo.headline && (
                            <p style={{ fontFamily: "var(--display)", fontSize: "17px", fontStyle: "italic", color: "var(--proficient)", margin: "0 0 10px" }}>{evo.headline}</p>
                          )}
                          {evo.skill_score_trajectory && (
                            <p style={{ fontSize: "14px", lineHeight: 1.65, color: "var(--ink-2)", margin: "0 0 12px", maxWidth: "65ch" }}>{evo.skill_score_trajectory}</p>
                          )}
                          {/* Sparkline */}
                          {mappedLog.length > 1 && (
                            <div className="arc-spark">
                              <div className="h">
                                <span className="l">Session arc — {evo.conversation_count} session{evo.conversation_count !== 1 ? "s" : ""}</span>
                                <div className="level-key">
                                  {(["advanced","proficient","approaching","developing","beginning"] as const).map((l) => (
                                    <span key={l}><i style={{ background: colors[l] }} />{l}</span>
                                  ))}
                                </div>
                              </div>
                              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                                {[1,2,3,4,5].map((l) => (
                                  <line key={l} x1={pad} x2={W-pad} y1={ys(["beginning","developing","approaching","proficient","advanced"][l-1])} y2={ys(["beginning","developing","approaching","proficient","advanced"][l-1])} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2 3" />
                                ))}
                                <path d={sparkPath} fill="none" stroke="#0f172a" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
                                {mappedLog.map((s: any, i: number) => (
                                  <g key={i}>
                                    <circle cx={xs(i, mappedLog.length)} cy={ys(s.level)} r="4" fill={colors[s.level as keyof typeof colors] || colors.beginning} stroke="#fff" strokeWidth="2" />
                                    <text x={xs(i, mappedLog.length)} y={H - 2} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill="#94a3b8">{s.n}</text>
                                  </g>
                                ))}
                              </svg>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Skill dimensions grid */}
                      {dimensions.length > 0 && (
                        <div style={{ marginBottom: "18px" }}>
                          <h4 style={{ margin: "0 0 8px", font: "600 10.5px/1 var(--mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>Skill Dimensions</h4>
                          <div className="dim-grid">
                            {dimensions.map((d: any, i: number) => {
                              const afterScore = typeof d.after_score === "number" ? d.after_score : (typeof d.score === "number" ? d.score : null);
                              const delta = typeof d.delta === "number" ? d.delta : null;
                              const name = d.dimension_name ?? d.dimension ?? d.name ?? "";
                              const obs = d.key_observation ?? d.analysis ?? d.desc ?? "";
                              return (
                                <div className="dim" key={i}>
                                  <div className="dn" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                    <span>{name}</span>
                                    {afterScore != null && (
                                      <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                        <span style={{ fontSize: "14px", fontWeight: 700, color: masteryColor(afterScore), fontVariantNumeric: "tabular-nums" }}>{Math.round(afterScore * 100)}%</span>
                                        {delta != null && delta !== 0 && (
                                          <span style={{ fontSize: "11px", fontWeight: 700, padding: "1px 5px", borderRadius: "4px", background: delta > 0 ? "var(--advanced-bg)" : "var(--developing-bg)", color: delta > 0 ? "var(--advanced)" : "var(--developing)" }}>
                                            {delta > 0 ? "+" : ""}{Math.round(delta * 100)}
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  {afterScore != null && (
                                    <div className={`bar ${bandFor(afterScore * 100).toLowerCase()}`} style={{ height: "3px", marginBottom: "6px" }}>
                                      <i style={{ width: `${Math.round(afterScore * 100)}%` }} />
                                    </div>
                                  )}
                                  {obs && <div className="dd">{obs}</div>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Session-by-session observations */}
                      {sessionLog.length > 0 && (
                        <div style={{ marginBottom: "18px" }}>
                          <h4 style={{ margin: "0 0 8px", font: "600 10.5px/1 var(--mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>Session Log</h4>
                          <div className="arc">
                            {sessionLog.map((s: any, i: number) => {
                              const obs: string[] = s.tutor_observations ?? s.observations ?? [];
                              const stageLabel: string = s.stage_label ?? `Session ${i + 1}`;
                              const lvl = mappedLog[i]?.level ?? "beginning";
                              return (
                                <div className="arc-row" key={i}>
                                  <div className="n">{i + 1}</div>
                                  <div><span className={`lvl lvl-${lvl}`}>{stageLabel}</span></div>
                                  <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13px", color: "var(--ink-2)", lineHeight: 1.6 }}>
                                    {obs.slice(0, 3).map((o: string, j: number) => <li key={j}>{o}</li>)}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {recommendations.length > 0 && (
                        <div style={{ marginBottom: "18px" }}>
                          <h4 style={{ margin: "0 0 6px", font: "600 10.5px/1 var(--mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>Recommendations</h4>
                          <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13px", color: "var(--ink-2)", lineHeight: 1.65 }}>
                            {recommendations.map((r: any, i: number) => (
                              <li key={i}>{typeof r === "string" ? r : (r.action ?? r.text ?? "")}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Chapter AI report markdown */}
                      {ch.chapter_report && (
                        <div style={{ marginTop: "16px", padding: "20px 24px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r)" }}>
                          <div style={{ font: "600 10.5px/1 var(--mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "12px" }}>AI Chapter Report</div>
                          <div
                            className="prose prose-sm max-w-none
                              prose-h3:font-serif prose-h3:text-[var(--ink)] prose-h3:font-medium prose-h3:text-lg prose-h3:mt-5 prose-h3:mb-2 prose-h3:first:mt-0
                              prose-h4:text-[var(--ink)] prose-h4:font-semibold prose-h4:text-sm prose-h4:mt-3 prose-h4:mb-1
                              prose-p:text-[var(--ink-2)] prose-p:text-sm prose-p:leading-relaxed prose-p:my-1.5
                              prose-li:text-sm prose-li:text-[var(--ink-2)] prose-li:my-0.5
                              prose-strong:text-[var(--ink)] prose-ul:my-1 prose-ul:pl-4"
                          >
                            <ReactMarkdown>{ch.chapter_report}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>
      </>)}

      {/* Download PDF button */}
      <div className="print-btn" style={{ textAlign: "center", marginTop: "24px", paddingBottom: "40px" }}>
        <button
          onClick={handlePrint}
          disabled={isPdfGenerating}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 24px",
            background: isPdfGenerating ? "#8899aa" : "var(--navy)",
            color: "white",
            borderRadius: "8px",
            border: "none",
            cursor: isPdfGenerating ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: "14px",
            transition: "background 0.2s",
          }}
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download PDF
            </>
          )}
        </button>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </div>
  );
}
