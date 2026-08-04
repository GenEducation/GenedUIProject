"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useStudentStore } from "../store/useStudentStore";
import { getStudentDisplayName } from "../utils/displayName";
import { STUDENT_COLORS } from "../theme/colors";
import { StudentAvatarIllustration } from "./StudentAvatarIllustration";
import { STRINGS } from "../constants/strings";
import { LogOut, Menu } from "lucide-react";
import { UpgradeButton } from "@/features/billing/UpgradeButton";

/* ═══ TOKENS ═══ — sourced from STUDENT_COLORS (see theme/colors.ts) */
const C = {
  genPurple: STUDENT_COLORS.tutor,
  genBlue: STUDENT_COLORS.tutorSoft,
  edGreen: STUDENT_COLORS.subjectMath,
  sparkle: STUDENT_COLORS.tutorLight,
  sun: STUDENT_COLORS.warn,
  sidebarBg: STUDENT_COLORS.sidebarBg,
  sidebarText: STUDENT_COLORS.sidebarText,
  sidebarActive: STUDENT_COLORS.sidebarActive,
};

/* ═══ GENED LOGO ═══ */
function GenEdLogo() {
  return (
    <Image
      src="/Logo.svg"
      alt="GenEd"
      width={96}
      height={32}
      style={{ height: 30, width: "auto", filter: "brightness(0) invert(1)" }}
      priority
    />
  );
}

/* ═══ NAV ITEM ═══ */
function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl border-none cursor-pointer transition-all text-left"
      style={{
        padding: "10px 14px",
        background: active ? "rgba(255,255,255,0.1)" : "transparent",
        color: active ? C.sidebarActive : C.sidebarText,
        fontSize: 14,
        fontWeight: active ? 700 : 500,
        fontFamily: "var(--font-body)",
      }}
    >
      <span className="text-lg w-[22px] text-center">{icon}</span>
      <span>{label}</span>
      {active && (
        <div
          className="ml-auto w-1.5 h-1.5 rounded-full"
          style={{ background: C.sparkle }}
        />
      )}
    </button>
  );
}

interface StudentHomeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const RAIL_W = 72;

