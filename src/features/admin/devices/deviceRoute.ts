export type DeviceRouteKind = "canonical" | "lab";

export interface ParsedDeviceRoute {
  kind: DeviceRouteKind;
  key: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Parses the raw URL segment after `/admin/devices/` into a route kind and
 * query identifier.
 *
 * Grammar contract:
 * - `serial:<serial>`   -> canonical registry lookup (e.g. standard fleet rows)
 * - `lab:<uuid>`        -> Lab fleet lookup (LEGACY_LAB with no canonical record)
 * - `health:<device_id>`-> canonical lookup (LEGACY_PERSONAL; null -> empty state)
 * - bare UUID           -> Lab fleet lookup (preserves old bookmarks / existing open tabs)
 * - anything else       -> canonical lookup (serials, DEV-XXXX-XXXX, hostnames pasted from tickets)
 */
const MOCK_LAB_ID_REGEX =
  /^dev-(?:online|fault|stale|unknown|offline|attention|revoked)$/;

export function parseDeviceRoute(rawSegment: string): ParsedDeviceRoute {
  const segment = decodeURIComponent(rawSegment || "").trim();

  if (segment.startsWith("serial:")) {
    return { kind: "canonical", key: segment.slice("serial:".length) };
  }
  if (segment.startsWith("lab:")) {
    return { kind: "lab", key: segment.slice("lab:".length) };
  }
  if (segment.startsWith("health:")) {
    return { kind: "canonical", key: segment.slice("health:".length) };
  }
  if (UUID_REGEX.test(segment) || MOCK_LAB_ID_REGEX.test(segment)) {
    return { kind: "lab", key: segment };
  }
  return { kind: "canonical", key: segment };
}

/**
 * Generates the detail page URL for a fleet table row.
 * Every row carries a server-minted `fleet_key`.
 */
export function deviceHref(row: { fleet_key: string }): string {
  return `/admin/devices/${encodeURIComponent(row.fleet_key)}`;
}
