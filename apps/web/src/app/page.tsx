"use client";

import { useState, useEffect } from "react";
import { CouncilRow } from "@/features/student/components/CouncilRow";
import { SocraticChat } from "@/features/student/components/SocraticChat";
import { StudentDashboard } from "@/features/student/components/StudentDashboard";
import { SkillMatrix } from "@/features/student/components/SkillMatrix";
import { ScholarlyCalendar } from "@/features/student/components/ScholarlyCalendar";
import { useAgentStore } from "@/store/useAgent";
import { motion, AnimatePresence } from "framer-motion";
import { PartnerAdmin } from "@/features/partner/components/PartnerAdmin";
import { ShowcaseDirector } from "@/components/ShowcaseDirector";
import {
  LayoutDashboard,
  Users,
  Eye,
  Building2,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { LoginView } from "@/features/auth/components/LoginView";
import { ConceptHeatmap } from "@/features/parent/components/ConceptHeatmap";

export default function HomePage() {
  const { activeAgent, masteryLevel, student, fetchStudent, fetchAgents } =
    useAgentStore();
  const [view, setView] = useState<
    "council" | "dashboard" | "parent" | "partner"
  >("council");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<
    "student" | "parent" | "partner" | null
  >(null);

  const handleLogin = (role: "student" | "parent" | "partner") => {
    setUserRole(role);
    setIsLoggedIn(true);
    fetchStudent("student_123");
    fetchAgents();

    // Initial redirect based on role
    if (role === "student") setView("dashboard");
    else if (role === "parent") setView("parent");
    else if (role === "partner") setView("partner");
  };

  if (!isLoggedIn) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <main className="h-screen bg-white text-navy font-sans flex flex-col overflow-hidden">
      {/* Partner view is full-bleed — rendered outside the padded wrapper */}
      {view === "partner" ? (
        <PartnerAdmin />
      ) : (
        <div className="max-w-7xl mx-auto p-8 space-y-12 w-full h-full overflow-y-auto">
          <AnimatePresence mode="wait">
            {view === "dashboard" ? (
              <motion.div
                key="view-dashboard"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8"
              >
                <StudentDashboard />
              </motion.div>
            ) : view === "parent" ? (
              <motion.div
                key="view-parent"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-12"
              >
                <header className="space-y-2">
                  <h2 className="text-4xl font-bold tracking-tight">
                    Parent Knowledge Insights
                  </h2>
                  <p className="text-navy/40">
                    Observing the conceptual journey of{" "}
                    {student?.name || "Scholar"}.
                  </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <ConceptHeatmap />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-8 bg-academic-grey border border-navy/5 rounded-3xl space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-navy uppercase text-[10px] tracking-widest leading-none">
                            Cognitive Effort
                          </h4>
                          <TrendingUp size={16} className="text-emerald" />
                        </div>
                        <p className="text-4xl font-bold text-navy">92%</p>
                        <p className="text-xs text-navy/40 leading-relaxed italic">
                          "Arjun is showing high resilience in{" "}
                          {activeAgent?.name || "Mathematics"}."
                        </p>
                      </div>
                      <div className="p-8 bg-navy text-white rounded-3xl space-y-4 shadow-xl shadow-navy/20">
                        <div className="flex justify-between items-center font-bold uppercase text-[10px] tracking-widest opacity-40">
                          <span>Weekly Breakthroughs</span>
                          <ShieldCheck size={16} className="text-emerald" />
                        </div>
                        <p className="text-4xl font-bold">4</p>
                        <button className="text-[10px] font-bold underline decoration-emerald decoration-2 text-emerald">
                          View Achievement Logs
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <ScholarlyCalendar />
                    <div className="p-8 bg-white border border-navy/5 rounded-3xl shadow-sm text-center space-y-6">
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-navy/40 uppercase tracking-[0.2em]">
                          Parent Council Call
                        </p>
                        <p className="text-lg font-bold">Friday, 4 PM</p>
                      </div>
                      <button className="w-full py-4 bg-navy text-white text-xs font-bold rounded-2xl hover:bg-emerald transition-all shadow-lg shadow-navy/10">
                        Schedule Sync
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="view-council"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <StudentDashboard />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </main>
  );
}
