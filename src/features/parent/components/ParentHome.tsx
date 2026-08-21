"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Link as LinkIcon,
  Plus,
  ChevronRight,
  BarChart2,
  Calendar,
  Settings,
  LogOut,
  User,
  MessageSquare,
  Menu,
  X,
  LayoutGrid,
  ChevronDown,
  ScrollText,
  Bell,
} from "lucide-react";
import { useParentStore } from "../store/useParentStore";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import dynamic from "next/dynamic";
import { ParentChatExploration } from "./ParentChatExploration";
import { ParentProfileView } from "./ParentProfileView";
import { ParentScheduleView } from "./ParentScheduleView";
import { ParentMomentsView } from "./ParentMomentsView";
import { NotificationBell } from "@/components/NotificationBell";
import { Select } from "@/components/ui/Select";

// Lazy-loaded: both are large and only shown on specific tabs.
// StudentReportCard is ~160KB; StudentAnalyticsDashboard pulls in recharts.
const StudentAnalyticsDashboard = dynamic(
  () => import("@/components/analytics/StudentAnalyticsDashboard").then((m) => m.StudentAnalyticsDashboard),
  { ssr: false }
);
const StudentReportCard = dynamic(
  () => import("@/components/report-card/StudentReportCard").then((m) => m.StudentReportCard),
  { ssr: false }
);

