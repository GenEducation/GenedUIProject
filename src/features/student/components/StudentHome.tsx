"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Plus, BookOpen, PenLine, Search, LogOut, User, Loader2, BarChart2 } from "lucide-react";
import {
  useStudentStore,
  ChatSession,
  SubjectItem,
  AgentItem,
} from "../store/useStudentStore";
import { AgentPickerModal } from "@/features/student/components/AgentPickerModal";

import { NotificationBell } from "@/components/NotificationBell";

export function StudentHome() {
  // Styles for the animated gradient text
  const animateGradientStyle = `
    @keyframes shiftGradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .animate-gradient-text {
      background: linear-gradient(
        to right, 
        #1a3a2a,
        #03b1ed, 
        #00a866,
        #430163,
        #1a3a2a
      );
      background-size: 300% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: shiftGradient 8s ease-in-out infinite;
      display: inline-block;
    }
  `;

  const router = useRouter();
  const [isOnboardingDropdownOpen, setOnboardingDropdownOpen] = useState(false);

  const { 
    studentProfile, 
    recentChats, 
    fetchSessions, 
    isSessionsLoading,
    openExistingChat,
    openNewChat, 
    setAgentPickerOpen, 
    isAgentPickerOpen, 
    logoutStudent,
    fetchAvailableAgents,
    availableAgents,
    isAgentsLoading
  } = useStudentStore();


  useEffect(() => {
    if (studentProfile) {
      fetchSessions();
      fetchAvailableAgents();
    }
  }, [studentProfile, fetchSessions, fetchAvailableAgents]);

  const username = studentProfile?.username ?? "Scholar";
  const userId = studentProfile?.user_id ?? "";

  const onboardingSubjects = Array.from(
    new Map(
      availableAgents
        .filter((a) => a.subject === "English" || a.subject === "Mathematics")
        .map((a) => [a.subject, a])
    ).values()
  );

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
          {/* Subject Onboarding Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setOnboardingDropdownOpen(!isOnboardingDropdownOpen)}
              className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors px-3 py-2 rounded-xl border border-amber-200"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Subject Onboarding
            </button>
            
            {isOnboardingDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOnboardingDropdownOpen(false)} />
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#1a3a2a]/10 overflow-hidden z-50">
                  <div className="p-3 bg-amber-50 border-b border-amber-100">
                    <p className="text-xs font-bold text-amber-800">Pending Onboarding</p>
                    <p className="text-[10px] text-amber-700/70 mt-0.5 leading-tight">Select a subject to complete your assessment.</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                    {onboardingSubjects.length > 0 ? (
                      onboardingSubjects.map((agent) => (
                        <button
                          key={agent.agent_id}
                          onClick={() => {
                            setOnboardingDropdownOpen(false);
                            router.push(`/student/onboarding?type=subject&subject=${encodeURIComponent(agent.subject)}&grade=${agent.grade}`);
                          }}
                          className="w-full flex flex-col text-left px-3 py-2.5 rounded-xl hover:bg-[#1a3a2a]/5 transition-colors"
                        >
                          <span className="text-sm font-bold text-[#1a3a2a]">{agent.subject}</span>
                          <span className="text-[10px] font-bold text-[#1a3a2a]/50 uppercase tracking-wider mt-0.5">Grade {agent.grade} • {agent.name}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-6 text-center">
                        <p className="text-xs font-bold text-[#1a3a2a]/40">No subjects available</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => router.push('/student/analytics')}
            className="flex items-center gap-2 text-xs font-semibold text-[#1a3a2a]/50 hover:text-[#1a3a2a] transition-colors px-3 py-2 rounded-xl hover:bg-[#1a3a2a]/5"
          >
            <BarChart2 size={14} />
            Analytics
          </button>
          <button
            onClick={logoutStudent}
            className="flex items-center gap-2 text-xs font-semibold text-[#1a3a2a]/50 hover:text-[#1a3a2a] transition-colors px-3 py-2 rounded-xl hover:bg-[#1a3a2a]/5"
          >
            <LogOut size={14} />
            Logout
          </button>
          
          {userId && <NotificationBell userId={userId} />}

          <button
            onClick={() => router.push('/student/profile')}
            className="w-10 h-10 rounded-full bg-[#1a3a2a] hover:bg-[#2d6a4a] text-white shadow-md shadow-[#1a3a2a]/20 transition-all flex items-center justify-center transform hover:scale-105"
          >
            <User size={18} className="text-white" />
          </button>
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
          <style>{animateGradientStyle}</style>
          <h1 className="text-5xl font-extrabold tracking-tight leading-tight animate-gradient-text">
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
                  onContinue={() => {
                    openExistingChat(chat);
                    router.push(`/student/chat/${chat.id}`);
                  }}
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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setAgentPickerOpen(true)}
              className="px-4 py-2 rounded-full bg-[#1a3a2a]/5 text-[#1a3a2a] hover:bg-[#1a3a2a]/10 flex items-center justify-center gap-2 transition-colors border border-[#1a3a2a]/10 font-bold text-xs"
            >
              Show all agents
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {isAgentsLoading ? (
              [1, 2, 3].map((n) => (
                <div key={n} className="bg-white/50 animate-pulse rounded-2xl h-24 border border-[#1a3a2a]/4" />
              ))
            ) : availableAgents.length > 0 ? (
              availableAgents.slice(0, 3).map((agent: AgentItem, i: number) => (
                <motion.div
                  key={agent.agent_id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.07 }}
                  onClick={() => {
                    openNewChat(agent);
                    router.push(`/student/chat?agent=${agent.agent_id}`);
                  }}
                  className="bg-white rounded-2xl p-5 space-y-3 border border-[#1a3a2a]/8 shadow-sm hover:shadow-lg hover:shadow-[#1a3a2a]/5 transition-all cursor-pointer group flex flex-col justify-center"
                >
                  <div className="space-y-1">
                    <h3 className="font-bold text-[#1a3a2a] text-base group-hover:text-[#2d6a4a] transition-colors">{agent.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-[#1a3a2a]/60 font-semibold tracking-wide">
                      <span>{agent.subject}</span>
                      <span>&bull;</span>
                      <span>Grade {agent.grade}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-1 md:col-span-3 py-10 text-center border-2 border-dashed border-[#1a3a2a]/8 rounded-2xl">
                <p className="text-[#1a3a2a]/40 text-sm">Add partners from your profile to start chat</p>
              </div>
            )}
          </div>
        </motion.section>
      </div>

      {/* Agent Picker Modal */}
      {isAgentPickerOpen && <AgentPickerModal />}
    </div>
  );
}

// -- Recent Chat Card ----------------------------------------------------------

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
