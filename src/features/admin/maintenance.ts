/**
 * Admin screens that are temporarily out of service.
 *
 * The device fleet, the wake-word models and the old agent catalogue are not
 * being migrated to the new backend. Rather than leave them pointing at
 * routes nobody is maintaining, their nav entries stay visible but open a
 * notice instead of navigating, and the screens themselves are unreachable —
 * including by typed URL, by browser history, and by the in-app pushes that
 * `DevicesView` and `FleetTable` make into the device detail route.
 *
 * This module is the ONLY place that list lives. `AdminDashboard` reads it
 * twice — once for the sidebar and once for the view switch — and a test
 * asserts the two agree, so a route can never be gated in one and live in the
 * other.
 */

export const MAINTENANCE_ROUTES = [
  "/admin/devices",
  "/admin/agents",
  "/admin/wakeword-models",
] as const;

export type MaintenanceRoute = (typeof MAINTENANCE_ROUTES)[number];

export const MAINTENANCE_COPY = {
  title: "Under maintenance",
  body:
    "This screen is temporarily unavailable while the admin console moves to the new backend. " +
    "Nothing has been lost — the data is still there, and the screen will come back once the move is done.",
} as const;

/**
 * Is this path one of the gated screens, or something underneath one?
 *
 * Segment-aware on purpose: `/admin/devices/DEV-1` is the device detail route
 * and must be gated with its parent, while `/admin/devices-archive` — should
 * anyone ever add it — is a different screen and must not be. A bare
 * `startsWith` would get the second one wrong.
 */
export function isMaintenanceRoute(pathname: string): boolean {
  return MAINTENANCE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
