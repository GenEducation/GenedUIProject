"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { ParentHome } from "@/features/parent/components/ParentHome";

/**
 * Catch-all page for the entire Parent portal.
 * All sub-routes (/parent, /parent/profile, /parent/[studentId]/analytics, etc.)
 * render through ParentHome, which uses usePathname() to determine the active view.
 * This prevents the sidebar from remounting on internal navigation.
 */
export default function ParentCatchAllPage() {
  return (
    <AuthGuard requiredRole="parent">
      <ParentHome />
    </AuthGuard>
  );
}
