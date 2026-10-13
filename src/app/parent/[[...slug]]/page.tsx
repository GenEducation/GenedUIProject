/**
 * Every Parent portal URL (/parent, /parent/profile, /parent/:id/report…)
 * matches here so the route exists, but the portal itself is rendered by
 * ../layout.tsx, which stays mounted across navigations. See there for why.
 */
export default function ParentCatchAllPage() {
  return null;
}
