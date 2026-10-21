/**
 * Every Parent portal URL (/parent, /parent/settings, /parent/:id/report…)
 * matches here so the route exists, but the portal itself is rendered by
 * ../layout.tsx, which stays mounted across navigations. See there for why.
 */
export default function ParentCatchAllPage() {
  return null;
}
