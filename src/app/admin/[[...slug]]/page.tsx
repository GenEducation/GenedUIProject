"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AdminDashboard } from "@/features/admin/components/AdminDashboard";

/**
 * Catch-all page for the admin console. All sub-routes (/admin, /admin/users,
 * /admin/enrollments, …) render through AdminDashboard, which switches the
 * active view by usePathname() so the sidebar doesn't remount on navigation.
 *
 * Note: /admin/login resolves to the dedicated login page (a more specific
 * static segment wins over this optional catch-all).
 */
export default function AdminCatchAllPage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminDashboard />
    </AuthGuard>
  );
}
