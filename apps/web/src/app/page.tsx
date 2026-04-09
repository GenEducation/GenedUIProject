"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PartnerAdmin } from "@/features/partner/components/PartnerAdmin";
import { StudentPortal } from "@/features/student/components/StudentPortal";
import { LoginView } from "@/features/auth/components/LoginView";

/**
 * HomePage acts as the root router for the Gened platform.
 * It handles authentication state and directs users to their
 * respective portals (Student, Partner, or Parent) based on
 * the role returned by the backend.
 */
export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<"student" | "parent" | "partner" | null>(null);

  // When a user successfully authenticates, LoginView calls this with their role.
  const handleLogin = (role: "student" | "parent" | "partner") => {
    setUserRole(role);
    setIsLoggedIn(true);
  };

  // If not logged in, show the Login/Signup view
  if (!isLoggedIn) {
    return <LoginView onLogin={handleLogin} />;
  }

  // Once logged in, render the appropriate portal based on the role.
  return (
    <main className="h-screen bg-white text-[#1a3a2a] font-sans flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {userRole === "partner" ? (
          <motion.div
            key="partner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full"
          >
            <PartnerAdmin />
          </motion.div>
        ) : userRole === "student" ? (
          <motion.div
            key="student"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full"
          >
            <StudentPortal />
          </motion.div>
        ) : userRole === "parent" ? (
          <motion.div
            key="parent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex items-center justify-center bg-[#F4F3EE]"
          >
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold tracking-tight text-[#1a3a2a]">Parent Knowledge Insights</h2>
              <p className="text-[#1a3a2a]/40">The parent portal is currently being refreshed. Check back soon!</p>
              <button 
                onClick={() => setIsLoggedIn(false)}
                className="px-6 py-2 bg-[#1a3a2a] text-white rounded-xl text-sm font-semibold"
              >
                Return to Login
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
