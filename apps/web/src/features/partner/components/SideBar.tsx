"use client";

import React from "react";
import { BookOpen, BarChart2, LogOut } from "lucide-react";
import { motion } from "framer-motion";

interface SideBarProps {
  activeView: "subjects" | "analytics";
  onViewChange: (view: "subjects" | "analytics") => void;
}

import { usePartnerStore } from "../store/usePartnerStore";

export function SideBar({ activeView, onViewChange }: SideBarProps) {
  const numberOfPendingRequests = usePartnerStore((state) => state.numberOfPendingRequests);
  const logoutPartner = usePartnerStore((state) => state.logoutPartner);

  const navItems: { id: "subjects" | "analytics"; label: string; icon: any; badge?: number | null }[] = [
    { id: "subjects", label: "Subjects", icon: BookOpen },
    { id: "analytics", label: "Analytics", icon: BarChart2, badge: numberOfPendingRequests > 0 ? numberOfPendingRequests : null },
  ];

  return (
    <aside className="w-20 lg:w-64 h-screen bg-[#F8F9F8] flex flex-col p-4 lg:p-6 border-r border-gray-100 transition-all duration-300 overflow-hidden">
      {/* Logo & Workspace Info */}
      <div className="mb-12 flex flex-col gap-5">
        <div className="w-full h-12 lg:h-16 flex items-center justify-center lg:justify-start overflow-hidden">
          {/* Favicon for Mobile/Tablet */}
          <div className="block lg:hidden w-10 h-10 rounded-xl overflow-hidden shadow-sm">
            <img src="/Favicon1.jpg" alt="GenEdu Icon" className="w-full h-full object-cover" />
          </div>
          {/* Full Logo for Desktop */}
          <img src="/Logo.svg" alt="GenEdu Logo" className="hidden lg:block h-full object-contain" />
        </div>
        <div className="hidden lg:block">
          <h1 className="text-[#1A3D2C] text-sm font-black uppercase tracking-widest leading-none">
            Partner Portal
          </h1>
          <p className="text-[#1A3D2C]/40 text-[10px] font-bold uppercase tracking-tighter mt-1">
            Deep Work Mode
          </p>
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
                  ? "bg-white text-[#1A3D2C] shadow-[0_4px_20px_rgba(0,0,0,0.04)]" 
                  : "text-[#1A3D2C]/40 hover:text-[#1A3D2C] hover:bg-white/50"}
              `}
            >
              <div className={`
                p-2 rounded-xl transition-colors shrink-0
                ${isActive ? "bg-[#1A3D2C] text-white" : "bg-transparent group-hover:bg-[#1A3D2C]/5"}
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

      {/* Logout */}
      <button 
        onClick={logoutPartner}
        className="flex items-center gap-4 p-2 lg:px-4 lg:py-3 text-[#1A3D2C]/40 hover:text-red-500 transition-colors mt-auto group justify-center lg:justify-start"
      >
        <div className="p-2 rounded-xl group-hover:bg-red-50/50 shrink-0">
          <LogOut size={18} />
        </div>
        <span className="hidden lg:block text-xs font-bold uppercase tracking-widest truncate">
          Logout
        </span>
      </button>
    </aside>
  );
}
