import { listUsers, type AdminUser, type ListUsersQuery } from "./adminService";

/**
 * Server maximum for `page_size` on `GET /admin/users`. The MVP tolerated far
 * larger values; the new backend rejects them with a 422, which reached the
 * console as an error banner and an empty table.
 */
const PAGE_SIZE = 200;

/**
 * Guardrail, not an expected limit. `UsersView` filters and searches every
 * column client-side off one snapshot, so it wants the whole list — but a
 * silently truncated user table is worse than a visible warning.
 */
export const USERS_FETCH_CAP = 5000;

export interface UsersSnapshot {
  users: AdminUser[];
  /** Unpaged match count reported by the server. */
  total: number;
  /** True when `total` exceeded the cap, so `users` is incomplete. */
  truncated: boolean;
}

/**
 * Page through `GET /admin/users` until every matching user is in hand.
 *
 * The single place that knows this list is paginated, mirroring
 * `devices/fetchAllDevices.ts`. Asking for one huge page instead worked only
 * because the MVP did not enforce its own cap.
 */
export async function fetchAllUsers(query: ListUsersQuery = {}): Promise<UsersSnapshot> {
  const users: AdminUser[] = [];
  let page = 1;
  let total = 0;

  for (;;) {
    const res = await listUsers({ ...query, page, pageSize: PAGE_SIZE });
    total = res.total ?? 0;
    users.push(...res.items);

    // Stop on a short page too: without it, a server reporting a `total`
    // larger than it can actually return would loop forever.
    if (res.items.length === 0 || res.items.length < PAGE_SIZE) break;
    if (users.length >= total) break;
    if (users.length >= USERS_FETCH_CAP) break;
    page += 1;
  }

  return { users, total, truncated: total > users.length };
}
