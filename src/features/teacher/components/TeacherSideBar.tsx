"use client";

import { Users, MonitorSmartphone, LogOut } from "lucide-react";
import type { TeacherProfile } from "../store/useTeacherStore";

type TeacherView = "roster" | "chats" | "analytics" | "lab";

interface TeacherSideBarProps {
  activeView: TeacherView;
  onViewChange: (view: "roster" | "lab") => void;
  onLogout: () => void;
  teacherProfile: TeacherProfile | null;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TeacherSideBar({ activeView, onViewChange, onLogout, teacherProfile }: TeacherSideBarProps) {
  const isMyClassActive = activeView === "roster" || activeView === "chats" || activeView === "analytics";
  const isLabActive = activeView === "lab";

  const navItems: { id: "roster" | "lab"; label: string; icon: typeof Users; isActive: boolean }[] = [
    { id: "roster", label: "My Class", icon: Users, isActive: isMyClassActive },
    { id: "lab", label: "Lab Mode", icon: MonitorSmartphone, isActive: isLabActive },
  ];

  const name = teacherProfile?.full_name || teacherProfile?.username || "Teacher";

  return (
    <aside className="flex h-screen w-20 shrink-0 flex-col border-r border-border bg-paper p-4 transition-all duration-300 lg:w-64 lg:p-6">
      {/* Logo & identity */}
      <div className="mb-10 flex flex-col gap-5">
        <div className="flex h-12 w-full items-center justify-center overflow-hidden lg:h-14 lg:justify-start">
          <div className="block h-10 w-10 overflow-hidden rounded-xl shadow-sm lg:hidden">
            <img src="/Favicon1.jpg" alt="GenEd" className="h-full w-full object-cover" />
          </div>
          <img src="/Logo.svg" alt="GenEd" className="hidden h-full object-contain lg:block" />
        </div>
        <div className="hidden lg:block">
          <p className="text-[10px] font-bold uppercase leading-none tracking-widest text-ink/40">Teacher Portal</p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-[0_1px_2px_rgba(4,46,92,.06)] lg:p-3">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-[#042E5C] to-[#073e75] font-serif text-sm font-bold text-white">
            {initials(name)}
          </div>
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-[13px] font-bold text-ink">{name}</p>
            <p className="truncate text-[10.5px] text-muted">
              {[teacherProfile?.title, teacherProfile?.role].filter(Boolean).join(" · ") || "Teacher"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`group relative flex items-center justify-center gap-3.5 rounded-2xl p-2.5 transition-all duration-200 lg:justify-start lg:px-3.5 lg:py-3 ${
                item.isActive
                  ? "bg-white text-ink shadow-[0_4px_20px_rgba(4,46,92,.08)]"
                  : "text-muted hover:bg-white/60 hover:text-ink"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  item.isActive ? "bg-emerald text-white" : "bg-transparent group-hover:bg-ink/5"
                }`}
              >
                <Icon size={16} />
              </div>
              <span className="hidden truncate text-[12.5px] font-bold uppercase tracking-wide lg:block">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="mt-auto pt-4">
        <button
          onClick={onLogout}
          className="group flex w-full items-center justify-center gap-3.5 rounded-2xl p-2.5 text-muted transition-colors hover:text-danger lg:justify-start lg:px-3.5 lg:py-3"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl group-hover:bg-danger-bg">
            <LogOut size={16} />
          </div>
          <span className="hidden truncate text-[12.5px] font-bold uppercase tracking-wide lg:block">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
