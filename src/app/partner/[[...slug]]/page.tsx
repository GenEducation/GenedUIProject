"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { PartnerAdmin } from "@/features/partner/components/PartnerAdmin";

/**
 * Catch-all page for the entire Partner portal.
 * All sub-routes (/partner, /partner/curriculum) render through PartnerAdmin,
 * which uses usePathname() to determine the active view.
 * This prevents the sidebar from remounting on internal navigation.
 */
export default function PartnerCatchAllPage() {
  return (
    <AuthGuard requiredRole="partner">
      <PartnerAdmin />
    </AuthGuard>
  );
}
