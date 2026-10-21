"use client";

import { FEATURES } from "@/constants/features";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStudentStore } from "../store/useStudentStore";
import { getStudentDisplayName, titleCase } from "../utils/displayName";
import { STUDENT_COLORS } from "../theme/colors";
import { STRINGS } from "../constants/strings";
import {
  Menu,
  Home as HomeIcon,
  Target,
  CalendarDays,
  FileText,
  User,
  type LucideIcon,
} from "lucide-react";
import { UpgradeButton } from "@/features/billing/UpgradeButton";
import { GenEdLogo } from "@/components/shared/GenEdLogo";

/* ═══ TOKENS ═══ — sourced from STUDENT_COLORS (see theme/colors.ts) */
const C = {
  sidebarBg: STUDENT_COLORS.sidebarLightBg,
  sidebarText: STUDENT_COLORS.sidebarLightText,
  sidebarActive: STUDENT_COLORS.sidebarLightActive,
  sidebarActiveBg: STUDENT_COLORS.sidebarLightActiveBg,
  sidebarBorder: STUDENT_COLORS.sidebarLightBorder,
  sidebarHover: STUDENT_COLORS.sidebarLightHover,
  sidebarName: STUDENT_COLORS.sidebarLightName,
};

/**
 * A nav item's icon: one outline set; the page you're on is filled (a soft tint of its colour inside the outline,
 * which keeps details like the document's lines) and a touch bolder. It takes its colour from the item.
 */
function NavIcon({ icon: Icon, active }: { icon: LucideIcon; active: boolean }) {
  return (
    <Icon
      aria-hidden
      size={18}
      strokeWidth={active ? 2.2 : 1.9}
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.2 : undefined}
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
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="w-full flex items-center gap-3 rounded-2xl border-none cursor-pointer transition-all text-left"
      style={{
        padding: "12px 16px",
        background: active ? C.sidebarActiveBg : "transparent",
        color: active ? C.sidebarActive : C.sidebarText,
        fontSize: 15,
        fontWeight: active ? 700 : 600,
        fontFamily: "var(--font-body)",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = C.sidebarHover;
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <span className="w-[22px] flex items-center justify-center flex-shrink-0">
        <NavIcon icon={icon} active={active} />
      </span>
      <span>{label}</span>
      {active && (
        <div
          className="ml-auto w-1.5 h-1.5 rounded-full"
          style={{ background: C.sidebarActive }}
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
  const { studentProfile } = useStudentStore();

  const plan   = studentProfile?.plan ?? "FREE";
  const isPro  = plan === "PRO";

  const getActiveNav = () => {
    if (pathname === "/student" || pathname === "/student/") return "home";
    if (pathname?.startsWith("/student/practice")) return "practice";
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

  const sidebarW = isOpen ? 264 : RAIL_W;
  const mobileWidth = Math.min(264, 300);

  const navItems = [
    { icon: HomeIcon,     label: STRINGS.nav.home,       key: "home",     path: "/student" },
    ...(FEATURES.practice ? [{ icon: Target,       label: STRINGS.nav.practice,   key: "practice", path: "/student/practice" }] : []),
    ...(FEATURES.schedule ? [{ icon: CalendarDays, label: STRINGS.nav.schedule,   key: "schedule", path: "/student/schedule" }] : []),
    { icon: FileText,    label: STRINGS.nav.reportCard, key: "report",   path: "/student/report-card" },
    { icon: User,         label: STRINGS.nav.profile,    key: "me",       path: "/student/profile" },
  ];

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-30"
          style={{ background: "rgba(18,45,48,0.35)" }}
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
                borderRight: `1px solid ${C.sidebarBorder}`,
                boxShadow: isOpen ? "0 0 32px rgba(18,45,48,0.14)" : "none",
              }
            : {
                width: sidebarW,
                minWidth: sidebarW,
                background: C.sidebarBg,
                borderRight: `1px solid ${C.sidebarBorder}`,
              }
        }
      >
      {isOpen && (
        <div className="flex flex-col h-full" style={{ padding: "18px 14px" }}>
          {/* Header: logo + close */}
          <div className="flex items-center justify-between mb-7 px-0.5 py-1">
            <button aria-label="GenEd home" onClick={() => navigate("/student")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
              <GenEdLogo height={46} priority />
            </button>
            <button aria-label="Close sidebar"
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all"
              style={{
                background: C.sidebarHover,
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

          {/* Upgrade — the sidebar's single call to action. Anchored at the
              bottom, where it is the only thing in the empty space, on a deep
              ocean card so the citron button gets the strongest contrast we
              have. Student name/avatar are already in every page header, so
              they no longer repeat here. Hidden entirely for PRO. */}
          {!isPro && studentProfile?.user_id && (
            <div
              className="mt-auto relative overflow-hidden rounded-2xl"
              style={{
                padding: "16px 14px 14px",
                background: `linear-gradient(160deg, ${STUDENT_COLORS.primary} 0%, #0B474B 100%)`,
                boxShadow: "0 12px 26px -16px rgb(7 94 99 / 0.7)",
              }}
            >
              <div
                aria-hidden
                className="absolute rounded-full pointer-events-none"
                style={{ width: 120, height: 120, right: -44, top: -54, background: "radial-gradient(circle, rgb(217 242 121 / 0.28), transparent 70%)" }}
              />
              <div className="relative text-[15px] font-extrabold text-white leading-tight">Go Pro</div>
              <p className="relative mt-1 mb-3 text-[12.5px] leading-snug" style={{ color: "#A9CCC7" }}>
                Keep learning with {titleCase(studentProfile.ai_name || "Nia")}, no daily limits.
              </p>
              <UpgradeButton
                userId={studentProfile.user_id}
                userName={getStudentDisplayName(studentProfile)}
                userEmail={studentProfile.email}
                billingCycle="monthly"
                className="relative w-full justify-center text-[13px] py-2.5 rounded-xl"
              />
            </div>
          )}
        </div>
      )}

      {!isOpen && !isMobile && (
        <div className="flex flex-col items-center h-full" style={{ padding: "18px 8px" }}>
          {/* Expand button */}
          <button aria-label="Open sidebar"
            onClick={onOpen}
            className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all mb-7"
            style={{
              background: C.sidebarHover,
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
                    background: active ? C.sidebarActiveBg : "transparent",
                    color: active ? C.sidebarActive : C.sidebarText,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = C.sidebarHover;
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <NavIcon icon={item.icon} active={active} />
                </button>
              );
            })}
          </nav>

          {/* Collapsed rail: the same upgrade action as a compact citron spark. */}
          {!isPro && studentProfile?.user_id && (
            <div className="mt-auto" title="Upgrade to Pro">
              <UpgradeButton
                userId={studentProfile.user_id}
                userName={getStudentDisplayName(studentProfile)}
                userEmail={studentProfile.email}
                billingCycle="monthly"
                className="!w-11 !h-11 !px-0 !py-0 justify-center rounded-xl"
              >
                <span className="sr-only">Upgrade to Pro</span>
              </UpgradeButton>
            </div>
          )}
        </div>
      )}
      </aside>
    </>
  );
});

StudentHomeSidebar.displayName = "StudentHomeSidebar";
