"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  GraduationCap,
  Contact,
  Link2,
  Bot,
  FileStack,
  LogOut,
  ShieldCheck,
  Presentation,
  UsersRound,
  AudioLines,
} from "lucide-react";

import { StatsOverview } from "./StatsOverview";
import { UsersView } from "./UsersView";
import { StudentsView } from "./StudentsView";
import { ParentsView } from "./ParentsView";
import { PartnersView } from "./PartnersView";
import { TeachersView } from "./TeachersView";
import { EnrollmentsView } from "./EnrollmentsView";
import { AssignmentsView } from "./AssignmentsView";
import { AgentsView } from "./AgentsView";
import { IngestionsView } from "./IngestionsView";
import { WakeWordModelsView } from "./WakeWordModelsView";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const NAV: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Students", href: "/admin/students", icon: GraduationCap },
  { label: "Parents", href: "/admin/parents", icon: Contact },
  { label: "Partners", href: "/admin/partners", icon: Building2 },
  { label: "Teachers", href: "/admin/teachers", icon: Presentation },
  { label: "Enrollments", href: "/admin/enrollments", icon: Link2 },
  { label: "Assignments", href: "/admin/assignments", icon: UsersRound },
  { label: "Agents", href: "/admin/agents", icon: Bot },
  { label: "Ingestions", href: "/admin/ingestions", icon: FileStack },
  { label: "Wake-word Models", href: "/admin/wakeword-models", icon: AudioLines },
];

export function AdminDashboard() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("gened_auth_token");
    localStorage.removeItem("gened_user_profile");
    localStorage.removeItem("gened_user_role");
    router.replace("/admin/login");
  };

  const renderView = () => {
    switch (pathname) {
      case "/admin":
        return <StatsOverview />;
      case "/admin/users":
        return <UsersView />;
      case "/admin/students":
        return <StudentsView />;
      case "/admin/parents":
        return <ParentsView />;
      case "/admin/partners":
        return <PartnersView />;
      case "/admin/teachers":
        return <TeachersView />;
      case "/admin/enrollments":
        return <EnrollmentsView />;
      case "/admin/assignments":
        return <AssignmentsView />;
      case "/admin/agents":
        return <AgentsView />;
      case "/admin/ingestions":
        return <IngestionsView />;
      case "/admin/wakeword-models":
        return <WakeWordModelsView />;
      default:
        return <StatsOverview />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0E1F2B] text-white">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 shrink-0 border-r border-white/10 bg-white/[0.02] flex flex-col transition-all duration-300">
        <div className="flex items-center justify-center lg:justify-start gap-2.5 px-3 lg:px-6 h-16 border-b border-white/10">
          <ShieldCheck className="h-6 w-6 text-[#059F6D] shrink-0" />
          <span className="hidden lg:inline font-bold tracking-tight">GenEd Admin</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                title={item.label}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center justify-center lg:justify-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#059F6D]/15 text-[#059F6D]"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span className="hidden lg:block truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          title="Sign out"
          className="m-3 flex items-center justify-center lg:justify-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/55 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
        >
          <LogOut size={18} className="shrink-0" />
          <span className="hidden lg:block">Sign out</span>
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{renderView()}</div>
      </main>
    </div>
  );
}
