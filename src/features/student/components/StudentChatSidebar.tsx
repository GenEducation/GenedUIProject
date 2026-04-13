"use client";

import { User, BarChart2, Loader2 } from "lucide-react";
import { useStudentStore } from "../store/useStudentStore";
import React from "react";

/**
 * StudentChatSidebar renders the list of recent knowledge threads.
 * It is memoized to prevent unnecessary re-renders when the main chat
 * area updates, and it consumes its own data from the store.
 */
export const StudentChatSidebar = React.memo(({ activeChatId }: { activeChatId: string }) => {
  const { openExistingChat, closeChat, recentChats, isSessionsLoading, setProfileOpen } = useStudentStore();

  const activeChatFromStore = useStudentStore((state) => state.activeChat);
  const activeChat = recentChats.find((c) => c.id === activeChatId) || 
                    (activeChatFromStore?.id === activeChatId ? activeChatFromStore : null);

  return (
    <aside className="w-64 flex-shrink-0 bg-[#F4F3EE] border-r border-[#1a3a2a]/8 flex flex-col">
      {/* Sidebar header */}
      <div className="px-5 pt-6 pb-5 border-b border-[#1a3a2a]/8">
        <button
          onClick={closeChat}
          className="hover:opacity-80 transition-opacity"
        >
          <img src="/Logo.svg" alt="Gened Logo" className="h-10 w-auto" />
        </button>
      </div>

      {/* Thread list */}
      <div className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#1a3a2a]/35 px-2 pb-2">
          Recent Knowledge Threads
        </p>

        {isSessionsLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 text-[#1a3a2a]/20 animate-spin" />
          </div>
        ) : recentChats.length > 0 ? (
          recentChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => openExistingChat(chat)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                activeChatId === chat.id
                  ? "bg-[#1a3a2a] text-white"
                  : "hover:bg-[#1a3a2a]/8 text-[#1a3a2a]/70"
              }`}
            >
              <span 
                className="text-xs font-semibold truncate flex-1 min-w-0" 
                title={chat.title}
              >
                {chat.title}
              </span>
            </button>
          ))
        ) : (
          <div className="px-2 py-4">
            <p className="text-[10px] text-[#1a3a2a]/30 italic leading-relaxed">
              No recent threads found.
            </p>
          </div>
        )}

        {/* If current chat is brand-new (not in recent list) show it as active */}
        {activeChat && !recentChats.find((c) => c.id === activeChatId) && (
          <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#1a3a2a] text-white">
            <span 
              className="text-xs font-semibold truncate flex-1 min-w-0" 
              title={activeChat.title}
            >
              {activeChat.title}
            </span>
          </div>
        )}
      </div>

      {/* Sidebar footer — visual placeholders */}
      <div className="p-4 border-t border-[#1a3a2a]/8 space-y-1">
        <button 
          onClick={() => setProfileOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#1a3a2a]/50 hover:text-[#1a3a2a] hover:bg-[#1a3a2a]/8 transition-all"
        >
          <User size={16} />
          <span className="text-xs font-semibold">Profile</span>
        </button>
        <button 
          onClick={() => {
            useStudentStore.getState().setAnalyticsOpen(true);
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#1a3a2a]/50 hover:text-[#1a3a2a] hover:bg-[#1a3a2a]/8 transition-all"
        >
          <BarChart2 size={16} />
          <span className="text-xs font-semibold">Analytics</span>
        </button>
      </div>
    </aside>
  );
});

StudentChatSidebar.displayName = "StudentChatSidebar";
