"use client";

import React from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useStudentStore } from "../store/useStudentStore";
import { LogOut } from "lucide-react";

/* ═══ TOKENS (from design) ═══ */
const C = {
  genPurple: "#5B4DC7",
  genBlue: "#4A90D9",
  edGreen: "#2D6A4F",
  sparkle: "#8B7FE8",
  sidebarBg: "#1C2333",
  sidebarText: "#c8d1dc",
  sidebarActive: "#FFFFFF",
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
        fontFamily: "'DM Sans', sans-serif",
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
}

export const StudentHomeSidebar = React.memo(function StudentHomeSidebar({
  isOpen,
  onClose,
}: StudentHomeSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { studentProfile, logoutStudent } = useStudentStore();

  const getActiveNav = () => {
    if (pathname === "/student" || pathname === "/student/") return "home";
    if (pathname?.startsWith("/student/analytics")) return "progress";
    if (pathname?.startsWith("/student/assessments")) return "practice";
    if (pathname?.startsWith("/student/report-card")) return "report";
    if (pathname?.startsWith("/student/profile")) return "me";
    return "home";
  };

  const activeNav = getActiveNav();

  const navigate = (path: string) => {
    if (path === "/student") {
      window.location.href = path;
    } else {
      router.push(path);
    }
    if (window.innerWidth < 1024) onClose();
  };

  const sidebarW = isOpen ? 260 : 0;

  return (
    <aside
      className="h-full flex-shrink-0 flex flex-col overflow-hidden sidebar-transition"
      style={{
        width: sidebarW,
        minWidth: sidebarW,
        background: C.sidebarBg,
      }}
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
              ☰
            </button>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-1">
            <NavItem icon="🏠" label="Home" active={activeNav === "home"} onClick={() => navigate("/student")} />
            <NavItem icon="🎯" label="Practice" active={activeNav === "practice"} onClick={() => navigate("/student/assessments")} />
            <NavItem icon="📋" label="Report Card" active={activeNav === "report"} onClick={() => navigate("/student/report-card")} />
            <NavItem icon="😊" label="Me" active={activeNav === "me"} onClick={() => navigate("/student/profile")} />
          </nav>

          {/* Student info */}
          <div className="mt-auto pt-3.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2.5 px-1">
              <div
                className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-sm font-bold"
                style={{
                  background: `linear-gradient(135deg, ${C.genPurple}30, ${C.genBlue}30)`,
                  color: C.sparkle,
                }}
              >
                {(studentProfile?.name || studentProfile?.username || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate" style={{ color: C.sidebarActive }}>
                  {studentProfile?.name || studentProfile?.username || "Student"}
                </div>
                <div className="text-[10px]" style={{ color: C.sidebarText, opacity: 0.6 }}>
                  Grade {studentProfile?.grade ?? "—"} · {studentProfile?.school_board ?? "CBSE"}
                </div>
              </div>
            </div>

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
    </aside>
  );
});

StudentHomeSidebar.displayName = "StudentHomeSidebar";
