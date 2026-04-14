"use client";

import React from "react";
import { motion } from "framer-motion";
import { ParentSessionList } from "./ParentSessionList";
import { ParentChatHistoryView } from "./ParentChatHistoryView";

export function ParentChatExploration() {
  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="h-full"
      >
        <ParentSessionList />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex-1 h-full"
      >
        <ParentChatHistoryView />
      </motion.div>
    </div>
  );
}
