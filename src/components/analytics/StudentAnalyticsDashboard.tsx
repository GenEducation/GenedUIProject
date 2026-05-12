import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart2, ArrowLeft, CheckCircle2, 
  Target, GraduationCap, ChevronDown, LayoutGrid, Info
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { MetricCard } from "./MetricCard";
import { SkillMasteryView } from "./SkillMasteryView";
import { ChapterMasteryView } from "./ChapterMasteryView";
import { SkillProgression } from "./SkillProgression";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";

type TabType = "chapter" | "skill" | "progression";

interface StudentAnalyticsDashboardProps {
  mode?: "student" | "parent";
  studentId?: string;
}

const TAB_HEADINGS: Record<TabType, string> = {
  chapter: "Curriculum Mastery Overview",
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
    if (effectiveStudentId) {
      fetchAnalyticsData(undefined, effectiveStudentId);
    }
  }, [fetchAnalyticsData, effectiveStudentId]);

  // -- Progression tab: lazy-load on first visit, then reload on subject change --
  useEffect(() => {
    if (activeTab === "progression" && effectiveStudentId) {
      fetchSkillProgressionData(undefined, effectiveStudentId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedAnalyticsSubject, effectiveStudentId]);

  // -- Subject dropdown change --------------------------------------------------
  const handleSubjectChange = (newSubject: string) => {
    if (!effectiveStudentId) return;
    
    // Always reload core analytics
    fetchAnalyticsData(newSubject, effectiveStudentId);
    // Also reload progression if the tab is active
    if (activeTab === "progression") {
      fetchSkillProgressionData(newSubject, effectiveStudentId);
    }
  };

  const getSkillIndexConfig = () => {
    const grade = studentProfile?.grade ?? 5;
    const index = skillSummary?.skill_index ?? 0;
    
    // Prefer backend provided values, fallback to client-side logic
    let denominator = skillSummary?.skill_index_max;
    if (denominator === undefined) {
      if (grade >= 0 && grade <= 4) denominator = 2.00;
      else if (grade >= 5 && grade <= 8) denominator = 1.43;
      else if (grade >= 9 && grade <= 10) denominator = 1.14;
      else denominator = 1.00;
    }

    let status = skillSummary?.skill_index_status;
    let color = "#3B82F6"; // Blue

    if (!status) {
      if (index < 0.8) status = "Struggling";
      else if (index > 1.2) status = "Outperforming";
      else status = "At Grade Level";
    }

    // Assign color based on status (regardless of where status came from)
    if (status === "Struggling") color = "#EF4444";
    else if (status === "Outperforming") color = "#10B981";
    else color = "#3B82F6";

    // Progress percentage (0-100)
    let progress = skillSummary?.skill_index_progress;
    if (progress === undefined) {
      progress = (index / (denominator || 1)) * 100;
    }

    // Segments calculation
    const segments = [
      { color: "#EF4444", width: (0.8 / (denominator || 1)) * 100 },
      { color: "#3B82F6", width: (0.4 / (denominator || 1)) * 100 },
      { color: "#10B981", width: (Math.max(0, (denominator || 1) - 1.2) / (denominator || 1)) * 100 }
    ];

    return { denominator, status, color, progress, segments };
  };

  const skillConfig = getSkillIndexConfig();

  const metrics = [
    {
      label: "Overall Mastery Score",
      value: skillSummary ? `${Math.round(skillSummary.overall_score * 100)}%` : "0%",
      icon: <Target size={18} />,
      description: "Based on content coverage and session performance across all active subjects.",
      showProgress: true,
      progress: (skillSummary?.overall_score || 0) * 100,
      valueColor: "#10B981" // Always green for mastery progress
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
      description: "Your engagement is significantly contributing to your progress. Keep the momentum!",
      showProgress: false
    }
  ];

  return (
    <div className="h-screen overflow-y-auto bg-[#FBFBFA] flex flex-col font-sans">
      {/* -- TOP NAVIGATION (Student Only) ----------------------------------─ */}
      {mode === "student" && (
        <header className="px-8 py-6 flex items-center justify-between bg-white border-b border-[#1a3a2a]/5 sticky top-0 z-20">
          <img src="/Logo.svg" alt="GenEd Logo" className="h-8 w-auto" />
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-[#1a3a2a] leading-tight">
                {studentProfile?.username || "A. Sterling"}
              </p>
            </div>
            <button 
              onClick={() => window.location.href = '/student/profile'}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a3a2a] to-[#059669] border-2 border-white shadow-md hover:scale-105 transition-transform" 
            />
          </div>
        </header>
      )}

      {/* -- SUB-NAVIGATION CONTROLS ------------------------------------------ */}
      <div className={`px-8 py-4 flex items-center gap-8 bg-transparent border-b border-[#1a3a2a]/5 sticky ${mode === 'student' ? 'top-[89px]' : 'top-0'} z-10 backdrop-blur-sm bg-white/30`}>
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
              className="flex items-center gap-2 text-[#1a3a2a]/60 hover:text-[#1a3a2a] transition-all group lg:min-w-[80px]"
              data-tutorial="analytics-back-button"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-bold border-b-2 border-transparent group-hover:border-[#1a3a2a]/20">Back</span>
            </button>
            <div className="h-6 w-[1px] bg-[#1a3a2a]/10" />
            
            <div className="flex items-center gap-4 group cursor-pointer relative">
              <div className="w-11 h-11 rounded-2xl bg-[#E5F2E9] flex items-center justify-center text-[#1a3a2a] shadow-sm group-hover:scale-105 transition-transform">
                <LayoutGrid size={22} />
              </div>
              <div className="relative">
                <p className="text-[10px] font-black text-[#1a3a2a]/30 uppercase tracking-[0.25em] leading-none mb-1.5">Learning Subject</p>
                <div className="flex items-center gap-1 group">
                  <select 
                    value={selectedAnalyticsSubject}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="text-xl font-black text-[#1a3a2a] bg-transparent border-none focus:ring-0 cursor-pointer appearance-none p-0 pr-8 hover:text-[#059669] transition-colors"
                  >
                    {analyticsSubjects.length > 0 ? (
                      analyticsSubjects.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))
                    ) : (
                      <option value="">No Subjects Found</option>
                    )}
                  </select>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-[#1a3a2a]/30 group-hover:text-[#059669] transition-colors">
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
        <section className="space-y-4">
          
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
            <div className="bg-white/50 border border-[#1a3a2a]/5 rounded-3xl p-8 mt-6 space-y-6">
              <div className="flex items-center gap-3 text-[#1a3a2a]">
                <Info size={20} className="text-[#059669]" />
                <h4 className="text-lg font-bold">Understanding Your Skill Index</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-sm font-bold text-[#1a3a2a]/60 uppercase tracking-wider">Index Ranges by Grade</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-[#1a3a2a]/5">
                      <span className="text-sm font-semibold text-[#1a3a2a]">Grades 0 - 4</span>
                      <span className="text-sm font-black text-[#1a3a2a]">0.00 - 2.00</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-[#1a3a2a]/5">
                      <span className="text-sm font-semibold text-[#1a3a2a]">Grades 5 - 8</span>
                      <span className="text-sm font-black text-[#1a3a2a]">0.00 - 1.43</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-[#1a3a2a]/5">
                      <span className="text-sm font-semibold text-[#1a3a2a]">Grades 9 - 10</span>
                      <span className="text-sm font-black text-[#1a3a2a]">0.00 - 1.14</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-bold text-[#1a3a2a]/60 uppercase tracking-wider">Performance Indicators</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#EF4444]/10">
                      <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
                      <span className="text-sm font-semibold text-[#1a3a2a]">Below 0.80</span>
                      <span className="ml-auto text-xs font-bold text-[#EF4444] uppercase">Struggling</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#3B82F6]/10">
                      <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                      <span className="text-sm font-semibold text-[#1a3a2a]">0.80 - 1.20</span>
                      <span className="ml-auto text-xs font-bold text-[#3B82F6] uppercase">On Track</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#10B981]/10">
                      <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                      <span className="text-sm font-semibold text-[#1a3a2a]">Above 1.20</span>
                      <span className="ml-auto text-xs font-bold text-[#10B981] uppercase">Outperforming</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#1a3a2a]/50 italic">
                * The Skill Index is a dynamic metric that adapts to your grade level, providing a fair assessment of your academic standing relative to standardized benchmarks.
              </p>
            </div>
          </motion.div>

          <div className="flex justify-center">
            <button 
              onClick={() => setShowExplanation(!showExplanation)}
              className="flex items-center gap-2 text-xs font-bold text-[#1a3a2a]/40 hover:text-[#1a3a2a] transition-colors"
            >
              <Info size={14} />
              {showExplanation ? "Hide Skill Index Explanation" : "How is Skill Index calculated?"}
            </button>
          </div>
        </section>

        {/* Tab Switcher */}
        <section className="space-y-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-[#1a3a2a]">
                {TAB_HEADINGS[activeTab]}
              </h3>
              
              <div className="flex gap-2 p-1.5 bg-[#F4F3EE] rounded-2xl">
                <button 
                  data-tutorial="chapter-mastery-tab"
                  onClick={() => setActiveTab("chapter")}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === "chapter" 
                      ? "bg-white text-[#1a3a2a] shadow-sm" 
                      : "text-[#1a3a2a]/70 hover:text-[#1a3a2a]"
                  }`}
                >
                  Chapter Mastery
                </button>
                <button 
                  data-tutorial="skill-mastery-tab"
                  onClick={() => setActiveTab("skill")}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === "skill" 
                      ? "bg-white text-[#1a3a2a] shadow-sm" 
                      : "text-[#1a3a2a]/70 hover:text-[#1a3a2a]"
                  }`}
                >
                  Skill Mastery
                </button>
                <button
                  data-tutorial="skill-progression-tab"
                  onClick={() => setActiveTab("progression")}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === "progression"
                      ? "bg-white text-[#1a3a2a] shadow-sm"
                      : "text-[#1a3a2a]/70 hover:text-[#1a3a2a]"
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