export function ParentHome() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { 
    parentProfile, 
    linkedStudents, 
    selectedStudentId, 
    setSelectedStudentId,
    fetchLinkedStudents,
    isFetchingStudents,
    activeDashboardView,
    setDashboardView,
    logoutParent
  } = useParentStore();

  const {
    analyticsSubjects,
    selectedAnalyticsSubject,
    fetchAnalyticsData
  } = useAnalyticsStore();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkingError, setLinkingError] = useState<string | null>(null);
  const [linkingSuccess, setLinkingSuccess] = useState<string | null>(null);

  // Auto parent linking if search query parameters are present
  useEffect(() => {
    const token = searchParams.get("token");
    const studentId = searchParams.get("student_id");

    if (!token || !studentId || !parentProfile?.user_id) return;

    let cancelled = false;
    const controller = new AbortController();

    async function autoLink() {
      setIsLinking(true);
      setLinkingError(null);
      setLinkingSuccess(null);
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

        // 1. Verify token first
        const verifyResp = await fetch(
          `${API_BASE_URL}/parent/verify-token?student_id=${studentId}&token=${token}`,
          { signal: controller.signal }
        );
        if (!verifyResp.ok) {
          const errData = await verifyResp.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to verify parent token.");
        }
        const verifyData = await verifyResp.json();

        // 2. Confirm link
        const confirmResp = await fetch(`${API_BASE_URL}/parent/confirm-link`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("gened_auth_token")}`,
          },
          body: JSON.stringify({
            student_id: studentId,
            parent_id: parentProfile!.user_id,
            token: token,
          }),
          signal: controller.signal,
        });

        if (!confirmResp.ok) {
          const errData = await confirmResp.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to link account.");
        }

        if (!cancelled) {
          setLinkingSuccess(`Successfully linked with student "${verifyData.student_username}"!`);

          // Refresh students list in parent store
          await fetchLinkedStudents();

          // Clean URL params without page reload
          const newUrl = window.location.pathname;
          window.history.replaceState({}, "", newUrl);
        }
      } catch (err: any) {
        if (!cancelled && err?.name !== "AbortError") {
          setLinkingError(err.message || "Failed to establish parent-student link.");
        }
      } finally {
        if (!cancelled) setIsLinking(false);
      }
    }

    autoLink();
    return () => { cancelled = true; controller.abort(); };
  }, [searchParams, parentProfile, fetchLinkedStudents]);

  // Sync URL → state on mount / pathname change
  useEffect(() => {
    const parts = pathname.split('/').filter(Boolean); // e.g. ['parent','abc123','analytics']
    if (parts[1] === 'profile') {
      setDashboardView('profile');
      setSelectedStudentId(null);
    } else if (parts.length >= 3 && parts[2] === 'chat') {
      setSelectedStudentId(parts[1]);
      setDashboardView('chat');
    } else if (parts.length >= 3 && parts[2] === 'analytics') {
      setSelectedStudentId(parts[1]);
      setDashboardView('analytics');
    } else if (parts.length >= 3 && parts[2] === 'schedule') {
      setSelectedStudentId(parts[1]);
      setDashboardView('schedule');
    } else if (parts.length >= 3 && parts[2] === 'moments') {
      setSelectedStudentId(parts[1]);
      setDashboardView('moments');
    }
    // /parent alone: leave state as-is (store auto-selects first student)
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchLinkedStudents();
  }, [fetchLinkedStudents]);

  const selectedStudent = linkedStudents.find(s => s.student_id === selectedStudentId);

  return (
    <div className="portal-legacy-type flex h-screen bg-[#FBFBFA] overflow-hidden font-sans relative">
      {/* -- MOBILE SIDEBAR OVERLAY ------------------------------------------ */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-[#1a3a2a]/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* -- SIDEBAR ---------------------------------------------------------- */}
      <aside className={`
        fixed inset-y-0 left-0 w-80 bg-white border-r border-[#1a3a2a]/5 flex flex-col z-50 transition-transform duration-300
        lg:translate-x-0 lg:static lg:flex
        ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
      `}>
        <div className="p-8 pb-4 flex items-center justify-between">
          <img src="/Logo.svg" alt="GenEd Logo" className="h-8 w-auto" />
          <button aria-label="Close sidebar" 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 rounded-xl bg-[#F4F3EE] text-[#1a3a2a]"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8 pt-4 flex-1 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black text-[#1a3a2a]/30 uppercase tracking-[0.25em] mb-4">My Children</p>
              <div className="space-y-2">
                {linkedStudents
                  .filter(s => s.status === "APPROVED")
                  .map((student) => (
                    <button
                      key={student.student_id}
                      onClick={() => {
                        setSelectedStudentId(student.student_id);
                        router.push(`/parent/${student.student_id}/analytics`);
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${
                        selectedStudentId === student.student_id
                          ? "bg-[#1a3a2a] text-white shadow-lg"
                          : "bg-[#F4F3EE] text-[#1a3a2a] hover:bg-[#E5F2E9]"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        selectedStudentId === student.student_id ? "bg-white/20" : "bg-white"
                      }`}>
                        <User size={18} />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{student.name || `Student ID: ...${student.student_id.slice(-4)}`}</p>
                      </div>
                      {selectedStudentId === student.student_id && <ChevronRight size={14} />}
                    </button>
                  ))}
                
                {selectedStudent && (
                  <div className="pt-4 space-y-2 border-t border-[#1a3a2a]/5">
                    <button 
                      onClick={() => {
                        setDashboardView("analytics");
                        router.push(`/parent/${selectedStudentId}/analytics`);
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 group ${
                        activeDashboardView === "analytics"
                        ? "border-[#1a3a2a] bg-[#1a3a2a] text-white shadow-lg"
                        : "border-dashed border-[#1a3a2a]/10 text-[#1a3a2a]/40 hover:border-[#1a3a2a]/30 hover:text-[#1a3a2a]/60"
                      }`}
                    >
                      <BarChart2 size={18} className={activeDashboardView === "analytics" ? "" : "group-hover:scale-110 transition-transform"} />
                      <span className="text-sm font-bold">Insight Dashboard</span>
                    </button>

                    <button
                      onClick={() => {
                        setDashboardView("chat");
                        router.push(`/parent/${selectedStudentId}/chat`);
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 group ${
                        activeDashboardView === "chat"
                        ? "border-[#1a3a2a] bg-[#1a3a2a] text-white shadow-lg"
                        : "border-dashed border-[#1a3a2a]/10 text-[#1a3a2a]/40 hover:border-[#1a3a2a]/30 hover:text-[#1a3a2a]/60"
                      }`}
                    >
                      <MessageSquare size={18} className={activeDashboardView === "chat" ? "" : "group-hover:scale-110 transition-transform"} />
                      <span className="text-sm font-bold">View Chat explorations</span>
                    </button>

                    <button
                      onClick={() => {
                        setDashboardView("report");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 group ${
                        activeDashboardView === "report"
                        ? "border-[#1a3a2a] bg-[#1a3a2a] text-white shadow-lg"
                        : "border-dashed border-[#1a3a2a]/10 text-[#1a3a2a]/40 hover:border-[#1a3a2a]/30 hover:text-[#1a3a2a]/60"
                      }`}
                    >
                      <ScrollText size={18} className={activeDashboardView === "report" ? "" : "group-hover:scale-110 transition-transform"} />
                      <span className="text-sm font-bold">View Report Card</span>
                    </button>

                    <button
                      onClick={() => {
                        setDashboardView("schedule");
                        router.push(`/parent/${selectedStudentId}/schedule`);
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 group ${
                        activeDashboardView === "schedule"
                        ? "border-[#1a3a2a] bg-[#1a3a2a] text-white shadow-lg"
                        : "border-dashed border-[#1a3a2a]/10 text-[#1a3a2a]/40 hover:border-[#1a3a2a]/30 hover:text-[#1a3a2a]/60"
                      }`}
                    >
                      <Calendar size={18} className={activeDashboardView === "schedule" ? "" : "group-hover:scale-110 transition-transform"} />
                      <span className="text-sm font-bold">Learning Schedule</span>
                    </button>

                    <button
                      onClick={() => {
                        setDashboardView("moments");
                        router.push(`/parent/${selectedStudentId}/moments`);
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 group ${
                        activeDashboardView === "moments"
                        ? "border-[#1a3a2a] bg-[#1a3a2a] text-white shadow-lg"
                        : "border-dashed border-[#1a3a2a]/10 text-[#1a3a2a]/40 hover:border-[#1a3a2a]/30 hover:text-[#1a3a2a]/60"
                      }`}
                    >
                      <Bell size={18} className={activeDashboardView === "moments" ? "" : "group-hover:scale-110 transition-transform"} />
                      <span className="text-sm font-bold">Smart Alarms</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-[#1a3a2a]/5 space-y-2 mt-auto">
          <button 
            onClick={() => logoutParent()}
            className="w-full p-3 rounded-xl flex items-center gap-3 text-red-500 hover:bg-red-50 transition-all font-bold text-sm"
          >
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* -- MAIN CONTENT ----------------------------------------------------─ */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Global Parent Header */}
        <header className="px-6 lg:px-10 py-6 bg-white border-b border-[#1a3a2a]/5 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <button aria-label="Open sidebar" 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-3 rounded-2xl bg-[#F4F3EE] text-[#1a3a2a] hover:bg-[#E5F2E9] transition-all"
            >
              <Menu size={20} />
            </button>
            
            {/* Left Section: Context Indicator (Subject or Explorations) */}
            {selectedStudentId && activeDashboardView === "analytics" && (
              <div className="flex items-center gap-4 group cursor-pointer relative">
                <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-2xl bg-[#E5F2E9] flex items-center justify-center text-[#1a3a2a] shadow-sm group-hover:scale-105 transition-transform">
                  <LayoutGrid size={20} />
                </div>
                <div className="relative">
                  <p className="text-[8px] lg:text-[10px] font-black text-[#1a3a2a]/30 uppercase tracking-[0.25em] leading-none mb-1.5">Learning Subject</p>
                  <div className="flex items-center gap-1 group">
                    <Select
                      variant="inline"
                      aria-label="Analytics subject"
                      panelWidth={200}
                      value={selectedAnalyticsSubject}
                      onChange={(v) => fetchAnalyticsData(v, selectedStudentId!)}
                      options={analyticsSubjects.map((sub) => ({ value: sub, label: sub }))}
                      buttonClassName="text-sm lg:text-xl"
                      buttonStyle={{
                        padding: 0,
                        fontWeight: 900,
                        fontSize: "inherit",
                        color: "var(--primary-ink)",
                      }}
                    />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-[#1a3a2a]/30 group-hover:text-[#059669] transition-colors">
                      <ChevronDown size={16} strokeWidth={3} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedStudentId && activeDashboardView === "chat" && (
              <div className="flex items-center gap-4 group cursor-default relative">
                <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-2xl bg-[#F4F3EE] flex items-center justify-center text-[#1a3a2a] shadow-sm">
                  <MessageSquare size={20} />
                </div>
                <div className="relative">
                  <p className="text-[8px] lg:text-[10px] font-black text-[#1a3a2a]/30 uppercase tracking-[0.25em] leading-none mb-1.5">Active monitoring</p>
                  <h2 className="text-sm lg:text-xl font-black text-[#1a3a2a] leading-tight flex items-center gap-2">
                    Learning Explorations
                  </h2>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <NotificationBell userId={parentProfile?.user_id || ""} align="right" />
            <div className="h-8 w-[1px] bg-[#1a3a2a]/10 mx-1 hidden sm:block" />
            
            {/* Right Section: Parent Profile Info */}
            <button 
              onClick={() => {
                setSelectedStudentId(null);
                setDashboardView("profile");
                router.push('/parent/profile');
                if (window.innerWidth < 1024) setIsSidebarOpen(false);
              }}
              className="flex items-center gap-3 group"
            >
              <div className="text-right hidden sm:block">
                <h2 className={`text-sm lg:text-base font-black leading-tight transition-colors ${activeDashboardView === 'profile' ? 'text-[#059669]' : 'text-[#1a3a2a] group-hover:text-[#059669]'}`}>{parentProfile?.username || "Parent Account"}</h2>
                <p className="text-[8px] lg:text-[10px] font-black text-[#1a3a2a]/30 uppercase tracking-[0.2em]">Academic Overseer</p>
              </div>
              <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center text-white shadow-md border-2 transition-all ${activeDashboardView === 'profile' ? 'bg-[#059669] border-[#059669] scale-105 shadow-[#059669]/20' : 'bg-gradient-to-br from-[#1a3a2a] to-[#059669] border-white group-hover:scale-105'}`}>
                <User size={20} />
              </div>
            </button>
          </div>
        </header>

        {/* Auto-linking status banner */}
        {isLinking && (
          <div className="bg-[#eff6ff] border-b border-blue-100 px-8 py-3.5 text-xs font-bold text-blue-700 flex items-center gap-2.5 animate-pulse">
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
            Verifying and establishing link with your child...
          </div>
        )}
        {linkingSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-100 px-8 py-3.5 text-xs font-bold text-emerald-700 flex items-center justify-between">
            <span>🎉 {linkingSuccess}</span>
            <button onClick={() => setLinkingSuccess(null)} className="hover:text-emerald-950 font-black px-2 py-1">Dismiss</button>
          </div>
        )}
        {linkingError && (
          <div className="bg-rose-50 border-b border-rose-100 px-8 py-3.5 text-xs font-bold text-rose-700 flex items-center justify-between">
            <span>⚠️ {linkingError}</span>
            <button onClick={() => setLinkingError(null)} className="hover:text-rose-950 font-black px-2 py-1">Dismiss</button>
          </div>
        )}

        {isFetchingStudents ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-[#1a3a2a]/10 border-t-[#1a3a2a] rounded-full animate-spin" />
              <p className="text-sm font-bold text-[#1a3a2a]/40 tracking-widest uppercase">Fetching Insights...</p>
            </div>
          </div>
        ) : activeDashboardView === "profile" ? (
          <ParentProfileView profile={parentProfile} />
        ) : selectedStudent ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedStudentId}-${activeDashboardView}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 h-full flex flex-col"
            >
              {activeDashboardView === "analytics" ? (
                <div className="flex-1 overflow-hidden">
                  <StudentAnalyticsDashboard
                    mode="parent"
                    studentId={selectedStudentId!}
                  />
                </div>
              ) : activeDashboardView === "report" ? (
                <div className="flex-1 overflow-y-auto">
                  <StudentReportCard
                    parentId={parentProfile?.user_id}
                    childId={selectedStudentId!}
                    childName={selectedStudent?.name || undefined}
                  />
                </div>
              ) : activeDashboardView === "schedule" ? (
                <ParentScheduleView
                  studentId={selectedStudentId!}
                  parentId={parentProfile!.user_id}
                  studentName={selectedStudent?.name}
                />
              ) : activeDashboardView === "moments" ? (
                <ParentMomentsView
                  studentId={selectedStudentId!}
                  studentName={selectedStudent?.name}
                />
              ) : (
                <ParentChatExploration />
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#F4F3EE]/30">
            <div className="w-24 h-24 rounded-[40px] bg-white shadow-xl flex items-center justify-center text-[#1a3a2a]/10 mb-8">
              <Users size={40} />
            </div>
            <h2 className="text-3xl font-black text-[#1a3a2a] mb-4">Welcome to Your Knowledge Insight</h2>
            <p className="max-w-md text-[#1a3a2a]/40 text-sm font-medium leading-relaxed">
              Link a student to view their detailed learning analytics, subject mastery, and cognitive skill development.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
