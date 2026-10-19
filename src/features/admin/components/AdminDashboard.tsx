"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
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
  MonitorSmartphone,
  Activity,
} from "lucide-react";

import { StatsOverview } from "./StatsOverview";
import { LearningSignalView } from "./analytics/LearningSignalView";
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
import { DevicesView } from "./DevicesView";
import { DeviceDetailView } from "./DeviceDetailView";
import { MAINTENANCE_COPY, isMaintenanceRoute } from "../maintenance";
import { MaintenanceModal, MaintenancePanel } from "./MaintenanceNotice";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const NAV: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Learning Signal", href: "/admin/analytics", icon: Activity },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Students", href: "/admin/students", icon: GraduationCap },
  { label: "Parents", href: "/admin/parents", icon: Contact },
  { label: "Partners", href: "/admin/partners", icon: Building2 },
  { label: "Devices", href: "/admin/devices", icon: MonitorSmartphone },
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

  // The gated nav entry whose notice is open, remembered together with the
  // screen it was opened from. Deriving `open` from that pairing rather than
  // clearing it in an effect means a browser Back closes the dialog for free:
  // the pathname no longer matches, so it simply stops being open.
  const [maintenanceFor, setMaintenanceFor] = useState<{
    label: string;
    atPath: string;
  } | null>(null);
  const maintenanceOpen = maintenanceFor?.atPath === pathname;

  const handleLogout = () => {
    Sentry.setUser(null);
    localStorage.removeItem("gened_auth_token");
    localStorage.removeItem("gened_user_profile");
    localStorage.removeItem("gened_user_role");
    router.replace("/admin/login");
  };

  // Learning Signal is a dense, chart-heavy dashboard designed to use the
  // full width of the content area; every other view is a form/table console
  // that reads better capped and centered. Rather than have each view fight
  // its parent's width, the parent defers to the view.
  const isFullBleed = pathname === "/admin/analytics";

  const renderView = () => {
    // FIRST, above everything. A gated screen must not mount, and that
    // includes the nested device detail route below — which would otherwise
    // fire its device calls at a backend we are deliberately leaving alone.
    // This one check also covers typed URLs, browser history, and every
    // in-app router.push into a gated route, so those call sites need no
    // edits and the gate lifts by deleting these two lines.
    if (isMaintenanceRoute(pathname)) {
      return <MaintenancePanel onBack={() => router.push("/admin")} />;
    }

    // Nested detail routes have to be matched before the exact-match switch,
    // which would otherwise drop them through to the default.
    if (pathname.startsWith("/admin/devices/")) {
      return <DeviceDetailView deviceId={decodeURIComponent(pathname.split("/")[3] ?? "")} />;
    }

    switch (pathname) {
      case "/admin":
        return <StatsOverview />;
      case "/admin/analytics":
        return <LearningSignalView />;
      case "/admin/users":
        return <UsersView />;
      case "/admin/students":
        return <StudentsView />;
      case "/admin/parents":
        return <ParentsView />;
      case "/admin/partners":
        return <PartnersView />;
      case "/admin/devices":
        return <DevicesView />;
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
    <div className="flex h-screen overflow-hidden bg-[#122D30] text-white">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 shrink-0 border-r border-white/10 bg-white/[0.02] flex flex-col transition-all duration-300">
        <div className="flex items-center justify-center lg:justify-start gap-2.5 px-3 lg:px-6 h-16 border-b border-white/10">
          <ShieldCheck className="h-6 w-6 text-[#075E63] shrink-0" />
          <span className="hidden lg:inline font-bold tracking-tight">GenEd Admin</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            // Derived, never a field on NAV — a second list would be free to
            // disagree with the one the view switch reads.
            const gated = isMaintenanceRoute(item.href);
            const Icon = item.icon;
            return (
              <button aria-label={item.label}
                key={item.href}
                onClick={
                  gated
                    ? () => setMaintenanceFor({ label: item.label, atPath: pathname })
                    : () => router.push(item.href)
                }
                // aria-disabled, not disabled: a disabled button fires no
                // click, and the whole point is that clicking explains itself.
                aria-disabled={gated || undefined}
                title={gated ? `${item.label} — ${MAINTENANCE_COPY.title}` : item.label}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center justify-center lg:justify-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#075E63]/15 text-[#075E63]"
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
        <div
          className={
            isFullBleed
              ? "min-h-full"
              : "mx-auto max-w-6xl px-8 py-8"
          }
        >
          {renderView()}
        </div>
      </main>

      {/* Rendered unconditionally with `open`, not behind `{state && …}`:
          Modal lives inside AnimatePresence, which needs the element to stay
          mounted to run its exit animation. */}
      <MaintenanceModal
        open={maintenanceOpen}
        screenLabel={maintenanceFor?.label ?? null}
        onClose={() => setMaintenanceFor(null)}
      />
    </div>
  );
}
