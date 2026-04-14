"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Clock, AlertCircle } from "lucide-react";
import { useParentStore } from "../store/useParentStore";

export function ParentChatHistoryView() {
  const { 
    selectedStudentId, 
    activeSessionId, 
    activeSessionHistory,
    fetchSessionHistory,
    isFetchingHistory
  } = useParentStore();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedStudentId && activeSessionId) {
      fetchSessionHistory(selectedStudentId, activeSessionId);
    }
  }, [selectedStudentId, activeSessionId, fetchSessionHistory]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSessionHistory]);

  if (!activeSessionId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#FBFBFA]">
        <div className="w-20 h-20 rounded-[32px] bg-white shadow-xl flex items-center justify-center text-[#1a3a2a]/5 mb-8">
          <Bot size={40} />
        </div>
        <h3 className="text-2xl font-black text-[#1a3a2a] mb-2">Select an Exploration</h3>
        <p className="max-w-xs text-sm font-medium text-[#1a3a2a]/40 leading-relaxed">
          Choose a session from the list to review the learning dialogue and cognitive progress.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#FBFBFA] h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-8 py-10" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-8">
          {isFetchingHistory ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-[#1a3a2a]/10 border-t-[#1a3a2a] rounded-full animate-spin" />
              <p className="text-sm font-bold text-[#1a3a2a]/40 tracking-widest uppercase">Retrieving Dialogue...</p>
            </div>
          ) : activeSessionHistory.length > 0 ? (
            activeSessionHistory.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                  msg.role === "user" ? "bg-[#1a3a2a] text-white" : "bg-white text-[#1a3a2a]"
                }`}>
                  {msg.role === "user" ? <User size={18} /> : <Bot size={18} />}
                </div>
                
                <div className={`max-w-[70%] space-y-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`p-6 rounded-[32px] text-sm leading-relaxed font-medium shadow-sm transition-all hover:shadow-md ${
                    msg.role === "user" 
                      ? "bg-[#1a3a2a] text-white rounded-tr-none" 
                      : "bg-white text-[#1a3a2a] rounded-tl-none border border-[#1a3a2a]/5"
                  }`}>
                    {msg.content}
                  </div>
                  <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest opacity-30 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}>
                    <Clock size={10} />
                    <span>{msg.role === "user" ? "Student" : "Gened AI"}</span>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center text-red-100 mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <p className="text-sm font-bold text-[#1a3a2a]/40">No message history available for this session.</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-8 py-6 bg-white border-t border-[#1a3a2a]/5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
            <span className="text-[10px] font-black text-[#1a3a2a]/40 uppercase tracking-widest">Read Only Mode</span>
          </div>
          <p className="text-[10px] font-bold text-[#1a3a2a]/20 uppercase tracking-[0.1em]">
            Dialogue captured in real-time
          </p>
        </div>
      </div>
    </div>
  );
}
