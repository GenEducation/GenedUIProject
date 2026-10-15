"use client";

import { Menu } from "lucide-react";
import { useSidebarStore } from "@/features/student/store/useSidebarStore";

/** Floating hamburger shown when the student sidebar is collapsed on a phone,
 * where the collapsed sidebar is hidden entirely. Renders nothing while the
 * sidebar is open, or from 768px up, where the collapsed sidebar is an icon
 * rail with its own menu button (this one would sit on top of it).
 * Standardized at top-6/left-4, 40x40. */
export function SidebarToggle() {
  const { sidebarOpen, setSidebarOpen } = useSidebarStore();
  if (sidebarOpen) return null;

  return (
    <button aria-label="Open sidebar"
      onClick={() => setSidebarOpen(true)}
      className="fixed top-6 left-4 z-30 flex items-center md:hidden justify-center rounded-[10px] cursor-pointer text-base transition-all"
      style={{ width: 40, height: 40, background: "#FFFFFF", border: "1px solid #E3E8E2", color: "var(--primary-ink)" }}
      title="Open sidebar"
    >
      <Menu size={18} strokeWidth={1.75} />
    </button>
  );
}
