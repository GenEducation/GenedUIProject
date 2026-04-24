import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart2, ArrowLeft, CheckCircle2, 
  Target, GraduationCap, ChevronDown, LayoutGrid 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { MetricCard } from "./MetricCard";
import { SkillMasteryView } from "./SkillMasteryView";
import { ChapterMasteryView } from "./ChapterMasteryView";

interface StudentAnalyticsDashboardProps {
  mode?: "student" | "parent";
  studentId?: string;
}

export const StudentAnalyticsDashboard: React.FC<StudentAnalyticsDashboardProps> = ({ 
  mode = "student", 
  studentId 
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"skill" | "chapter">("chapter");
  const { studentProfile } = useStudentStore();
  const { 
    analyticsSubjects, 
    selectedAnalyticsSubject,
    skillSummary,
    fetchAnalyticsData,
    isAnalyticsLoading
  } = useAnalyticsStore();

  React.useEffect(() => {
    fetchAnalyticsData(undefined, studentId);
  }, [fetchAnalyticsData, studentId]);

  const metrics = [
    {
      label: "Overall Mastery Score",
      value: skillSummary ? `${Math.round(skillSummary.overall_score * 100)}%` : "0%",
      icon: <Target size={18} />,
      description: "Based on content coverage and session performance across all active subjects."
    },
    {
      label: "Skill Index",
      value: skillSummary ? skillSummary.skill_index.toFixed(2) : "0.00",
      subValue: "/ 1.00",
      icon: <GraduationCap size={18} />,
      description: "Calculated across 8 foundational cognitive skills identified in your learning sessions."
    },
    {
      label: "Completed Sessions",
      value: skillSummary?.session_count || 0,
      subValue: "this month",
      icon: <CheckCircle2 size={18} />,
      description: "Your engagement is significantly contributing to your progress. Keep the momentum!"
    }
  ];

  return (
    <div className="h-screen overflow-y-auto bg-[#FBFBFA] flex flex-col font-sans">
      {/* ── TOP NAVIGATION (Student Only) ─────────────────────────────────── */}
      {mode === "student" && (
        <header className="px-8 py-6 flex items-center justify-between bg-white border-b border-[#1a3a2a]/5 sticky top-0 z-20">
          <img src="/Logo.svg" alt="GenEd Logo" className="h-8 w-auto" />
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-[#1a3a2a] leading-tight">
                {studentProfile?.username || "A. Sterling"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a3a2a] to-[#059669] border-2 border-white shadow-md" />
          </div>
        </header>
      )}

      {/* ── SUB-NAVIGATION CONTROLS ────────────────────────────────────────── */}
      <div className={`px-8 py-4 flex items-center gap-8 bg-transparent border-b border-[#1a3a2a]/5 sticky ${mode === 'student' ? 'top-[89px]' : 'top-0'} z-10 backdrop-blur-sm bg-white/30`}>
        {mode === "student" && (
          <>
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 text-[#1a3a2a]/60 hover:text-[#1a3a2a] transition-all group lg:min-w-[80px]"
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
                    onChange={(e) => fetchAnalyticsData(e.target.value, studentId)}
                    className="text-xl font-black text-[#1a3a2a] bg-transparent border-none focus:ring-0 cursor-pointer appearance-none p-0 pr-8 hover:text-[#059669] transition-colors"
                  >
                    {analyticsSubjects.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
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

      {/* ── DASHBOARD CONTENT ──────────────────────────────────────────────── */}
      <main className="flex-1 px-8 py-10 max-w-7xl mx-auto w-full space-y-12 pb-20">
        <section className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {metrics.map((metric, idx) => (
              <MetricCard key={idx} {...metric} />
            ))}
          </div>
        </section>

        {/* Tab Switcher */}
        <section className="space-y-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-[#1a3a2a]">
                {activeTab === "chapter" ? "Curriculum Mastery Overview" : "Skill Proficiency Mapping"}
              </h3>
              
              <div className="flex gap-2 p-1.5 bg-[#F4F3EE] rounded-2xl">
                <button 
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
                  onClick={() => setActiveTab("skill")}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === "skill" 
                      ? "bg-white text-[#1a3a2a] shadow-sm" 
                      : "text-[#1a3a2a]/70 hover:text-[#1a3a2a]"
                  }`}
                >
                  Skill Mastery
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
                {activeTab === "skill" ? <SkillMasteryView /> : <ChapterMasteryView mode={mode} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
};
