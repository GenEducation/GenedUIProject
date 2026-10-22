import {
  LayoutDashboard,
  Users,
  Building2,
  GraduationCap,
  Contact,
  Link2,
  Bot,
  FileStack,
  Presentation,
  UsersRound,
  AudioLines,
  MonitorSmartphone,
  Activity,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * The console's map, grouped by what an admin comes to do: read the numbers,
 * look someone up, sort out who is linked to whom, or check the hardware.
 *
 * The sidebar, the top bar's breadcrumb and every page header's eyebrow read
 * this one list, so a screen can never be filed under two groups.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Insights",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Learning Signal", href: "/admin/analytics", icon: Activity },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Students", href: "/admin/students", icon: GraduationCap },
      { label: "Parents", href: "/admin/parents", icon: Contact },
      { label: "Teachers", href: "/admin/teachers", icon: Presentation },
      { label: "Partners", href: "/admin/partners", icon: Building2 },
    ],
  },
  {
    label: "Learning",
    items: [
      { label: "Enrollments", href: "/admin/enrollments", icon: Link2 },
      { label: "Assignments", href: "/admin/assignments", icon: UsersRound },
      { label: "Ingestions", href: "/admin/ingestions", icon: FileStack },
    ],
  },
  {
    label: "Hardware",
    items: [
      { label: "Devices", href: "/admin/devices", icon: MonitorSmartphone },
      { label: "Agents", href: "/admin/agents", icon: Bot },
      { label: "Wake-word Models", href: "/admin/wakeword-models", icon: AudioLines },
    ],
  },
];

export function isActiveHref(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
}

/** The group and item a path belongs to; unknown admin paths fall back to Overview, like the view switch. */
export function sectionFor(pathname: string | null | undefined): { group: NavGroup; item: NavItem } {
  const path = pathname ?? "/admin";
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (isActiveHref(path, item.href)) return { group, item };
    }
  }
  return { group: NAV_GROUPS[0], item: NAV_GROUPS[0].items[0] };
}
