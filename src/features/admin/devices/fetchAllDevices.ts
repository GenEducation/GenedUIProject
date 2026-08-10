import { listFleetDevices } from "../adminService";
import type { AdminDeviceListItem, DeviceQuery } from "./types";

/** Server maximum (spec §6.7). Asking for more is rejected. */
const PAGE_SIZE = 200;

/**
 * Guardrail, not an expected limit. The console holds the whole fleet in memory
 * so the table, filters and charts can all work client-side off one snapshot —
 * see the fetch-strategy note in the plan. If a fleet ever grows past this we
 * want a visible banner, not a silently truncated device list.
 */
export const FLEET_FETCH_CAP = 2000;

export interface FleetSnapshot {
  devices: AdminDeviceListItem[];
  /** Unpaged match count reported by the server. */
  total: number;
  /** True when `total` exceeded the cap and `devices` is therefore incomplete. */
  truncated: boolean;
}

/**
 * Page through `GET /admin/lab/devices` until the whole fleet is in hand.
 *
 * This is the single place that knows the fleet is paginated. Switching to
 * server-driven paging later means changing this function and adding a toolbar —
 * the table and charts consume a plain array and stay untouched.
 */
export async function fetchAllDevices(query: DeviceQuery = {}): Promise<FleetSnapshot> {
  const devices: AdminDeviceListItem[] = [];
  let page = 1;
  let total = 0;

  for (;;) {
    const res = await listFleetDevices({ ...query, page, page_size: PAGE_SIZE });
    total = res.total ?? 0;
    devices.push(...res.items);

    // Stop on a short page too: without it, a server that reports a `total`
    // larger than it can actually return would loop forever.
    if (res.items.length === 0 || res.items.length < PAGE_SIZE) break;
    if (devices.length >= total) break;
    if (devices.length >= FLEET_FETCH_CAP) break;

    page += 1;
  }

  return { devices, total, truncated: total > devices.length };
}
