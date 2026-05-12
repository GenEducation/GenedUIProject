"use client";

import { User, BarChart2, Loader2, Plus, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "../store/useStudentStore";
import React from "react";

/**
 * StudentChatSidebar renders the list of recent knowledge threads.
 */
export const StudentChatSidebar = React.memo(({ 
  activeChatId, 
  isOpen, 
  onClose 
}: { 
  activeChatId: string;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const router = useRouter();
  const { 
    openExistingChat, 
    closeChat, 
    recentChats, 
    isSessionsLoading, 
    logoutStudent,
    studentProfile 
  } = useStudentStore();

  return (
    <aside 
      className={`sidebar-transition h-full flex-shrink-0 bg-[#F4F3EE] border-r border-[#042E5C]/8 flex flex-col overflow-hidden ${
        isOpen ? "w-80" : "w-0 border-r-0"
      }`}
    >
      <div className="w-80 flex flex-col h-full">
        {/* Sidebar header */}
        <div className="px-6 pt-8 pb-6 border-b border-[#042E5C]/8 flex items-center justify-between">
          <button
            onClick={() => {
              closeChat();
              window.location.href = '/student';
            }}
            className="hover:opacity-80 transition-opacity"
          >
            <img src="/Logo.svg" alt="Gened Logo" className="h-9 w-auto" data-tutorial="logo" />
          </button>
        </div>

        {/* Thread list */}
        <div className="flex-1 p-5 space-y-1 overflow-y-auto">
          
          {/* Start New Chat Action */}
          <button
            onClick={() => {
              closeChat();
              window.location.href = '/student';
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left bg-white border border-[#042E5C]/5 text-[#042E5C] hover:bg-[#042E5C]/5 hover:border-[#042E5C]/10 transition-all shadow-sm mb-6 group"
            data-tutorial="new-chat"
          >
            <div className="w-8 h-8 rounded-lg bg-[#042E5C]/5 flex items-center justify-center text-[#042E5C]/60 group-hover:bg-[#042E5C] group-hover:text-white transition-colors">
              <Plus size={18} />
            </div>
            <span className="text-[13px] font-extrabold">Start New Chat</span>
          </button>

          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#042E5C]/30 px-2 pb-3">
            Recent Knowledge Threads
          </p>

          {isSessionsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-[#042E5C]/20 animate-spin" />
            </div>
          ) : recentChats.length > 0 ? (
            recentChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => {
                  openExistingChat(chat);
                  window.location.href = `/student/chat/${chat.id}`;
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all group ${
                  activeChatId === chat.id
                    ? "bg-[#042E5C] text-white shadow-lg shadow-[#042E5C]/10"
                    : "hover:bg-[#042E5C]/5 text-[#042E5C]/60 hover:text-[#042E5C]"
                }`}
              >
                <span 
                  className="text-[13px] font-bold truncate flex-1 min-w-0" 
                  title={chat.title}
                >
                  {chat.title}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-6">
              <p className="text-xs text-[#042E5C]/30 italic leading-relaxed">
                No recent threads found.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar footer */}
        <div className="p-5 border-t border-[#042E5C]/8 space-y-1">
          <button 
            onClick={() => window.location.href = '/student/profile'}
            className="w-full flex items-center justify-between gap-4 px-4 py-3 rounded-2xl text-[#042E5C]/50 hover:text-[#042E5C] hover:bg-[#042E5C]/5 transition-all group"
            data-tutorial="profile-nav"
          >
            <div className="flex items-center gap-4">
              <User size={18} />
              <span className="text-[13px] font-bold">Profile</span>
            </div>
            {studentProfile?.plan && (
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border shadow-sm ${
                studentProfile.plan === "PRO" 
                  ? "bg-[#059F6D]/10 text-[#059F6D] border-[#059F6D]/20" 
                  : "bg-[#042E5C]/10 text-[#042E5C] border-[#042E5C]/20"
              }`}>
                {studentProfile.plan}
              </span>
            )}
          </button>
          <button 
            onClick={() => window.location.href = '/student/analytics'}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[#042E5C]/50 hover:text-[#042E5C] hover:bg-[#042E5C]/5 transition-all"
            data-tutorial="analytics-nav"
          >
            <BarChart2 size={18} />
            <span className="text-[13px] font-bold">Analytics</span>
          </button>
          <button 
            onClick={logoutStudent}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[#042E5C]/50 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={18} />
            <span className="text-[13px] font-bold">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
});

StudentChatSidebar.displayName = "StudentChatSidebar";
