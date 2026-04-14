"use client";

import React from "react";
import { motion } from "framer-motion";
import { ParentSessionList } from "./ParentSessionList";
import { ParentChatHistoryView } from "./ParentChatHistoryView";
import { useParentStore } from "../store/useParentStore";
import { ChevronLeft } from "lucide-react";

export function ParentChatExploration() {
  const { activeSessionId, setActiveSessionId } = useParentStore();

  return (
    <div className="flex-1 flex overflow-hidden bg-white relative">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className={`h-full ${activeSessionId ? "hidden md:flex" : "flex w-full md:w-auto"}`}
      >
        <ParentSessionList />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={`flex-1 h-full flex flex-col ${!activeSessionId ? "hidden md:flex" : "flex"}`}
      >
        {activeSessionId && (
          <button 
            onClick={() => setActiveSessionId(null)}
            className="md:hidden flex items-center gap-2 p-4 text-[#1a3a2a]/60 hover:text-[#1a3a2a] transition-colors border-b border-[#1a3a2a]/5"
          >
            <ChevronLeft size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Back to Sessions</span>
          </button>
        )}
        <ParentChatHistoryView />
      </motion.div>
    </div>
  );
}
