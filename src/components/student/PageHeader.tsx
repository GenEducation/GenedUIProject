"use client";

import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  /** Lucide icon node rendered inside the small tinted chip next to the title. */
  icon: React.ReactNode;
  title: string;
  /** Omit to render without a back button. */
  onBack?: () => void;
  /** Whether the app sidebar is currently open. When false, the header gains
   * left padding so its content clears the floating hamburger button that
   * appears in its place. Defaults to true (no extra padding). */
  sidebarOpen?: boolean;
  /** Optional right-aligned slot (e.g. a filter button). */
  actions?: React.ReactNode;
}

export function PageHeader({ icon, title, onBack, sidebarOpen = true, actions }: PageHeaderProps) {
  return (
    <header
      className={`px-4 sm:px-8 py-6 flex items-center gap-3 sm:gap-6 bg-white border-b border-[var(--primary-ink)]/5 sticky top-0 z-20 transition-all ${!sidebarOpen ? "pl-16 sm:pl-8" : ""}`}
    >
      {onBack && (
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-[var(--primary-ink)]/5 text-[var(--primary-ink)] flex items-center justify-center hover:bg-[var(--primary-ink)]/10 transition-all flex-shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      <div className="space-y-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[var(--primary-ink)]/5 flex items-center justify-center text-[var(--primary-ink)] flex-shrink-0">
            {icon}
          </div>
          <h1 className="text-xl font-black text-[var(--primary-ink)] tracking-tight truncate">{title}</h1>
        </div>
      </div>
      {actions}
    </header>
  );
}
