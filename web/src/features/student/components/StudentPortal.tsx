"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useStudentStore } from "../store/useStudentStore";
import { StudentHome } from "./StudentHome";
import { StudentChatView } from "./StudentChatView";
import { StudentProfile } from "./StudentProfile";
import { PartnerRequestModal } from "./PartnerRequestModal";

/**
 * Top-level entry point for the student portal.
 * Conditionally renders StudentHome or StudentChatView
 * based on `isChatOpen` from the student store.
 */
export function StudentPortal() {
  const { isChatOpen, isProfileOpen } = useStudentStore();

  return (
    <div className="h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        {isProfileOpen ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="h-full overflow-y-auto"
          >
            <StudentProfile />
          </motion.div>
        ) : isChatOpen ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="h-full"
          >
            <StudentChatView />
          </motion.div>
        ) : (
          <motion.div
            key="home"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="h-full overflow-y-auto"
          >
            <StudentHome />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enrollment Status Modal */}
      <PartnerRequestModal />
    </div>
  );
}
