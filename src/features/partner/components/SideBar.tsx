"use client";

import React, { useSyncExternalStore } from "react";
import { BookOpen, BarChart2, LogOut, MonitorSmartphone, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface SideBarProps {
  activeView: "subjects" | "analytics" | "labs";
  onViewChange: (view: "subjects" | "analytics" | "labs") => void;
}

import { usePartnerStore } from "../store/usePartnerStore";
import { GenEdLogo } from "@/components/shared/GenEdLogo";
import { FEATURES } from "@/constants/features";

/**
 * The partner's school, from the profile saved at sign-in (`organization` on the
 * auth response). Null on the server, and when the account has no organization,
 * so the header falls back to "Partner Portal".
 */
function readSchoolName(): string | null {
  try {
    const profile = JSON.parse(localStorage.getItem("gened_user_profile") || "{}");
    const organization = typeof profile.organization === "string" ? profile.organization.trim() : "";
    if (!organization) return null;
    // Add "School" when the name doesn't already say it ("GenEd" → "GenEd School",
    // "Delhi Public School" stays as is).
    return /\bschool\b/i.test(organization) ? organization : `${organization} School`;
  } catch {
    return null;
  }
}

const subscribeToStorage = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

function usePartnerSchoolName(): string | null {
  return useSyncExternalStore(subscribeToStorage, readSchoolName, () => null);
}

export function SideBar({ activeView, onViewChange }: SideBarProps) {
  const numberOfPendingRequests = usePartnerStore((state) => state.numberOfPendingRequests);
  const logoutPartner = usePartnerStore((state) => state.logoutPartner);

  const schoolName = usePartnerSchoolName();

  const navItems: { id: "subjects" | "analytics" | "labs"; label: string; icon: LucideIcon; badge?: number | null }[] = [
    { id: "analytics", label: "Analytics", icon: BarChart2, badge: numberOfPendingRequests > 0 ? numberOfPendingRequests : null },
    { id: "subjects", label: "Subjects", icon: BookOpen },
    ...(FEATURES.partnerLabs ? [{ id: "labs" as const, label: "Lab Mode", icon: MonitorSmartphone }] : []),
  ];

  return (
    <aside className="w-20 lg:w-64 h-screen bg-[#F6F7F2] flex flex-col p-4 lg:p-6 border-r border-gray-100 transition-all duration-300">
      {/* Logo & Workspace Info: only beside the full sidebar. The collapsed rail (below lg) has no logo; the top bar
          shows the full one, centred, instead of a mark squeezed into the rail. */}
      <div className="mb-12 hidden lg:flex flex-col gap-5">
        <div className="w-full h-16 flex items-center justify-start overflow-hidden">
          <GenEdLogo height={52} priority />
        </div>
        {/* The logo PNG has ~14/140 of its height as empty space before the "G" (5px at height 52), so indent
            the name by the same amount to line it up with the letters. */}
        <div className="pl-[5px]">
          {schoolName ? (
            <h1
              title={schoolName}
              className="text-[#122D30] text-sm font-black uppercase tracking-widest leading-snug line-clamp-2 break-words"
            >
              {schoolName}
            </h1>
          ) : (
            <h1 className="text-[#122D30] text-sm font-black uppercase tracking-widest leading-none">
              Partner Portal
            </h1>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                flex items-center gap-4 p-2 lg:px-4 lg:py-3 rounded-2xl transition-all duration-300 group justify-center lg:justify-start relative
                ${isActive 
                  ? "bg-white text-[#122D30] shadow-[0_4px_20px_rgba(0,0,0,0.04)]" 
                  : "text-[#122D30]/40 hover:text-[#122D30] hover:bg-white/50"}
              `}
            >
              <div className={`
                p-2 rounded-xl transition-colors shrink-0
                ${isActive ? "bg-[#075E63] text-white" : "bg-transparent group-hover:bg-[#075E63]/5"}
              `}>
                <Icon size={18} />
              </div>
              <span className="hidden lg:block text-xs font-bold uppercase tracking-widest truncate flex-1">
                {item.label}
              </span>
              {item.badge && (
                <span className="absolute top-2 right-2 lg:static bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

      </nav>

      {/* Footer / Logout */}
      <div className="mt-auto pt-4">
        <button 
          onClick={logoutPartner}
          className="w-full flex items-center gap-4 p-2 lg:px-4 lg:py-3 text-[#122D30]/40 hover:text-red-500 transition-colors group justify-center lg:justify-start"
        >
          <div className="p-2 rounded-xl group-hover:bg-red-50/50 shrink-0">
            <LogOut size={18} />
          </div>
          <span className="hidden lg:block text-xs font-bold uppercase tracking-widest truncate">
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}
