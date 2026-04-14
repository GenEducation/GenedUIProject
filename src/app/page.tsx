"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PartnerAdmin } from "@/features/partner/components/PartnerAdmin";
import { StudentPortal } from "@/features/student/components/StudentPortal";
import { ParentHome } from "@/features/parent/components/ParentHome";
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
            className="h-full"
          >
            <ParentHome />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
