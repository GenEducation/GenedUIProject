import { listSourceIngestions, type SourceIngestion } from "./adminService";

/**
 * Server maximum for `limit` on the new backend's `GET /admin/ingestions`.
 * The same shape of trap the Users screen hit: the MVP's list was unpaginated,
 * so asking for everything at once used to work.
 */
const PAGE_SIZE = 200;

/**
 * Guardrail, not an expected limit. The table filters and searches client-side
 * off one snapshot, so it wants the whole list — but a silently truncated table
 * is worse than a visible warning.
 */
export const INGESTIONS_FETCH_CAP = 2000;

export interface IngestionsSnapshot {
  sources: SourceIngestion[];
  /** Unpaged count reported by the server. */
  total: number;
  /** True when `total` exceeded the cap, so `sources` is incomplete. */
  truncated: boolean;
}

/**
 * Page through `GET /admin/ingestions` until every source is in hand.
 *
 * The single place that knows this list is paginated, mirroring
 * `fetchAllUsers.ts`.
 */
export async function fetchAllIngestions(): Promise<IngestionsSnapshot> {
  const sources: SourceIngestion[] = [];
  let total = 0;

  for (;;) {
    const page = await listSourceIngestions({ limit: PAGE_SIZE, offset: sources.length });
    total = page.total_count ?? 0;
    sources.push(...page.items);

    // Stop on a short page too: without it, a server reporting a `total_count`
    // larger than it can actually return would loop forever.
    if (page.items.length === 0 || page.items.length < PAGE_SIZE) break;
    if (sources.length >= total) break;
    if (sources.length >= INGESTIONS_FETCH_CAP) break;
  }

  return { sources, total, truncated: total > sources.length };
}
