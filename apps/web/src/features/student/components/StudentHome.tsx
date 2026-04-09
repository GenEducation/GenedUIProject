"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Plus, BookOpen, PenLine, Search, LogOut, User, Loader2 } from "lucide-react";
import {
  useStudentStore,
  ChatSession,
  AVAILABLE_SUBJECTS,
  SubjectItem,
} from "../store/useStudentStore";
import { AgentPickerModal } from "@/features/student/components/AgentPickerModal";

export function StudentHome() {
  const { 
    studentProfile, 
    recentChats, 
    fetchSessions, 
    isSessionsLoading,
    openExistingChat, 
    openNewChat, 
    setAgentPickerOpen, 
    isAgentPickerOpen, 
    logoutStudent 
  } = useStudentStore();

  useEffect(() => {
    if (studentProfile) {
      fetchSessions();
    }
  }, [studentProfile, fetchSessions]);

  const username = studentProfile?.username ?? "Scholar";

  return (
    <div className="min-h-screen bg-[#F4F3EE] font-sans">
      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-8 py-5 border-b border-[#1a3a2a]/8 bg-[#F4F3EE]/80 backdrop-blur-md sticky top-0 z-30"
      >
        <button
          onClick={() => window.location.reload()}
          className="hover:opacity-80 transition-opacity"
        >
          <img src="/Logo.svg" alt="Gened Logo" className="h-10 w-auto" />
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={logoutStudent}
            className="flex items-center gap-2 text-xs font-semibold text-[#1a3a2a]/50 hover:text-[#1a3a2a] transition-colors px-3 py-2 rounded-xl hover:bg-[#1a3a2a]/5"
          >
            <LogOut size={14} />
            Sign out
          </button>
          <div className="w-8 h-8 rounded-full bg-[#1a3a2a]/10 flex items-center justify-center">
            <User size={16} className="text-[#1a3a2a]/60" />
          </div>
        </div>
      </motion.nav>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-8 py-14 space-y-16">
        {/* Hero greeting */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-2"
        >
          <h1 className="text-5xl font-extrabold text-[#1a3a2a] tracking-tight leading-tight">
            Hi {username}
          </h1>
          <p className="text-3xl font-bold text-[#2d6a4a] tracking-tight">
            Where should we start?
          </p>
        </motion.header>

        {/* Recent Chats */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="space-y-6"
        >
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#1a3a2a]">Recent Chats</h2>
              <p className="text-sm text-[#1a3a2a]/50">
                Pick up where you left off in your academic journey.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {isSessionsLoading ? (
              [1, 2, 3].map((n) => (
                <div key={n} className="bg-white/50 animate-pulse rounded-2xl h-32 border border-[#1a3a2a]/4" />
              ))
            ) : recentChats.length > 0 ? (
              recentChats.slice(0, 3).map((chat: ChatSession, i: number) => (
                <RecentChatCard
                  key={chat.id}
                  chat={chat}
                  delay={i * 0.06}
                  onContinue={() => openExistingChat(chat)}
                />
              ))
            ) : (
              <div className="col-span-1 md:col-span-3 py-10 text-center border-2 border-dashed border-[#1a3a2a]/8 rounded-2xl">
                <p className="text-[#1a3a2a]/40 text-sm">No recent sessions found. Start a new one below!</p>
              </div>
            )}
          </div>
        </motion.section>

        {/* Start New Chat */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1a3a2a]">Start New Chat</h2>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAgentPickerOpen(true)}
              className="w-10 h-10 rounded-full bg-[#1a3a2a] text-white flex items-center justify-center shadow-lg shadow-[#1a3a2a]/20 hover:bg-[#2d6a4a] transition-colors"
            >
              <Plus size={18} />
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {AVAILABLE_SUBJECTS.slice(0, 3).map((subject: SubjectItem, i: number) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.07 }}
                onClick={() => openNewChat(subject)}
                className="bg-white rounded-2xl p-6 space-y-3 border border-[#1a3a2a]/8 shadow-sm hover:shadow-lg hover:shadow-[#1a3a2a]/5 transition-all cursor-pointer group"
              >
                <div className="space-y-1">
                  <h3 className="font-bold text-[#1a3a2a] text-base group-hover:text-[#2d6a4a] transition-colors">{subject.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-[#1a3a2a]/45">
                    <span>{subject.grade}</span>
                    <span>&bull;</span>
                    <span>{subject.chaptersCount} Chapters</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>

      {/* Agent Picker Modal */}
      {isAgentPickerOpen && <AgentPickerModal />}
    </div>
  );
}

// ── Recent Chat Card ──────────────────────────────────────────────────────────

function RecentChatCard({
  chat,
  delay,
  onContinue,
}: {
  chat: ChatSession;
  delay: number;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onContinue}
      className="bg-white rounded-2xl p-6 border border-[#1a3a2a]/8 shadow-sm hover:shadow-lg hover:shadow-[#1a3a2a]/5 transition-all flex flex-col justify-between gap-5 group cursor-pointer"
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <h3 className="font-bold text-[#1a3a2a] text-base leading-tight group-hover:text-[#2d6a4a] transition-colors">
            {chat.title}
          </h3>
          <p className="text-xs text-[#1a3a2a]/45">
            Last active {chat.lastActive} &bull; {chat.lastTopic}
          </p>
        </div>
      </div>
    </motion.div>

  );
}
