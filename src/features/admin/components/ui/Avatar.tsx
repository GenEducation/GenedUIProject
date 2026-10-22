"use client";

export function initials(name: string): string {
  const parts = name
    .trim()
    .replace(/[_.\-@]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Initials tile, matching the teacher portal's user chip. */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className="flex flex-none items-center justify-center rounded-xl bg-gradient-to-br from-navy to-navy-700 font-serif font-bold text-white"
    >
      {initials(name)}
    </span>
  );
}

/**
 * The identity cell most tables lead with: who it is in bold, how to reach them
 * underneath. One column instead of three keeps the table narrow enough to fit.
 */
export function Identity({
  primary,
  secondary,
  avatarName,
}: {
  primary: string;
  secondary?: string | null;
  avatarName?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={avatarName ?? primary} size={34} />
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-bold text-ink">{primary}</p>
        {secondary ? <p className="truncate text-[12px] text-muted">{secondary}</p> : null}
      </div>
    </div>
  );
}
