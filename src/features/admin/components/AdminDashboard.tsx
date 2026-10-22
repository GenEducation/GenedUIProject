"use client";

import { useCallback, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import * as Sentry from "@sentry/nextjs";

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
import { isMaintenanceRoute } from "../maintenance";
import { MaintenanceModal, MaintenancePanel } from "./MaintenanceNotice";
import { AdminSidebar } from "./shell/AdminSidebar";
import { AdminTopBar } from "./shell/AdminTopBar";
import { MobileNavDrawer } from "./shell/MobileNavDrawer";

/** Display name for the shell, from the profile the login page stored. */
function readAdminName(): string {
  if (typeof window === "undefined") return "Admin";
  try {
    const raw = localStorage.getItem("gened_user_profile");
    const parsed = raw ? (JSON.parse(raw) as { username?: string; full_name?: string }) : null;
    return parsed?.full_name || parsed?.username || "Admin";
  } catch {
    return "Admin";
  }
}

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

  // Same trick for the phone drawer: it is open only on the screen it was
  // opened from, so following a link inside it closes it with no effect.
  const [menuOpenedAt, setMenuOpenedAt] = useState<string | null>(null);
  const menuOpen = menuOpenedAt === pathname;
  const closeMenu = useCallback(() => setMenuOpenedAt(null), []);

  const [adminName] = useState(readAdminName);

  const openGated = useCallback(
    (label: string) => {
      setMenuOpenedAt(null);
      setMaintenanceFor({ label, atPath: pathname });
    },
    [pathname],
  );

  const handleLogout = () => {
    Sentry.setUser(null);
    localStorage.removeItem("gened_auth_token");
    localStorage.removeItem("gened_user_profile");
    localStorage.removeItem("gened_user_role");
    router.replace("/admin/login");
  };

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

  const sidebarProps = {
    pathname,
    onGated: openGated,
    onLogout: handleLogout,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-ink">
      {/* md–lg: icon rail; lg+: full sidebar; below md it lives in the drawer. */}
      <aside className="hidden w-20 shrink-0 border-r border-border bg-paper transition-[width] duration-300 md:block lg:w-[280px]">
        <AdminSidebar {...sidebarProps} mode="rail" />
      </aside>

      <MobileNavDrawer open={menuOpen} onClose={closeMenu}>
        <AdminSidebar {...sidebarProps} mode="full" onNavigate={closeMenu} />
      </MobileNavDrawer>

      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        <AdminTopBar
          pathname={pathname}
          adminName={adminName}
          onOpenMenu={() => setMenuOpenedAt(pathname)}
        />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-10"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
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
