"use client";

import { Menu } from "lucide-react";
import { useSidebarStore } from "@/features/student/store/useSidebarStore";

/** Floating hamburger shown when the student sidebar is collapsed. Renders
 * nothing while the sidebar is open. Standardized at top-6/left-4, 40x40 —
 * the size/position two of its three former call sites already used. */
export function SidebarToggle() {
  const { sidebarOpen, setSidebarOpen } = useSidebarStore();
  if (sidebarOpen) return null;

  return (
    <button aria-label="Open sidebar"
      onClick={() => setSidebarOpen(true)}
      className="fixed top-6 left-4 z-30 flex items-center justify-center rounded-[10px] cursor-pointer text-base transition-all"
      style={{ width: 40, height: 40, background: "#FFFFFF", border: "1px solid #E2E8F0", color: "var(--primary-ink)" }}
      title="Open sidebar"
    >
      <Menu size={18} strokeWidth={1.75} />
    </button>
  );
}
