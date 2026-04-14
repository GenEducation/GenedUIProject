"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PartnerAdmin } from "@/features/partner/components/PartnerAdmin";
import { StudentPortal } from "@/features/student/components/StudentPortal";
import { ParentHome } from "@/features/parent/components/ParentHome";
import { LoginView } from "@/features/auth/components/LoginView";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useParentStore } from "@/features/parent/store/useParentStore";
import { usePartnerStore } from "@/features/partner/store/usePartnerStore";

/**
 * HomePage acts as the root router for the Gened platform.
 * It handles authentication state and directs users to their
 * respective portals (Student, Partner, or Parent) based on
 * the role returned by the backend.
 */
export default function HomePage() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<"student" | "parent" | "partner" | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("gened_auth_token");
    const role = localStorage.getItem("gened_user_role") as "student" | "parent" | "partner" | null;
    const profileStr = localStorage.getItem("gened_user_profile");

    if (token && role && profileStr) {
      try {
        const profile = JSON.parse(profileStr);
        
        // Hydrate store based on role
        if (role === "student") {
          useStudentStore.getState().setStudentProfile({
            user_id: profile.user_id,
            username: profile.username,
            email: profile.email,
            role: profile.role,
            grade: profile.grade,
            school_board: profile.school_board,
          });
        } else if (role === "parent") {
          useParentStore.getState().setParentProfile({
            user_id: profile.user_id || "",
            username: profile.username || "",
            email: profile.email || "",
            role: profile.role || "parent",
          });
        }
        
        setUserRole(role);
        setIsLoggedIn(true);
      } catch (error) {
        console.error("Failed to restore session:", error);
        // Clear corrupt data
        localStorage.clear();
      }
    }
    setIsInitializing(false);
  }, []);

  // When a user successfully authenticates, LoginView calls this with their role.
  const handleLogin = (role: "student" | "parent" | "partner") => {
    setUserRole(role);
    setIsLoggedIn(true);
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F7F6F1]">
        <div className="flex flex-col items-center gap-4">
          <img src="/Logo.svg" alt="Logo" className="h-12 w-auto animate-pulse" />
          <div className="w-8 h-8 border-4 border-[#2D5540] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

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
