"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2, ArrowLeft, CheckCircle2,
  Target, GraduationCap, ChevronDown, LayoutGrid, Info
} from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { MetricCard } from "./MetricCard";
import { ChapterMasteryView } from "./ChapterMasteryView";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";
import { Select } from "@/components/ui/Select";
import { GenEdLogo } from "@/components/shared/GenEdLogo";

// Lazy-loaded: these are the recharts-backed views. Deferring them keeps
// recharts out of the dashboard's initial bundle.
const SkillMasteryView = dynamic(
  () => import("./SkillMasteryView").then((m) => m.SkillMasteryView),
  { ssr: false }
);
const SkillProgression = dynamic(
  () => import("./SkillProgression").then((m) => m.SkillProgression),
  { ssr: false }
);

type TabType = "chapter" | "skill" | "progression";

interface StudentAnalyticsDashboardProps {
  mode?: "student" | "parent";
  studentId?: string;
}

const TAB_HEADINGS: Record<TabType, string> = {
  chapter: "Curriculum Progress Overview",
  skill: "Skill Proficiency Mapping",
  progression: "Skill Progression Over Time",
};

export const StudentAnalyticsDashboard: React.FC<StudentAnalyticsDashboardProps> = ({ 
  mode = "student", 
  studentId: propStudentId 
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("chapter");
  const [showExplanation, setShowExplanation] = useState(false);
  const { studentProfile } = useStudentStore();
  const { 
    analyticsSubjects, 
    selectedAnalyticsSubject,
    skillSummary,
    fetchAnalyticsData,
    fetchSkillProgressionData,
    isAnalyticsLoading,
    skillProgression,
  } = useAnalyticsStore();

  const { isActive, nextStep, completeAction, getCurrentStep } = useTutorialStore();

  // Use prop ID if available (parent mode), otherwise fallback to logged-in student's ID
  const effectiveStudentId = propStudentId || studentProfile?.user_id;

  // -- Initial data load -------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    if (effectiveStudentId && !cancelled) {
      fetchAnalyticsData(undefined, effectiveStudentId);
    }
    return () => { cancelled = true; };
  }, [fetchAnalyticsData, effectiveStudentId]);

  // -- Progression tab: lazy-load on first visit, then reload on subject change --
  useEffect(() => {
    let cancelled = false;
    if (activeTab === "progression" && effectiveStudentId && !cancelled) {
      fetchSkillProgressionData(undefined, effectiveStudentId);
    }
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedAnalyticsSubject, effectiveStudentId]);

  // -- Subject dropdown change --------------------------------------------------
  const handleSubjectChange = (newSubject: string) => {
    if (!effectiveStudentId) return;
    const exactSubject = analyticsSubjects.find((subject) => subject === newSubject);
    if (!exactSubject) return;
    
    // Always reload core analytics
    fetchAnalyticsData(exactSubject, effectiveStudentId);
    // Also reload progression if the tab is active
    if (activeTab === "progression") {
      fetchSkillProgressionData(exactSubject, effectiveStudentId);
    }
  };

  const getSkillIndexConfig = () => {
    const grade = studentProfile?.grade;
    const index = skillSummary?.skill_index ?? 0;
    const hasData = skillSummary !== null && skillSummary !== undefined;

    // Prefer backend provided values, fallback to client-side logic
    let denominator = skillSummary?.skill_index_max;
    if (denominator === undefined && grade !== undefined) {
      if (grade >= 0 && grade <= 4) denominator = 2.00;
      else if (grade >= 5 && grade <= 8) denominator = 1.43;
      else if (grade >= 9 && grade <= 10) denominator = 1.14;
      else denominator = 1.00;
    }
    denominator ??= 1.00;

    let status = skillSummary?.skill_index_status;
    let color = "#3B82F6"; // Blue

    const sessionCount = skillSummary?.session_count ?? 0;
    // Don't show Struggling to students who haven't started yet
    if (!hasData || (sessionCount === 0 && index === 0)) {
      status = "Not Started";
      color = "#8FA1A3"; // Gray
    } else if (!status) {
      if (index < 0.8) status = "Struggling";
      else if (index > 1.2) status = "Outperforming";
      else status = "At Grade Level";
    }

    // Assign color based on status (regardless of where status came from)
    if (status === "Not Started") color = "#8FA1A3";
    else if (status === "Struggling") color = "#EF4444";
    else if (status === "Outperforming") color = "#075E63";
    else color = "#3B82F6";

    // Progress percentage (0-100)
    let progress = skillSummary?.skill_index_progress;
    if (progress === undefined) {
      progress = (index / (denominator || 1)) * 100;
    }

    // Segments calculation
    const redMax = Math.min(0.8, denominator || 1);
    const blueMax = Math.max(0, Math.min(1.2, denominator || 1) - 0.8);
    const greenMax = Math.max(0, (denominator || 1) - 1.2);

    const segments = [
      { color: "#EF4444", width: (redMax / (denominator || 1)) * 100 },
      { color: "#3B82F6", width: (blueMax / (denominator || 1)) * 100 },
      { color: "#075E63", width: (greenMax / (denominator || 1)) * 100 }
    ];

    return { denominator, status, color, progress, segments };
  };

  const skillConfig = getSkillIndexConfig();

  const metrics = [
    {
      label: "Overall Mastery Score",
      value: skillSummary?.overall_score != null ? `${Math.round(skillSummary.overall_score * 100)}%` : "0%",
      icon: <Target size={18} />,
      description: "Based on content coverage and session performance across all active subjects.",
      showProgress: true,
      progress: (skillSummary?.overall_score || 0) * 100,
      valueColor: "#075E63" // Always green for mastery progress
    },
    {
      label: "Skill Index",
      value: (skillSummary?.skill_index !== undefined && skillSummary?.skill_index !== null) 
        ? skillSummary.skill_index.toFixed(2) 
        : "0.00",
      icon: <GraduationCap size={18} />,
      description: "A composite score reflecting your cognitive agility and mastery relative to grade standards.",
      valueColor: skillConfig.color,
      status: skillConfig.status,
      showProgress: true,
      progress: skillConfig.progress,
      isSegmented: true,
      segments: skillConfig.segments
    },
    {
      label: "Completed Sessions",
      value: skillSummary?.session_count || 0,
      subValue: "this month",
      icon: <CheckCircle2 size={18} />,
      description: (skillSummary?.session_count ?? 0) > 0
        ? "Your engagement is significantly contributing to your progress. Keep the momentum!"
        : "Complete your first learning session to start tracking your progress here.",
      showProgress: false
    }
  ];

  return (
    <div className="h-screen overflow-y-auto bg-[#FBFBF8] flex flex-col font-sans">
      {/* -- TOP NAVIGATION (Student Only) ----------------------------------─ */}
      {mode === "student" && (
        <header className="px-8 py-6 flex items-center justify-between bg-white border-b border-[#122D30]/5 sticky top-0 z-20">
          <GenEdLogo height={40} />
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-[#122D30] leading-tight">
                {studentProfile?.username || "A. Sterling"}
              </p>
            </div>
            <button 
              onClick={() => window.location.href = '/student/profile'}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#075E63] to-[#075E63] border-2 border-white shadow-md hover:scale-105 transition-transform" 
            />
          </div>
        </header>
      )}

      {/* -- SUB-NAVIGATION CONTROLS ------------------------------------------ */}
      <div className={`px-8 py-4 flex items-center gap-8 bg-transparent border-b border-[#122D30]/5 sticky ${mode === 'student' ? 'top-[89px]' : 'top-0'} z-10 backdrop-blur-sm bg-white/30`}>
        {mode === "student" && (
          <>
            <button 
              onClick={() => {
                const currentStep = getCurrentStep();
                if (isActive && currentStep?.id === "go-to-chat") {
                  completeAction("navigate");
                  nextStep();
                }
                window.location.href = '/student';
              }}
              className="flex items-center gap-2 text-[#122D30]/60 hover:text-[#122D30] transition-all group lg:min-w-[80px]"
              data-tutorial="analytics-back-button"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-bold border-b-2 border-transparent group-hover:border-[#122D30]/20">Back</span>
            </button>
            <div className="h-6 w-[1px] bg-[#075E63]/10" />
            
            <div className="flex items-center gap-4 group cursor-pointer relative">
              <div className="w-11 h-11 rounded-2xl bg-[#E8F2EF] flex items-center justify-center text-[#122D30] shadow-sm group-hover:scale-105 transition-transform">
                <LayoutGrid size={22} />
              </div>
              <div className="relative">
                <p className="text-[10px] font-black text-[#122D30]/30 uppercase tracking-[0.25em] leading-none mb-1.5">Learning Subject</p>
                <div className="flex items-center gap-1 group">
                  <Select
                    variant="inline"
                    aria-label="Analytics subject"
                    panelWidth={220}
                    placeholder="No Subjects Found"
                    value={selectedAnalyticsSubject}
                    onChange={handleSubjectChange}
                    options={analyticsSubjects.map((sub) => ({ value: sub, label: sub }))}
                    buttonClassName="text-xl"
                    buttonStyle={{
                      padding: 0,
                      fontWeight: 900,
                      fontSize: "inherit",
                      color: "var(--primary-ink)",
                    }}
                  />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-[#122D30]/30 group-hover:text-[#075E63] transition-colors">
                    <ChevronDown size={18} strokeWidth={3} />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* -- DASHBOARD CONTENT ------------------------------------------------ */}
      <main className="flex-1 px-8 py-10 max-w-7xl mx-auto w-full space-y-12 pb-20">
        {/* Empty state for students with no graded work yet */}
        {analyticsSubjects.length === 0 && !isAnalyticsLoading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-6 text-center">
            <div className="w-20 h-20 rounded-full bg-[#E8F2EF] flex items-center justify-center text-[#075E63]">
              <BarChart2 size={36} />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-bold text-[#122D30]">No data yet</h3>
              <p className="text-sm text-[#122D30]/50 leading-relaxed">
                {mode === "parent"
                  ? "This student hasn't finished their onboarding test yet. Once they do, progress data will appear here."
                  : "Finish your onboarding test to start tracking your progress here."}
              </p>
            </div>
            {mode !== "parent" && (
              <a
                href="/student"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#075E63] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#075E63]/20 hover:bg-[#048055] transition-colors"
              >
                Go to my dashboard
              </a>
            )}
          </div>
        )}
        <section className="space-y-4" style={{ display: analyticsSubjects.length === 0 && !isAnalyticsLoading ? "none" : undefined }}>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {metrics.map((metric, idx) => (
              <MetricCard key={idx} {...metric} />
            ))}
          </div>

          <motion.div 
            initial={false}
            animate={{ height: showExplanation ? "auto" : 0, opacity: showExplanation ? 1 : 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white/50 border border-[#122D30]/5 rounded-3xl p-8 mt-6 space-y-6">
              <div className="flex items-center gap-3 text-[#122D30]">
                <Info size={20} className="text-[#075E63]" />
                <h4 className="text-lg font-bold">Understanding Your Skill Index</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-sm font-bold text-[#122D30]/60 uppercase tracking-wider">Index Ranges by Grade</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-[#122D30]/5">
                      <span className="text-sm font-semibold text-[#122D30]">Grades 0 - 4</span>
                      <span className="text-sm font-black text-[#122D30]">0.00 - 2.00</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-[#122D30]/5">
                      <span className="text-sm font-semibold text-[#122D30]">Grades 5 - 8</span>
                      <span className="text-sm font-black text-[#122D30]">0.00 - 1.43</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-[#122D30]/5">
                      <span className="text-sm font-semibold text-[#122D30]">Grades 9 - 10</span>
                      <span className="text-sm font-black text-[#122D30]">0.00 - 1.14</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-bold text-[#122D30]/60 uppercase tracking-wider">Performance Indicators</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#EF4444]/10">
                      <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
                      <span className="text-sm font-semibold text-[#122D30]">Below 0.80</span>
                      <span className="ml-auto text-xs font-bold text-[#EF4444] uppercase">Struggling</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#3B82F6]/10">
                      <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                      <span className="text-sm font-semibold text-[#122D30]">0.80 - 1.20</span>
                      <span className="ml-auto text-xs font-bold text-[#3B82F6] uppercase">On Track</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#075E63]/10">
                      <div className="w-2 h-2 rounded-full bg-[#075E63]" />
                      <span className="text-sm font-semibold text-[#122D30]">Above 1.20</span>
                      <span className="ml-auto text-xs font-bold text-[#075E63] uppercase">Outperforming</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#122D30]/50 italic">
                * The Skill Index is a dynamic metric that adapts to your grade level, providing a fair assessment of your academic standing relative to standardized benchmarks.
              </p>
            </div>
          </motion.div>

          <div className="flex justify-center">
            <button 
              onClick={() => setShowExplanation(!showExplanation)}
              className="flex items-center gap-2 text-xs font-bold text-[#122D30]/40 hover:text-[#122D30] transition-colors"
            >
              <Info size={14} />
              {showExplanation ? "Hide Skill Index Explanation" : "How is Skill Index calculated?"}
            </button>
          </div>
        </section>

        {/* Tab Switcher */}
        <section className="space-y-8" style={{ display: analyticsSubjects.length === 0 && !isAnalyticsLoading ? "none" : undefined }}>
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-[#122D30]">
                {TAB_HEADINGS[activeTab]}
              </h3>
              
              <div className="flex gap-2 p-1.5 bg-[#F6F7F2] rounded-2xl">
                <button 
                  data-tutorial="chapter-mastery-tab"
                  onClick={() => setActiveTab("chapter")}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === "chapter" 
                      ? "bg-white text-[#122D30] shadow-sm" 
                      : "text-[#122D30]/70 hover:text-[#122D30]"
                  }`}
                >
                  Chapter Mastery
                </button>
                <button 
                  data-tutorial="skill-mastery-tab"
                  onClick={() => setActiveTab("skill")}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === "skill" 
                      ? "bg-white text-[#122D30] shadow-sm" 
                      : "text-[#122D30]/70 hover:text-[#122D30]"
                  }`}
                >
                  Skill Mastery
                </button>
                <button
                  data-tutorial="skill-progression-tab"
                  onClick={() => setActiveTab("progression")}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === "progression"
                      ? "bg-white text-[#122D30] shadow-sm"
                      : "text-[#122D30]/70 hover:text-[#122D30]"
                  }`}
                >
                  Skill Progression
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === "skill" ? (
                  <SkillMasteryView />
                ) : activeTab === "progression" ? (
                  <SkillProgression />
                ) : (
                  <ChapterMasteryView mode={mode} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
};
