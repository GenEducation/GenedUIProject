"use client";

import React, { useEffect } from "react";
import { MessageSquare, Clock, ChevronRight, Search } from "lucide-react";
import { useParentStore } from "../store/useParentStore";

export function ParentSessionList() {
  const { 
    selectedStudentId, 
    selectedStudentSessions, 
    activeSessionId, 
    setActiveSessionId,
    fetchStudentSessions,
    isFetchingSessions
  } = useParentStore();

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentSessions(selectedStudentId);
    }
  }, [selectedStudentId, fetchStudentSessions]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="w-[350px] bg-white border-r border-[#1a3a2a]/5 flex flex-col h-full">
      <div className="p-6 border-b border-[#1a3a2a]/5">
        <h3 className="text-lg font-black text-[#1a3a2a] mb-4">Learning Explorations</h3>
        <div className="relative group">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1a3a2a]/30 group-focus-within:text-[#1a3a2a] transition-colors" />
          <input 
            type="text" 
            placeholder="Search sessions..." 
            className="w-full pl-11 pr-4 py-3 bg-[#F4F3EE] rounded-xl text-sm font-medium border-none focus:ring-2 focus:ring-[#1a3a2a]/10 transition-all placeholder:text-[#1a3a2a]/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isFetchingSessions ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-3 border-[#1a3a2a]/10 border-t-[#1a3a2a] rounded-full animate-spin" />
            <p className="text-[10px] font-black text-[#1a3a2a]/30 uppercase tracking-widest">Loading sessions...</p>
          </div>
        ) : selectedStudentSessions.length > 0 ? (
          selectedStudentSessions.map((session) => (
            <button
              key={session.session_id}
              onClick={() => setActiveSessionId(session.session_id)}
              className={`w-full p-4 rounded-2xl flex flex-col transition-all text-left group ${
                activeSessionId === session.session_id
                  ? "bg-[#1a3a2a] text-white shadow-xl translate-x-1"
                  : "bg-white hover:bg-[#F4F3EE] text-[#1a3a2a]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${activeSessionId === session.session_id ? "bg-white/10" : "bg-[#E5F2E9]"}`}>
                  <MessageSquare size={14} className={activeSessionId === session.session_id ? "text-white" : "text-[#1a3a2a]"} />
                </div>
                {activeSessionId === session.session_id && (
                  <motion.div
                    layoutId="active-indicator"
                    className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white]"
                  />
                )}
              </div>
              
              <h4 className="text-sm font-black mb-1 truncate leading-tight">
                {session.title || "Untitled Exploration"}
              </h4>
              
              <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${
                activeSessionId === session.session_id ? "text-white/60" : "text-[#1a3a2a]/40"
              }`}>
                <Clock size={10} />
                <span>{formatDate(session.created_at)}</span>
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 rounded-3xl bg-[#F4F3EE] flex items-center justify-center text-[#1a3a2a]/10 mx-auto mb-4">
              <MessageSquare size={32} />
            </div>
            <p className="text-sm font-bold text-[#1a3a2a]/40 mb-1">No sessions found</p>
            <p className="text-[10px] text-[#1a3a2a]/20 font-medium">This student hasn't started any explorations yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Added motion import since I used motion.div
import { motion } from "framer-motion";