export const StudentHomeSidebar = React.memo(function StudentHomeSidebar({
  isOpen,
  onClose,
  onOpen,
}: StudentHomeSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { studentProfile, logoutStudent, avatarId } = useStudentStore();

  const plan   = studentProfile?.plan ?? "FREE";
  const isPro  = plan === "PRO";

  const getActiveNav = () => {
    if (pathname === "/student" || pathname === "/student/") return "home";
    if (pathname?.startsWith("/student/assessments")) return "practice";
    if (pathname?.startsWith("/student/schedule")) return "schedule";
    if (pathname?.startsWith("/student/report-card")) return "report";
    if (pathname?.startsWith("/student/profile")) return "me";
    // Chat and Voice aren't nav items — no highlight, rather than the old
    // fallback of always highlighting "Home" while in a voice session.
    return null;
  };

  const activeNav = getActiveNav();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const navigate = (path: string) => {
    if (path === "/student") {
      window.location.href = path;
    } else {
      router.push(path);
    }
    if (window.innerWidth < 1024) onClose();
  };

  const sidebarW = isOpen ? 260 : RAIL_W;
  const mobileWidth = Math.min(260, 300);

  const navItems = [
    { icon: "🏠", label: STRINGS.nav.home, key: "home", path: "/student" },
    { icon: "🎯", label: STRINGS.nav.practice, key: "practice", path: "/student/assessments" },
    { icon: "🗓️", label: STRINGS.nav.schedule, key: "schedule", path: "/student/schedule" },
    { icon: "📋", label: STRINGS.nav.reportCard, key: "report", path: "/student/report-card" },
    { icon: "😊", label: STRINGS.nav.me, key: "me", path: "/student/profile" },
  ];

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-30"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={onClose}
        />
      )}
      <aside
        className={`flex-shrink-0 flex flex-col overflow-hidden sidebar-transition ${
          isMobile ? "fixed inset-y-0 left-0 z-40 h-full" : "h-full"
        }`}
        style={
          isMobile
            ? {
                width: isOpen ? mobileWidth : 0,
                minWidth: isOpen ? mobileWidth : 0,
                maxWidth: "85vw",
                background: C.sidebarBg,
                boxShadow: isOpen ? "0 0 32px rgba(0,0,0,0.35)" : "none",
              }
            : {
                width: sidebarW,
                minWidth: sidebarW,
                background: C.sidebarBg,
              }
        }
      >
      {isOpen && (
        <div className="flex flex-col h-full" style={{ padding: "16px 12px" }}>
          {/* Header: logo + close */}
          <div className="flex items-center justify-between mb-7 px-0.5 py-1">
            <button onClick={() => navigate("/student")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
              <GenEdLogo />
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: C.sidebarText,
                fontSize: 16,
              }}
              title="Close sidebar"
            >
              <Menu size={16} strokeWidth={1.75} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavItem
                key={item.key}
                icon={item.icon}
                label={item.label}
                active={activeNav === item.key}
                onClick={() => navigate(item.path)}
              />
            ))}
          </nav>

          {/* Student info */}
          <div className="mt-auto pt-3.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2.5 px-1">
              <div
                className="w-[34px] h-[34px] rounded-full overflow-hidden flex-shrink-0"
                style={{ border: "1.5px solid rgba(255,255,255,0.12)" }}
              >
                {avatarId === "graduate-girl" ? (
                  <img
                    src="/avatars/girl-graduate.png"
                    alt="Student avatar"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <StudentAvatarIllustration bg={C.sun} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {/* Name + plan badge */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: C.sidebarActive }}>
                    {getStudentDisplayName(studentProfile)}
                  </div>
                  <span style={{
                    flexShrink: 0,
                    padding: "1px 6px",
                    borderRadius: 5,
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    background: isPro ? "#00B89420" : `${C.genPurple}25`,
                    color:      isPro ? "#00B894"   : C.sparkle,
                    border:     `1px solid ${isPro ? "#00B89440" : C.sparkle + "40"}`,
                  }}>
                    {plan}
                  </span>
                </div>
                <div className="text-[10px]" style={{ color: C.sidebarText, opacity: 0.6 }}>
                  Grade {studentProfile?.grade ?? "—"} · {studentProfile?.school_board ?? "—"}
                </div>
              </div>
            </div>

            {/* PRO: renewal date */}
            {isPro && studentProfile?.plan_expires_at && (() => {
              try {
                const d = new Date(studentProfile.plan_expires_at!);
                if (isNaN(d.getTime())) return null;
                return (
                  <div className="text-[10px] mt-2 px-1" style={{ color: C.sidebarText, opacity: 0.55 }}>
                    Renews {d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                );
              } catch { return null; }
            })()}

            {/* FREE: upgrade button */}
            {!isPro && studentProfile?.user_id && (
              <UpgradeButton
                userId={studentProfile.user_id}
                userName={getStudentDisplayName(studentProfile)}
                userEmail={studentProfile.email}
                billingCycle="monthly"
                className="w-full justify-center mt-3 text-[12px] py-2"
              />
            )}

            {/* Logout */}
            <button
              onClick={logoutStudent}
              className="w-full flex items-center gap-2.5 mt-3 px-3.5 py-2.5 rounded-xl border-none cursor-pointer transition-all text-left"
              style={{
                background: "transparent",
                color: C.sidebarText,
                fontSize: 13,
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(232,99,90,0.12)";
                e.currentTarget.style.color = "#E8635A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = C.sidebarText;
              }}
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {!isOpen && !isMobile && (
        <div className="flex flex-col items-center h-full" style={{ padding: "16px 8px" }}>
          {/* Expand button */}
          <button
            onClick={onOpen}
            className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all mb-7"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: C.sidebarText,
              fontSize: 16,
            }}
            title="Open sidebar"
          >
            <Menu size={16} strokeWidth={1.75} />
          </button>

          {/* Nav icons */}
          <nav className="flex flex-col gap-1 items-center">
            {navItems.map((item) => {
              const active = activeNav === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.path)}
                  title={item.label}
                  className="flex items-center justify-center rounded-xl border-none cursor-pointer transition-all"
                  style={{
                    width: 44,
                    height: 44,
                    background: active ? "rgba(255,255,255,0.1)" : "transparent",
                    color: active ? C.sidebarActive : C.sidebarText,
                    fontSize: 18,
                  }}
                >
                  {item.icon}
                </button>
              );
            })}
          </nav>

          {/* Avatar + logout */}
          <div className="mt-auto flex flex-col items-center gap-2 pt-3.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => navigate("/student/profile")}
              title={getStudentDisplayName(studentProfile)}
              className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border-none cursor-pointer p-0"
              style={{ border: "1.5px solid rgba(255,255,255,0.12)" }}
            >
              {avatarId === "graduate-girl" ? (
                <img
                  src="/avatars/girl-graduate.png"
                  alt="Student avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <StudentAvatarIllustration bg={C.sun} />
              )}
            </button>
            <button
              onClick={logoutStudent}
              title="Logout"
              className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all"
              style={{ background: "transparent", color: C.sidebarText }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(232,99,90,0.12)";
                e.currentTarget.style.color = "#E8635A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = C.sidebarText;
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      )}
      </aside>
    </>
  );
});

StudentHomeSidebar.displayName = "StudentHomeSidebar";
