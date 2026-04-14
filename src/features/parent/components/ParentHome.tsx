"use client";

import React, { useEffect, useState } from "react";
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
  MessageSquare
} from "lucide-react";
import { useParentStore } from "../store/useParentStore";
import { StudentAnalyticsDashboard } from "@/components/analytics/StudentAnalyticsDashboard";
import { ParentChatExploration } from "./ParentChatExploration";
import { ParentRequestBell } from "./ParentRequestBell";

export function ParentHome() {
  const { 
    parentProfile, 
    linkedStudents, 
    selectedStudentId, 
    setSelectedStudentId,
    fetchLinkedStudents,
    isFetchingStudents,
    activeDashboardView,
    setDashboardView
  } = useParentStore();

  useEffect(() => {
    fetchLinkedStudents();
  }, [fetchLinkedStudents]);

  const selectedStudent = linkedStudents.find(s => s.student_id === selectedStudentId);

  return (
    <div className="flex h-screen bg-[#FBFBFA] overflow-hidden font-sans">
      {/* ── SIDEBAR ────────────────────────────────────────────────────────── */}
      <aside className="w-80 bg-white border-r border-[#1a3a2a]/5 flex flex-col z-30">
        <div className="p-8 pb-4">
          <img src="/Logo.svg" alt="GenEd Logo" className="h-8 w-auto mb-10" />
          
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black text-[#1a3a2a]/30 uppercase tracking-[0.25em] mb-4">My Children</p>
              <div className="space-y-2">
                {linkedStudents
                  .filter(s => s.status === "APPROVED")
                  .map((student) => (
                    <button
                      key={student.student_id}
                      onClick={() => setSelectedStudentId(student.student_id)}
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
                        <p className="text-sm font-bold truncate">{student.username || `Student ID: ...${student.student_id.slice(-4)}`}</p>
                      </div>
                      {selectedStudentId === student.student_id && <ChevronRight size={14} />}
                    </button>
                  ))}
                
                {selectedStudent && (
                  <div className="pt-4 space-y-2 border-t border-[#1a3a2a]/5">
                    <button 
                      onClick={() => setDashboardView("analytics")}
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
                      onClick={() => setDashboardView("chat")}
                      className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 group ${
                        activeDashboardView === "chat"
                        ? "border-[#1a3a2a] bg-[#1a3a2a] text-white shadow-lg"
                        : "border-dashed border-[#1a3a2a]/10 text-[#1a3a2a]/40 hover:border-[#1a3a2a]/30 hover:text-[#1a3a2a]/60"
                      }`}
                    >
                      <MessageSquare size={18} className={activeDashboardView === "chat" ? "" : "group-hover:scale-110 transition-transform"} />
                      <span className="text-sm font-bold">View Chat explorations</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto p-8 border-t border-[#1a3a2a]/5 space-y-2">
          <button 
            onClick={() => window.location.reload()}
            className="w-full p-3 rounded-xl flex items-center gap-3 text-red-500 hover:bg-red-50 transition-all font-bold text-sm"
          >
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Global Parent Header */}
        <header className="px-10 py-6 bg-white border-b border-[#1a3a2a]/5 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F4F3EE] flex items-center justify-center text-[#1a3a2a] shadow-sm">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1a3a2a]">{parentProfile?.username || "Parent Account"}</h2>
              <p className="text-[10px] font-black text-[#1a3a2a]/30 uppercase tracking-[0.2em]">Academic Overseer</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ParentRequestBell />
            <div className="h-8 w-[1px] bg-[#1a3a2a]/10 mx-2" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-[#1a3a2a] leading-tight">Verified Portal</p>
                <p className="text-[10px] font-bold text-[#059669] uppercase tracking-wider">Active Monitoring</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a3a2a] to-[#059669] border-2 border-white shadow-md" />
            </div>
          </div>
        </header>

        {isFetchingStudents ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-[#1a3a2a]/10 border-t-[#1a3a2a] rounded-full animate-spin" />
              <p className="text-sm font-bold text-[#1a3a2a]/40 tracking-widest uppercase">Fetching Insights...</p>
            </div>
          </div>
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
