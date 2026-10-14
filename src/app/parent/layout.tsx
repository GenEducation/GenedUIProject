"use client";

import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ParentHome } from "@/features/parent/components/ParentHome";

/**
 * The whole Parent portal lives in this layout, not in the catch-all page.
 *
 * Next.js remounts a page whenever its dynamic segment changes, and every
 * portal URL (/parent/:id, /parent/:id/report, /parent/settings…) is a
 * different value of the same [[...slug]]. As a page, each sidebar click
 * remounted the portal: the guard restarted the full-screen loader, and the
 * portal briefly rendered the previous view, sometimes sticking on it.
 * Layouts persist across navigations, so the portal mounts once and
 * ParentHome reads the URL to pick the view.
 */
export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense>
        <AuthGuard requiredRole="parent">
          <ParentHome />
        </AuthGuard>
      </Suspense>
      {children}
    </>
  );
}
