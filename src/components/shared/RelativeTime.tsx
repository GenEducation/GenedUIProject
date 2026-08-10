"use client";

import { formatAbsolute, formatRelativeTime } from "@/utils/datetime";
import { useNow } from "@/utils/useNow";

interface RelativeTimeProps {
  value: string | number | Date | null | undefined;
  /** Rendered before the timestamp, e.g. "Last connected ". */
  prefix?: string;
  className?: string;
}

/**
 * Hydration-safe relative timestamp.
 *
 * Server and first client paint both render the absolute locale string, so the
 * markup matches; the relative form ("2h ago") takes over once the shared
 * clock starts, and re-ticks so it never freezes. Renders `null` for unusable
 * input, so callers can drop it in without guarding.
 */
export function RelativeTime({ value, prefix, className }: RelativeTimeProps) {
  const now = useNow();
  const absolute = formatAbsolute(value);

  if (absolute === null) return null;

  const relative = now === 0 ? null : formatRelativeTime(value, now);
  const iso = value instanceof Date ? value.toISOString() : String(value);

  return (
    <time dateTime={iso} title={absolute} className={className}>
      {prefix}
      {relative ?? absolute}
    </time>
  );
}
