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

export function StudentReportCard() {
  const { studentProfile } = useStudentStore();

  // ── State ──────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handlePrint = () => {
    // The print document (.print-doc) is always fully rendered in the DOM —
    // no sections to expand, no animations to wait for. Call directly.
    window.print();
  };

  // ── Data Fetching ─────────────────────────────────────
  const studentId = studentProfile?.user_id;

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
    fetchAll();
  }, [fetchAll]);

  // ── Derived values ─────────────────────────────────────
  const displayName =
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
  return (
    <>
      {/* ── PRINT STYLES ── */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 1.2cm 1.5cm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
          body { background: white !important; margin: 0; }
          .screen-ui { display: none !important; }
          .print-doc { display: block !important; font-family: -apple-system, 'Segoe UI', sans-serif; }

          /* Section header bar — same style as screen */
          .pd-section-header {
            display: flex; align-items: center; gap: 8pt;
            padding: 10pt 14pt; border-radius: 10pt 10pt 0 0;
            margin-bottom: 0;
          }
          .pd-section-header-title { font-size: 11pt; font-weight: 700; }
          .pd-section-header-sub { font-size: 8pt; opacity: 0.8; margin-top: 1pt; }

          /* Card wrapper */
          .pd-card {
            border-radius: 10pt; border: 1pt solid #E2E8F0;
            margin-bottom: 10pt; overflow: hidden;
            break-inside: avoid;
          }
          .pd-card-body { padding: 12pt 14pt; background: white; }

          /* Sub-card inside a section */
          .pd-sub-card {
            border: 1pt solid #E2E8F0; border-radius: 8pt;
            padding: 9pt 11pt; margin-bottom: 7pt;
            break-inside: avoid; background: white;
          }

          /* Headline callout */
          .pd-headline {
            font-size: 10pt; font-weight: 600; font-style: italic;
            padding: 6pt 10pt; border-radius: 6pt;
            margin-bottom: 8pt; border-left: 3pt solid;
          }

          /* Tag/badge */
          .pd-tag {
            display: inline-block; font-size: 7.5pt; font-weight: 700;
            padding: 1.5pt 6pt; border-radius: 20pt;
            letter-spacing: 0.02em;
          }

          /* Prose content from markdown */
          .pd-prose { font-size: 9.5pt; line-height: 1.65; color: #334155; }
          .pd-prose h2 { font-size: 11pt; font-weight: 700; color: #042E5C; margin: 10pt 0 4pt; padding-bottom: 3pt; border-bottom: 1pt solid #E2E8F0; }
          .pd-prose h3 { font-size: 10pt; font-weight: 700; color: #1E3A5F; margin: 8pt 0 3pt; }
          .pd-prose h4 { font-size: 9pt; font-weight: 700; color: #334155; margin: 6pt 0 2pt; text-transform: uppercase; letter-spacing: 0.06em; }
          .pd-prose p { margin: 3pt 0 5pt; }
          .pd-prose ul, .pd-prose ol { padding-left: 14pt; margin: 3pt 0; }
          .pd-prose li { margin: 2pt 0; }
          .pd-prose strong { color: #042E5C; }

          /* Stat chips */
          .pd-stat { display: inline-flex; align-items: center; gap: 4pt; font-size: 8.5pt; color: #64748b; margin-right: 10pt; }
          .pd-stat-val { font-weight: 700; color: #1e293b; }

          /* Two-column grid for strength/weakness */
          .pd-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6pt; margin-top: 6pt; }

          /* Strength/weakness item */
          .pd-bullet { display: flex; align-items: flex-start; gap: 5pt; font-size: 9pt; padding: 4pt 0; border-bottom: 0.5pt solid #F1F5F9; }
          .pd-bullet:last-child { border-bottom: none; }
          .pd-bullet-icon { width: 14pt; text-align: center; flex-shrink: 0; font-size: 9pt; margin-top: 1pt; }

          /* Focus area row */
          .pd-focus { display: flex; align-items: flex-start; gap: 8pt; padding: 6pt 8pt; border-radius: 6pt; margin-bottom: 5pt; break-inside: avoid; }
          .pd-focus-priority { font-size: 7.5pt; font-weight: 700; padding: 1pt 5pt; border-radius: 3pt; white-space: nowrap; flex-shrink: 0; margin-top: 1pt; }

          /* Pattern row */
          .pd-pattern { padding: 7pt 10pt; border-radius: 7pt; margin-bottom: 6pt; break-inside: avoid; }

          /* Two-col layout for the doc */
          .pd-meta-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12pt; }

          /* Progress bars — plain divs so they render in print */
          .pd-bar-track {
            width: 100%; height: 4pt; background: #E2E8F0;
            border-radius: 2pt; overflow: hidden;
          }
          .pd-bar-fill {
            height: 4pt; border-radius: 2pt;
          }

          /* Subject card grid — 3 columns */
          .pd-subject-grid {
            display: grid; grid-template-columns: 1fr 1fr 1fr;
            gap: 6pt;
          }

          /* English metric tiles — 5 columns */
          .pd-metric-grid {
            display: grid; grid-template-columns: repeat(5, 1fr);
            gap: 4pt;
          }
        }
        @media screen { .print-doc { display: none; } }
      `}</style>

    {/* ── INTERACTIVE UI (screen only) ── */}
    <div className="screen-ui min-h-screen bg-[#F8F9FA]">

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── REPORT HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="report-header bg-white rounded-2xl border border-slate-200 shadow-sm mb-5 overflow-hidden"
        >
          {/* Accent stripe */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#042E5C] via-[#059F6D] to-[#7C3AED]" />

          <div className="px-6 py-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              {/* Student info */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#042E5C] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                  {displayInitials}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#042E5C]">
                    {displayName}
                  </h1>
                  <p className="text-sm text-slate-500">
                    {displayGrade ? `Grade ${displayGrade}` : ""}
                    {displayGrade && displayBoard ? " · " : ""}
                    {displayBoard ?? ""}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cumulative Learning Report
                  </p>
                </div>
              </div>

              {/* Overall score */}
              <div className="flex flex-col items-start sm:items-end gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">
                    Cumulative Score
                  </span>
                </div>
                {overallAvg > 0 ? (
                  <>
                    <div className="flex items-end gap-1">
                      <span
                        className="text-4xl font-bold"
                        style={{ color: masteryColor(overallAvg) }}
                      >
                        {Math.round(overallAvg * 100)}
                      </span>
                      <span className="text-slate-400 text-lg mb-1">/100</span>
                    </div>
                    <div
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${masteryBg(overallAvg)}`}
                    >
                      {masteryLabel(overallAvg)} Level
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-slate-400">
                    No score data yet
                  </span>
                )}
              </div>
            </div>

            {/* Quick stats row */}
            <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Subjects", value: subjects.length, sub: "active" },
                { label: "Sessions", value: totalSessions, sub: "total" },
                { label: "Chapters", value: chapters.length, sub: "covered" },
                {
                  label: "Tests Taken",
                  value: testSubmissions.length,
                  sub: "completed",
                },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-bold text-[#042E5C]">
                    {s.value}
                  </div>
                  <div className="text-xs text-slate-400">
                    {s.label}{" "}
                    <span className="text-slate-300">({s.sub})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Generated {generatedAt} · AI Tutor: {displayAiName}
            </span>
            <div className="flex gap-2 print-hide">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#042E5C] transition-colors px-3 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200"
              >
                <Download size={13} />
                Print / PDF
              </button>
              <button
                onClick={fetchAll}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#042E5C] transition-colors px-3 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200"
              >
                <RefreshCw size={13} />
                Refresh
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── EXPAND ALL/COLLAPSE ── */}
        <div className="flex justify-end mb-3 print-hide">
          <button
            onClick={() => {
              const allOpen = Object.values(sections).every(Boolean);
              const newVal = !allOpen;
              setSections({
                subjects: newVal,
                curriculum: newVal,
                skills: newVal,
                english: newVal,
                tests: newVal,
                reports: newVal,
                aiInsights: newVal,
                subjectEvolution: newVal,
                chapterEvolution: newVal,
              });
            }}
            className="text-xs text-slate-500 hover:text-[#042E5C] transition-colors font-medium"
          >
            {Object.values(sections).every(Boolean)
              ? "Collapse all sections"
              : "Expand all sections"}
          </button>
        </div>

        {/* ── SECTIONS ── */}
        <div className="space-y-3">
          {/* ── AI Insights first — holistic summary at a glance ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="report-section"
          >
            <AIInsightsSection
              progressReport={progressReport}
              expanded={sections.aiInsights}
              onToggle={() => toggle("aiInsights")}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="report-section"
          >
            <SubjectEvolutionSection
              subjects={subjects}
              subjectEvolutions={subjectEvolutions}
              expanded={sections.subjectEvolution}
              onToggle={() => toggle("subjectEvolution")}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="report-section"
          >
            <ChapterEvolutionSection
              subjects={subjects}
              chapterEvolutions={chapterEvolutions}
              expanded={sections.chapterEvolution}
              onToggle={() => toggle("chapterEvolution")}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="report-section"
          >
            <SubjectSummarySection
              subjects={subjects}
              expanded={sections.subjects}
              onToggle={() => toggle("subjects")}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="report-section"
          >
            <CurriculumSection
              subjects={subjects}
              chapters={chapters}
              expanded={sections.curriculum}
              onToggle={() => toggle("curriculum")}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="report-section"
          >
            <SkillMasterySection
              subjects={subjects}
              skillTree={skillTree}
              expanded={sections.skills}
              onToggle={() => toggle("skills")}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="report-section"
          >
            <EnglishSkillsSection
              englishSkills={englishSkills}
              expanded={sections.english}
              onToggle={() => toggle("english")}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="report-section"
          >
            <TestPerformanceSection
              testSubmissions={testSubmissions}
              expanded={sections.tests}
              onToggle={() => toggle("tests")}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="report-section"
          >
            <ChapterReportsSection
              chapters={chapters}
              expanded={sections.reports}
              onToggle={() => toggle("reports")}
            />
          </motion.div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-400">
          GenEducation AI Report · All scores are AI-computed based on learning
          interactions
        </div>
      </div>
    </div>{/* end screen-ui */}

    {/* ── PRINT DOCUMENT (print only) ── */}
    <div className="print-doc">

      {/* ── DOC HEADER ── */}
      <div style={{ background: "linear-gradient(135deg,#042E5C 0%,#0f4c85 100%)", borderRadius: "10pt", padding: "14pt 18pt", marginBottom: "12pt", color: "white" }}>
        <div className="pd-meta-row" style={{ marginBottom: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10pt" }}>
            <div style={{ width: "32pt", height: "32pt", borderRadius: "8pt", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13pt", fontWeight: 800 }}>
              {displayInitials}
            </div>
            <div>
              <div style={{ fontSize: "8pt", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7, marginBottom: "2pt" }}>GenEducation Report Card</div>
              <div style={{ fontSize: "15pt", fontWeight: 800, lineHeight: 1.15 }}>{displayName}</div>
              <div style={{ fontSize: "8.5pt", opacity: 0.85, marginTop: "1pt" }}>
                {displayGrade ? `Grade ${displayGrade}` : ""}{displayGrade && displayBoard ? " · " : ""}{displayBoard ?? ""}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "8pt", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2pt" }}>Overall Average</div>
            <div style={{ fontSize: "18pt", fontWeight: 800, lineHeight: 1 }}>{Math.round(overallAvg * 100)}%</div>
            <div style={{ fontSize: "7.5pt", opacity: 0.7, marginTop: "3pt" }}>{generatedAt}</div>
            <div style={{ fontSize: "7.5pt", opacity: 0.7 }}>{totalSessions} sessions · {subjects.length} subjects</div>
          </div>
        </div>
      </div>

      {/* ═════════ SECTION 1: SUBJECT-WISE PERFORMANCE ═════════ */}
      {subjects.length > 0 && (
        <div className="pd-card">
          <div className="pd-section-header" style={{ background: "#EFF6FF", borderBottom: "1pt solid #BFDBFE" }}>
            <div style={{ width: "20pt", height: "20pt", borderRadius: "5pt", background: "#042E5C", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10pt", fontWeight: 700 }}>1</div>
            <div>
              <div className="pd-section-header-title" style={{ color: "#042E5C" }}>Subject-wise Performance</div>
              <div className="pd-section-header-sub" style={{ color: "#1E40AF" }}>Overall score, skill index &amp; adaptive mode per subject</div>
            </div>
          </div>
          <div className="pd-card-body">
            <div className="pd-subject-grid">
              {subjects.map((s, idx) => {
                const accent = SUBJECT_ACCENTS[idx % SUBJECT_ACCENTS.length];
                const modeCfg: Record<string, { bg: string; text: string; label: string }> = {
                  CHALLENGE: { bg: "#DBEAFE", text: "#1E40AF", label: "Challenge" },
                  PRACTICE:  { bg: "#FEF3C7", text: "#92400E", label: "Practice" },
                  REMEDIAL:  { bg: "#FEE2E2", text: "#991B1B", label: "Remedial" },
                };
                const mc = modeCfg[s.adaptive_mode] ?? modeCfg.PRACTICE;
                return (
                  <div key={s.subject} style={{ border: `1pt solid ${accent}33`, background: `${accent}0D`, borderRadius: "8pt", padding: "9pt 11pt", breakInside: "avoid" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "7pt" }}>
                      <div style={{ fontSize: "10pt", fontWeight: 800, color: "#042E5C" }}>{s.subject}</div>
                      <span className="pd-tag" style={{ background: mc.bg, color: mc.text }}>{mc.label}</span>
                    </div>
                    {/* Overall Score */}
                    <div style={{ marginBottom: "6pt" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "7.5pt", color: "#64748b", marginBottom: "2pt" }}>
                        <span>Overall Score</span>
                        <span style={{ fontWeight: 800, color: masteryColor(s.overall_score) }}>{pct(s.overall_score)}</span>
                      </div>
                      <div className="pd-bar-track"><div className="pd-bar-fill" style={{ width: `${Math.round(s.overall_score * 100)}%`, background: masteryColor(s.overall_score) }} /></div>
                    </div>
                    {/* Skill Index */}
                    <div style={{ marginBottom: "6pt" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "7.5pt", color: "#64748b", marginBottom: "2pt" }}>
                        <span>Skill Index</span>
                        <span style={{ fontWeight: 800, color: masteryColor(s.skill_index) }}>{pct(s.skill_index)}</span>
                      </div>
                      <div className="pd-bar-track"><div className="pd-bar-fill" style={{ width: `${Math.round(s.skill_index * 100)}%`, background: masteryColor(s.skill_index) }} /></div>
                    </div>
                    <div style={{ fontSize: "7.5pt", color: "#64748b" }}>⏱ {s.session_count} learning sessions</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═════════ SECTION 2: CURRICULUM COVERAGE ═════════ */}
      {chapters.length > 0 && (
        <div className="pd-card">
          <div className="pd-section-header" style={{ background: "#F5F3FF", borderBottom: "1pt solid #DDD6FE" }}>
            <div style={{ width: "20pt", height: "20pt", borderRadius: "5pt", background: "#7C3AED", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10pt", fontWeight: 700 }}>2</div>
            <div>
              <div className="pd-section-header-title" style={{ color: "#5B21B6" }}>Curriculum Coverage</div>
              <div className="pd-section-header-sub" style={{ color: "#7C3AED" }}>Chapter-by-chapter completion and mastery</div>
            </div>
          </div>
          <div className="pd-card-body">
            {subjects.map((subj) => {
              const subjChapters = chapters.filter((c) => c.subject === subj.subject);
              if (subjChapters.length === 0) return null;
              return (
                <div key={subj.subject} style={{ marginBottom: "10pt", breakInside: "avoid" }}>
                  <div style={{ fontSize: "9.5pt", fontWeight: 800, color: "#5B21B6", marginBottom: "5pt", padding: "3pt 8pt", background: "#F5F3FF", borderRadius: "4pt", borderLeft: "2pt solid #7C3AED" }}>
                    {subj.subject}
                    <span style={{ fontSize: "7.5pt", fontWeight: 600, color: "#7C3AED", marginLeft: "6pt" }}>({subjChapters.length} chapter{subjChapters.length !== 1 ? "s" : ""})</span>
                  </div>
                  {subjChapters.map((ch) => (
                    <div key={ch.document_title} style={{ marginBottom: "5pt", padding: "4pt 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2pt" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5pt", flex: 1, minWidth: 0 }}>
                          <span style={{ width: "5pt", height: "5pt", borderRadius: "50%", background: masteryColor(ch.mastery_score), display: "inline-block", flexShrink: 0 }} />
                          <span style={{ fontSize: "8.5pt", color: "#1e293b", fontWeight: 500 }}>{ch.document_title}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6pt", flexShrink: 0 }}>
                          <span style={{ fontSize: "7.5pt", color: "#94A3B8" }}>{ch.study_count} sessions</span>
                          <span style={{ fontSize: "7.5pt", fontWeight: 700, padding: "1pt 5pt", borderRadius: "10pt", background: `${masteryColor(ch.mastery_score)}1A`, color: masteryColor(ch.mastery_score) }}>{pct(ch.mastery_score)}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "5pt" }}>
                        <div className="pd-bar-track" style={{ flex: 1 }}><div className="pd-bar-fill" style={{ width: `${Math.round(ch.completion_percentage)}%`, background: masteryColor(ch.mastery_score) }} /></div>
                        <span style={{ fontSize: "7pt", fontWeight: 700, color: "#64748b", width: "22pt", textAlign: "right" }}>{Math.round(ch.completion_percentage)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            {/* Legend */}
            <div style={{ marginTop: "8pt", paddingTop: "6pt", borderTop: "0.5pt solid #E2E8F0", display: "flex", gap: "10pt", flexWrap: "wrap" }}>
              <span style={{ fontSize: "7pt", color: "#94A3B8", fontWeight: 700 }}>MASTERY:</span>
              {[
                { label: "Advanced (≥80%)", color: "#059F6D" },
                { label: "Proficient (60–79%)", color: "#10B981" },
                { label: "Approaching (40–59%)", color: "#F59E0B" },
                { label: "Developing (<40%)", color: "#EF4444" },
              ].map((l) => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "3pt" }}>
                  <span style={{ width: "6pt", height: "6pt", borderRadius: "50%", background: l.color, display: "inline-block" }} />
                  <span style={{ fontSize: "7pt", color: "#64748b" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═════════ SECTION 3: SKILL MASTERY BREAKDOWN ═════════ */}
      {skillTree.length > 0 && (
        <div className="pd-card">
          <div className="pd-section-header" style={{ background: "#ECFDF5", borderBottom: "1pt solid #A7F3D0" }}>
            <div style={{ width: "20pt", height: "20pt", borderRadius: "5pt", background: "#059F6D", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10pt", fontWeight: 700 }}>3</div>
            <div>
              <div className="pd-section-header-title" style={{ color: "#047857" }}>Skill Mastery Breakdown</div>
              <div className="pd-section-header-sub" style={{ color: "#059F6D" }}>Concept Groups → Concepts → Learning Outcomes</div>
            </div>
          </div>
          <div className="pd-card-body">
            {subjects.map((subj) => {
              const subjCGs = skillTree.filter((cg) => cg.subject === subj.subject);
              if (subjCGs.length === 0) return null;
              return (
                <div key={subj.subject} style={{ marginBottom: "10pt" }}>
                  <div style={{ fontSize: "9.5pt", fontWeight: 800, color: "#047857", marginBottom: "5pt", padding: "3pt 8pt", background: "#ECFDF5", borderRadius: "4pt", borderLeft: "2pt solid #059F6D" }}>
                    {subj.subject}
                  </div>
                  {subjCGs.map((cg) => (
                    <div key={cg.cg_id} style={{ border: "0.5pt solid #E2E8F0", borderRadius: "5pt", padding: "5pt 8pt", marginBottom: "4pt", breakInside: "avoid", background: "white" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3pt" }}>
                        <span style={{ fontSize: "8.5pt", fontWeight: 700, color: "#042E5C", flex: 1 }}>{cg.cg_name}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "5pt", flexShrink: 0 }}>
                          <div className="pd-bar-track" style={{ width: "60pt" }}><div className="pd-bar-fill" style={{ width: `${Math.round(cg.avg_mastery * 100)}%`, background: masteryColor(cg.avg_mastery) }} /></div>
                          <span style={{ fontSize: "8pt", fontWeight: 800, color: masteryColor(cg.avg_mastery), minWidth: "20pt", textAlign: "right" }}>{pct(cg.avg_mastery)}</span>
                          <span style={{ fontSize: "6.5pt", fontWeight: 700, padding: "1pt 4pt", borderRadius: "8pt", background: `${masteryColor(cg.avg_mastery)}1A`, color: masteryColor(cg.avg_mastery) }}>{masteryLabel(cg.avg_mastery)}</span>
                        </div>
                      </div>
                      {cg.concepts.length > 0 && (
                        <div style={{ paddingLeft: "10pt", borderLeft: "1pt solid #E2E8F0", marginTop: "3pt" }}>
                          {cg.concepts.map((concept) => (
                            <div key={concept.c_id} style={{ marginBottom: "2pt" }}>
                              <div style={{ fontSize: "7.5pt", fontWeight: 600, color: "#475569" }}>
                                {concept.c_name} <span style={{ color: "#94A3B8", fontWeight: 400 }}>({concept.los.length} LOs)</span>
                              </div>
                              {concept.los.slice(0, 4).map((lo) => (
                                <div key={lo.skill_id} style={{ display: "flex", alignItems: "center", gap: "4pt", padding: "1pt 0 1pt 8pt" }}>
                                  <span style={{ width: "3pt", height: "3pt", borderRadius: "50%", background: masteryColor(lo.mastery_level), display: "inline-block", flexShrink: 0 }} />
                                  <span style={{ fontSize: "7pt", color: "#64748b", flex: 1 }}>{lo.skill_name}</span>
                                  <div className="pd-bar-track" style={{ width: "40pt", height: "3pt" }}><div className="pd-bar-fill" style={{ width: `${Math.round(lo.mastery_level * 100)}%`, background: masteryColor(lo.mastery_level) }} /></div>
                                  <span style={{ fontSize: "6.5pt", fontWeight: 700, color: masteryColor(lo.mastery_level), width: "18pt", textAlign: "right" }}>{pct(lo.mastery_level)}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═════════ SECTION 4: ENGLISH SKILLS PROFILE ═════════ */}
      {englishSkills && englishSkills.total_sessions > 0 && (
        <div className="pd-card">
          <div className="pd-section-header" style={{ background: "#F0F9FF", borderBottom: "1pt solid #BAE6FD" }}>
            <div style={{ width: "20pt", height: "20pt", borderRadius: "5pt", background: "#0EA5E9", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10pt", fontWeight: 700 }}>4</div>
            <div>
              <div className="pd-section-header-title" style={{ color: "#0C4A6E" }}>English Skills Profile</div>
              <div className="pd-section-header-sub" style={{ color: "#0369A1" }}>Oral reading, fluency, comprehension across session modes</div>
            </div>
          </div>
          <div className="pd-card-body">
            {/* Metric tiles */}
            <div className="pd-metric-grid" style={{ marginBottom: "9pt" }}>
              {[
                { label: "Accuracy", val: englishSkills.avg_accuracy },
                { label: "Fluency", val: englishSkills.avg_fluency },
                { label: "Expression", val: englishSkills.avg_expression },
                { label: "Comprehension", val: englishSkills.avg_comprehension },
                { label: "WPM", val: null, wpm: englishSkills.avg_wpm ? Math.round(englishSkills.avg_wpm) : null },
              ].map((m) => (
                <div key={m.label} style={{ background: "#F0F9FF", border: "1pt solid #BAE6FD", borderRadius: "6pt", padding: "6pt 4pt", textAlign: "center" }}>
                  <div style={{ fontSize: "14pt", fontWeight: 800, color: m.val != null ? masteryColor(m.val) : "#0EA5E9", lineHeight: 1 }}>
                    {"wpm" in m && m.wpm != null ? m.wpm : m.val != null ? pct(m.val) : "—"}
                  </div>
                  <div style={{ fontSize: "7pt", color: "#64748b", fontWeight: 600, marginTop: "2pt" }}>{m.label}</div>
                  {m.val != null && (
                    <div className="pd-bar-track" style={{ marginTop: "3pt", height: "2.5pt" }}>
                      <div className="pd-bar-fill" style={{ width: `${Math.round(m.val * 100)}%`, background: masteryColor(m.val), height: "2.5pt" }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Per-mode breakdown */}
            {englishSkills.by_mode.length > 0 && (
              <>
                <div style={{ fontSize: "8pt", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4pt" }}>Session Mode Breakdown</div>
                {englishSkills.by_mode.map((mode) => (
                  <div key={mode.mode} style={{ background: "#F8FAFC", borderRadius: "5pt", padding: "5pt 8pt", marginBottom: "3pt", breakInside: "avoid" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2pt" }}>
                      <span style={{ fontSize: "8.5pt", fontWeight: 600, color: "#042E5C" }}>{MODE_LABELS[mode.mode] ?? mode.mode}</span>
                      <span style={{ fontSize: "7pt", color: "#94A3B8" }}>{mode.session_count} sessions</span>
                    </div>
                    <div style={{ display: "flex", gap: "8pt", flexWrap: "wrap", fontSize: "7.5pt", color: "#64748b" }}>
                      {mode.avg_accuracy != null && <span>Accuracy: <strong style={{ color: masteryColor(mode.avg_accuracy) }}>{pct(mode.avg_accuracy)}</strong></span>}
                      {mode.avg_fluency != null && <span>Fluency: <strong style={{ color: masteryColor(mode.avg_fluency) }}>{pct(mode.avg_fluency)}</strong></span>}
                      {mode.avg_comprehension != null && <span>Comp: <strong style={{ color: masteryColor(mode.avg_comprehension) }}>{pct(mode.avg_comprehension)}</strong></span>}
                      {mode.avg_wpm != null && <span>WPM: <strong style={{ color: "#0369A1" }}>{Math.round(mode.avg_wpm)}</strong></span>}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ═════════ SECTION 5: CHAPTER TEST RESULTS ═════════ */}
      {testSubmissions.length > 0 && (
        <div className="pd-card">
          <div className="pd-section-header" style={{ background: "#FFFBEB", borderBottom: "1pt solid #FDE68A" }}>
            <div style={{ width: "20pt", height: "20pt", borderRadius: "5pt", background: "#F59E0B", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10pt", fontWeight: 700 }}>5</div>
            <div>
              <div className="pd-section-header-title" style={{ color: "#92400E" }}>Chapter Test Results</div>
              <div className="pd-section-header-sub" style={{ color: "#B45309" }}>ZPD-calibrated tests: scores and section-wise breakdown</div>
            </div>
          </div>
          <div className="pd-card-body">
            {testSubmissions.map((test) => {
              const passed = (test.overall_verdict ?? "").toLowerCase() === "pass";
              return (
                <div key={test.submission_id} style={{ border: "0.5pt solid #E2E8F0", borderRadius: "6pt", padding: "6pt 9pt", marginBottom: "5pt", breakInside: "avoid", background: "white" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4pt" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5pt", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "9pt", fontWeight: 700, color: "#042E5C" }}>{test.document_title}</span>
                        <span className="pd-tag" style={{ background: "#F1F5F9", color: "#64748b" }}>{test.subject}</span>
                      </div>
                      <div style={{ fontSize: "7pt", color: "#94A3B8", marginTop: "1pt" }}>{formatDate(test.submitted_at)}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5pt", flexShrink: 0 }}>
                      <div className="pd-bar-track" style={{ width: "50pt" }}><div className="pd-bar-fill" style={{ width: `${Math.round(test.overall_score * 100)}%`, background: masteryColor(test.overall_score) }} /></div>
                      <span style={{ fontSize: "10pt", fontWeight: 800, color: masteryColor(test.overall_score) }}>{pct(test.overall_score)}</span>
                      <span style={{ fontSize: "7pt", fontWeight: 800, padding: "1pt 5pt", borderRadius: "10pt", background: passed ? "#D1FAE5" : "#FEE2E2", color: passed ? "#065F46" : "#991B1B" }}>
                        {(test.overall_verdict ?? "—").toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {Object.keys(test.section_results ?? {}).length > 0 && (
                    <div style={{ paddingLeft: "8pt", borderLeft: "1pt solid #FDE68A", marginTop: "4pt" }}>
                      <div style={{ fontSize: "6.5pt", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: "2pt" }}>Section Results</div>
                      {Object.entries(test.section_results).map(([section, data]) => {
                        const score = typeof data.score === "number" ? data.score : (data.correct ?? 0) / (data.total ?? 1);
                        return (
                          <div key={section} style={{ display: "flex", alignItems: "center", gap: "5pt", padding: "1pt 0" }}>
                            <span style={{ fontSize: "7.5pt", color: "#475569", flex: 1 }}>{section}</span>
                            {data.correct != null && data.total != null && (
                              <span style={{ fontSize: "7pt", color: "#94A3B8" }}>{data.correct}/{data.total}</span>
                            )}
                            <div className="pd-bar-track" style={{ width: "40pt", height: "3pt" }}><div className="pd-bar-fill" style={{ width: `${Math.round(score * 100)}%`, background: masteryColor(score), height: "3pt" }} /></div>
                            <span style={{ fontSize: "7pt", fontWeight: 700, color: masteryColor(score), width: "18pt", textAlign: "right" }}>{pct(score)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═════════ SECTION 6: AI LEARNING INSIGHTS ═════════ */}
      {progressReport && (() => {
        const rj = progressReport.report_json ?? {} as any;
        const strengths: string[] = rj.universal_strengths ?? [];
        const weaknesses: string[] = rj.universal_weaknesses ?? [];
        const focusAreas: any[] = rj.focus_areas ?? [];
        const patterns: any[] = rj.cross_subject_patterns ?? [];
        return (
          <div className="pd-card">
            <div className="pd-section-header" style={{ background: "#FAF5FF", borderBottom: "1pt solid #E9D5FF" }}>
              <div style={{ width: "20pt", height: "20pt", borderRadius: "5pt", background: "#7C2D96", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10pt", fontWeight: 700 }}>6</div>
              <div>
                <div className="pd-section-header-title" style={{ color: "#6B21A8" }}>AI Learning Insights</div>
                <div className="pd-section-header-sub" style={{ color: "#7C2D96" }}>Holistic progress analysis across all subjects and sessions</div>
              </div>
            </div>
            <div className="pd-card-body">
              {progressReport.headline && (
                <div className="pd-headline" style={{ background: "#FAF5FF", borderLeftColor: "#7C2D96", color: "#6B21A8" }}>
                  {progressReport.headline}
                </div>
              )}
              {progressReport.overall_assessment && (
                <div style={{ marginBottom: "8pt" }}>
                  <div style={{ fontSize: "8pt", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "3pt" }}>Overall Assessment</div>
                  <p style={{ fontSize: "9pt", lineHeight: 1.6, color: "#334155" }}>{progressReport.overall_assessment}</p>
                </div>
              )}
              {(strengths.length > 0 || weaknesses.length > 0) && (
                <div className="pd-grid-2" style={{ marginBottom: "8pt" }}>
                  {strengths.length > 0 && (
                    <div style={{ background: "#F0FDF4", border: "1pt solid #BBF7D0", borderRadius: "6pt", padding: "6pt 9pt" }}>
                      <div style={{ fontSize: "7.5pt", fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3pt" }}>★ Strengths</div>
                      {strengths.map((s, i) => (
                        <div key={i} style={{ display: "flex", gap: "4pt", padding: "2pt 0", fontSize: "8pt" }}>
                          <span style={{ color: "#22C55E", fontWeight: 700, flexShrink: 0 }}>✓</span>
                          <span style={{ color: "#166534" }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {weaknesses.length > 0 && (
                    <div style={{ background: "#FFFBEB", border: "1pt solid #FDE68A", borderRadius: "6pt", padding: "6pt 9pt" }}>
                      <div style={{ fontSize: "7.5pt", fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3pt" }}>⚠ Areas to Improve</div>
                      {weaknesses.map((w, i) => (
                        <div key={i} style={{ display: "flex", gap: "4pt", padding: "2pt 0", fontSize: "8pt" }}>
                          <span style={{ color: "#F59E0B", fontWeight: 700, flexShrink: 0 }}>→</span>
                          <span style={{ color: "#78350F" }}>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {focusAreas.length > 0 && (
                <div style={{ marginBottom: "8pt" }}>
                  <div style={{ fontSize: "8pt", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "3pt" }}>Recommended Focus Areas</div>
                  {focusAreas.map((fa: any, i: number) => {
                    const pri = (fa.priority ?? "medium").toLowerCase();
                    const cfg = pri === "high"
                      ? { bg: "#FEF2F2", border: "#FECACA", chip: "#FEE2E2", text: "#991B1B" }
                      : pri === "low"
                      ? { bg: "#F0FDF4", border: "#BBF7D0", chip: "#D1FAE5", text: "#166534" }
                      : { bg: "#FFFBEB", border: "#FDE68A", chip: "#FEF3C7", text: "#92400E" };
                    return (
                      <div key={i} style={{ display: "flex", gap: "6pt", padding: "5pt 7pt", borderRadius: "5pt", background: cfg.bg, border: `0.5pt solid ${cfg.border}`, marginBottom: "3pt", breakInside: "avoid" }}>
                        <span style={{ fontSize: "6.5pt", fontWeight: 800, padding: "1pt 4pt", borderRadius: "8pt", background: cfg.chip, color: cfg.text, height: "fit-content", flexShrink: 0, textTransform: "uppercase" }}>{pri}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "4pt", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "8.5pt", fontWeight: 700, color: cfg.text }}>{fa.area}</span>
                            {fa.subject && <span className="pd-tag" style={{ background: "white", color: "#64748b", border: `0.5pt solid ${cfg.border}` }}>{fa.subject}</span>}
                          </div>
                          {fa.suggested_approach && <div style={{ fontSize: "7.5pt", color: "#64748b", marginTop: "1pt", lineHeight: 1.4 }}>{fa.suggested_approach}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {patterns.length > 0 && (
                <div>
                  <div style={{ fontSize: "8pt", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "3pt" }}>Cross-Subject Patterns</div>
                  {patterns.map((p: any, i: number) => (
                    <div key={i} style={{ display: "flex", gap: "5pt", padding: "4pt 7pt", background: "#F8FAFC", borderRadius: "5pt", border: "0.5pt solid #E2E8F0", marginBottom: "3pt", breakInside: "avoid" }}>
                      <span style={{ width: "4pt", height: "4pt", borderRadius: "50%", background: "#A855F7", marginTop: "5pt", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "8.5pt", fontWeight: 700, color: "#042E5C" }}>{p.pattern_name}</div>
                        {p.description && <div style={{ fontSize: "7.5pt", color: "#64748b", marginTop: "1pt" }}>{p.description}</div>}
                        {p.subjects_involved?.length > 0 && (
                          <div style={{ display: "flex", gap: "3pt", flexWrap: "wrap", marginTop: "2pt" }}>
                            {p.subjects_involved.map((s: string) => <span key={s} className="pd-tag" style={{ background: "#F3E8FF", color: "#6B21A8", fontSize: "6.5pt" }}>{s}</span>)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Full AI report markdown — always shown in print */}
              {progressReport.report_markdown && (
                <div style={{ marginTop: "10pt", padding: "8pt 10pt", background: "#FAF5FF", border: "0.5pt solid #E9D5FF", borderRadius: "6pt", breakInside: "auto" }}>
                  <div style={{ fontSize: "8pt", fontWeight: 700, color: "#6B21A8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5pt" }}>Full AI Report</div>
                  <div className="pd-prose"><ReactMarkdown>{progressReport.report_markdown}</ReactMarkdown></div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ═════════ SECTION 7: SUBJECT LEARNING TRENDS ═════════ */}
      {subjectEvolutions.length > 0 && (
        <div className="pd-card">
          <div className="pd-section-header" style={{ background: "#ECFEFF", borderBottom: "1pt solid #A5F3FC" }}>
            <div style={{ width: "20pt", height: "20pt", borderRadius: "5pt", background: "#0891B2", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10pt", fontWeight: 700 }}>7</div>
            <div>
              <div className="pd-section-header-title" style={{ color: "#0E7490" }}>Subject Learning Trends</div>
              <div className="pd-section-header-sub" style={{ color: "#0891B2" }}>How learning evolved across chapters within each subject</div>
            </div>
          </div>
          <div className="pd-card-body">
            {subjectEvolutions.map((evo) => {
              const sj = evo.analysis_json ?? {} as any;
              const strengths: string[] = sj.universal_strengths ?? sj.subject_strengths ?? [];
              const weaknesses: string[] = sj.universal_weaknesses ?? sj.subject_weaknesses ?? [];
              const patterns: any[] = sj.cross_chapter_patterns ?? [];
              const recommendations: any[] = sj.recommendations ?? [];
              return (
                <div key={evo.subject} style={{ borderLeft: "3pt solid #0891B2", background: "#F0FDFF", padding: "8pt 10pt", borderRadius: "5pt", marginBottom: "6pt", breakInside: "avoid" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4pt" }}>
                    <span style={{ fontSize: "10pt", fontWeight: 800, color: "#0E7490" }}>{evo.subject}</span>
                    <span className="pd-tag" style={{ background: "#CFFAFE", color: "#0E7490" }}>{evo.chapter_count} chapter{evo.chapter_count !== 1 ? "s" : ""}</span>
                  </div>
                  {evo.headline && <div style={{ fontSize: "9pt", fontWeight: 600, fontStyle: "italic", color: "#0891B2", marginBottom: "4pt" }}>{evo.headline}</div>}
                  {evo.subject_skill_trajectory && (
                    <div style={{ marginBottom: "5pt" }}>
                      <div style={{ fontSize: "7pt", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "1pt" }}>Skill Trajectory</div>
                      <p style={{ fontSize: "8pt", lineHeight: 1.5, color: "#334155" }}>{evo.subject_skill_trajectory}</p>
                    </div>
                  )}
                  {(strengths.length > 0 || weaknesses.length > 0) && (
                    <div className="pd-grid-2" style={{ marginBottom: "4pt" }}>
                      {strengths.length > 0 && (
                        <div>
                          <div style={{ fontSize: "7pt", fontWeight: 700, color: "#166534", textTransform: "uppercase", marginBottom: "2pt" }}>Strengths</div>
                          {strengths.slice(0, 4).map((s, j) => <div key={j} style={{ fontSize: "7.5pt", color: "#166534", padding: "1pt 0" }}>✓ {s}</div>)}
                        </div>
                      )}
                      {weaknesses.length > 0 && (
                        <div>
                          <div style={{ fontSize: "7pt", fontWeight: 700, color: "#92400E", textTransform: "uppercase", marginBottom: "2pt" }}>Areas to Improve</div>
                          {weaknesses.slice(0, 4).map((w, j) => <div key={j} style={{ fontSize: "7.5pt", color: "#92400E", padding: "1pt 0" }}>→ {w}</div>)}
                        </div>
                      )}
                    </div>
                  )}
                  {patterns.length > 0 && (
                    <div style={{ marginTop: "3pt" }}>
                      <div style={{ fontSize: "7pt", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "2pt" }}>Patterns Across Chapters</div>
                      {patterns.slice(0, 3).map((p: any, j: number) => (
                        <div key={j} style={{ fontSize: "7.5pt", color: "#334155", padding: "2pt 0", borderBottom: "0.5pt solid #CFFAFE" }}>
                          <strong style={{ color: "#0E7490" }}>{p.pattern_name}</strong>{p.summary ? ` — ${p.summary}` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                  {recommendations.length > 0 && (
                    <div style={{ marginTop: "3pt" }}>
                      <div style={{ fontSize: "7pt", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "2pt" }}>Recommendations</div>
                      {recommendations.slice(0, 3).map((r: any, j: number) => (
                        <div key={j} style={{ fontSize: "7.5pt", color: "#475569", padding: "1pt 0 1pt 8pt", borderLeft: "1pt solid #67E8F9" }}>
                          › {typeof r === "string" ? r : (r.action ?? r.text ?? JSON.stringify(r))}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Full subject analysis markdown */}
                  {evo.analysis_markdown && (
                    <div style={{ marginTop: "6pt", padding: "6pt 8pt", background: "white", border: "0.5pt solid #A5F3FC", borderRadius: "5pt" }}>
                      <div style={{ fontSize: "7pt", fontWeight: 700, color: "#0E7490", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3pt" }}>Full Analysis</div>
                      <div className="pd-prose" style={{ fontSize: "8.5pt" }}><ReactMarkdown>{evo.analysis_markdown}</ReactMarkdown></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═════════ SECTION 8: CHAPTER LEARNING EVOLUTION ═════════ */}
      {chapterEvolutions.length > 0 && (
        <div className="pd-card">
          <div className="pd-section-header" style={{ background: "#FFF7ED", borderBottom: "1pt solid #FDBA74" }}>
            <div style={{ width: "20pt", height: "20pt", borderRadius: "5pt", background: "#EA580C", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10pt", fontWeight: 700 }}>8</div>
            <div>
              <div className="pd-section-header-title" style={{ color: "#C2410C" }}>Chapter Learning Evolution</div>
              <div className="pd-section-header-sub" style={{ color: "#EA580C" }}>AI analysis of how learning progressed across sessions for each chapter</div>
            </div>
          </div>
          <div className="pd-card-body">
            {chapterEvolutions.map((evo) => {
              const cj = evo.analysis_json ?? {} as any;
              const dimensions: any[] = cj.dimension_analyses ?? cj.dimensions ?? [];
              const recommendations: any[] = cj.recommendations ?? [];
              const perConv: any[] = cj.per_conversation ?? [];
              return (
                <div key={`${evo.subject}-${evo.document_title}`} style={{ borderLeft: "3pt solid #EA580C", background: "#FFF7ED", padding: "8pt 10pt", borderRadius: "5pt", marginBottom: "6pt", breakInside: "avoid" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "3pt", gap: "8pt" }}>
                    <span style={{ fontSize: "10pt", fontWeight: 800, color: "#C2410C", flex: 1 }}>{evo.document_title}</span>
                    <div style={{ display: "flex", gap: "4pt", flexShrink: 0 }}>
                      <span className="pd-tag" style={{ background: "#FFEDD5", color: "#C2410C" }}>{evo.subject}</span>
                      <span className="pd-tag" style={{ background: "#FEF9C3", color: "#854D0E" }}>{evo.conversation_count} session{evo.conversation_count !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  {evo.headline && <div style={{ fontSize: "9pt", fontWeight: 600, fontStyle: "italic", color: "#9A3412", marginBottom: "4pt" }}>{evo.headline}</div>}
                  {evo.skill_score_trajectory && (
                    <div style={{ marginBottom: "5pt" }}>
                      <div style={{ fontSize: "7pt", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "1pt" }}>Skill Trajectory</div>
                      <p style={{ fontSize: "8pt", lineHeight: 1.5, color: "#334155" }}>{evo.skill_score_trajectory}</p>
                    </div>
                  )}
                  {/* Dimension bars */}
                  {dimensions.length > 0 && (
                    <div style={{ marginBottom: "5pt" }}>
                      <div style={{ fontSize: "7pt", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "2pt" }}>Skill Dimension Analysis</div>
                      {dimensions.map((dim: any, i: number) => {
                        const afterScore = typeof dim.after_score === "number" ? dim.after_score : (typeof dim.score === "number" ? dim.score : null);
                        const delta = typeof dim.delta === "number" ? dim.delta : 0;
                        const name = dim.dimension_name ?? dim.dimension ?? "";
                        return (
                          <div key={i} style={{ marginBottom: "3pt" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1pt" }}>
                              <span style={{ fontSize: "8pt", color: "#334155", fontWeight: 500, flex: 1 }}>{name}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: "3pt", flexShrink: 0 }}>
                                {afterScore != null && <span style={{ fontSize: "8pt", fontWeight: 800, color: masteryColor(afterScore) }}>{pct(afterScore)}</span>}
                                {delta !== 0 && (
                                  <span style={{ fontSize: "6.5pt", fontWeight: 800, padding: "1pt 4pt", borderRadius: "8pt", background: delta > 0 ? "#D1FAE5" : "#FEE2E2", color: delta > 0 ? "#065F46" : "#991B1B" }}>
                                    {delta > 0 ? "+" : ""}{Math.round(delta * 100)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {afterScore != null && (
                              <div className="pd-bar-track" style={{ height: "3pt" }}><div className="pd-bar-fill" style={{ width: `${Math.round(afterScore * 100)}%`, background: masteryColor(afterScore), height: "3pt" }} /></div>
                            )}
                            {(dim.key_observation || dim.summary) && <div style={{ fontSize: "7pt", color: "#64748b", marginTop: "1pt" }}>{dim.key_observation ?? dim.summary}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Per-conversation progress */}
                  {perConv.length > 0 && (
                    <div style={{ marginBottom: "5pt" }}>
                      <div style={{ fontSize: "7pt", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "2pt" }}>Session-by-Session Progress</div>
                      {perConv.map((c: any, i: number) => (
                        <div key={i} style={{ fontSize: "7.5pt", marginBottom: "3pt" }}>
                          <div style={{ fontWeight: 700, color: "#C2410C", marginBottom: "1pt" }}>Session {c.conversation_number}{c.stage_label ? ` — ${c.stage_label}` : ""}</div>
                          {(c.tutor_observations ?? []).slice(0, 3).map((obs: string, j: number) => (
                            <div key={j} style={{ color: "#475569", padding: "1pt 0 1pt 7pt", borderLeft: "1pt solid #FDBA74" }}>› {obs}</div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Recommendations */}
                  {recommendations.length > 0 && (
                    <div>
                      <div style={{ fontSize: "7pt", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "2pt" }}>Recommendations</div>
                      {recommendations.slice(0, 4).map((r: any, j: number) => (
                        <div key={j} style={{ fontSize: "7.5pt", color: "#475569", padding: "1pt 0 1pt 7pt", borderLeft: "1pt solid #FDBA74" }}>
                          › {typeof r === "string" ? r : (r.action ?? r.text ?? JSON.stringify(r))}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Full chapter analysis markdown */}
                  {evo.analysis_markdown && (
                    <div style={{ marginTop: "6pt", padding: "6pt 8pt", background: "white", border: "0.5pt solid #FDBA74", borderRadius: "5pt" }}>
                      <div style={{ fontSize: "7pt", fontWeight: 700, color: "#C2410C", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3pt" }}>Full Analysis</div>
                      <div className="pd-prose" style={{ fontSize: "8.5pt" }}><ReactMarkdown>{evo.analysis_markdown}</ReactMarkdown></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═════════ SECTION 9: AI CHAPTER REPORTS ═════════ */}
      {chapters.some((ch) => ch.chapter_report) && (
        <div className="pd-card">
          <div className="pd-section-header" style={{ background: "#EEF2FF", borderBottom: "1pt solid #C7D2FE" }}>
            <div style={{ width: "20pt", height: "20pt", borderRadius: "5pt", background: "#6366F1", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10pt", fontWeight: 700 }}>9</div>
            <div>
              <div className="pd-section-header-title" style={{ color: "#4338CA" }}>AI Chapter Reports</div>
              <div className="pd-section-header-sub" style={{ color: "#6366F1" }}>AI-generated pedagogical analysis per chapter</div>
            </div>
          </div>
          <div className="pd-card-body">
            {chapters.filter((ch) => ch.chapter_report).map((ch) => (
              <div key={`${ch.subject}-${ch.document_title}`} style={{ borderLeft: "3pt solid #6366F1", background: "#EEF2FF", padding: "8pt 10pt", borderRadius: "5pt", marginBottom: "6pt", breakInside: "avoid" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4pt", flexWrap: "wrap", gap: "5pt" }}>
                  <span style={{ fontSize: "10pt", fontWeight: 800, color: "#4338CA" }}>{ch.document_title}</span>
                  <div style={{ display: "flex", gap: "4pt", alignItems: "center" }}>
                    <span className="pd-tag" style={{ background: "#E0E7FF", color: "#4338CA" }}>{ch.subject}</span>
                    <span style={{ fontSize: "7.5pt", fontWeight: 700, padding: "1pt 5pt", borderRadius: "10pt", background: `${masteryColor(ch.mastery_score)}1A`, color: masteryColor(ch.mastery_score) }}>{pct(ch.mastery_score)}</span>
                    <span style={{ fontSize: "7pt", color: "#94A3B8" }}>{ch.study_count} sessions · {Math.round(ch.completion_percentage)}% complete</span>
                  </div>
                </div>
                <div style={{ marginTop: "4pt", padding: "6pt 8pt", background: "white", border: "0.5pt solid #C7D2FE", borderRadius: "5pt" }}>
                  <div className="pd-prose" style={{ fontSize: "8.5pt" }}><ReactMarkdown>{ch.chapter_report!}</ReactMarkdown></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DOCUMENT FOOTER ── */}
      <div style={{ marginTop: "12pt", padding: "8pt 12pt", background: "#F8FAFC", borderRadius: "7pt", border: "1pt solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "7.5pt", color: "#94A3B8" }}>GenEducation AI · All scores are AI-computed based on learning interactions</span>
        <span style={{ fontSize: "7.5pt", color: "#94A3B8" }}>{generatedAt}</span>
      </div>
    </div>{/* end print-doc */}
    </>
  );
}
