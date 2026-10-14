import React from "react";

export function formatScalar(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  const s = String(v);
  if (s.length > 200) {
    return `${s.slice(0, 197)}…`;
  }
  return s;
}

const MAX_DEPTH = 3;
const MAX_KEYS = 40;
const MAX_ARRAY_ITEMS = 20;

/**
 * One scalar metric/extra — short values (numbers, booleans, short strings)
 * that read fine as a label/value pair.
 */
export function MetricRow({ k, v }: { k: string; v: unknown }) {
  const text = formatScalar(v);
  return (
    <div className="flex items-baseline justify-between gap-3 text-[11px]">
      <dt className="shrink-0 text-white/35">{k}</dt>
      <dd className="min-w-0 truncate font-mono text-white/70" title={text}>
        {text}
      </dd>
    </div>
  );
}

/**
 * Renders an object's fields as actual label/value rows, recursing into any
 * nested object with strict depth, key, and array bounds.
 */
export function NestedFields({
  obj,
  depth = 0,
}: {
  obj: Record<string, unknown>;
  depth?: number;
}) {
  if (!obj || typeof obj !== "object") return <p className="text-white/30">—</p>;

  const allEntries = Object.entries(obj);
  if (allEntries.length === 0) return <p className="text-white/30">—</p>;

  const entries = allEntries.slice(0, MAX_KEYS);
  const truncatedKeysCount = allEntries.length - entries.length;

  return (
    <div className="space-y-1">
      <dl
        className={`grid grid-cols-2 gap-x-4 gap-y-1.5 ${
          depth > 0 ? "border-l border-white/10 pl-3" : ""
        }`}
      >
        {entries.map(([k, v]) => {
          if (
            v !== null &&
            typeof v === "object" &&
            !Array.isArray(v)
          ) {
            if (depth >= MAX_DEPTH) {
              return (
                <div key={k} className="col-span-2">
                  <dt className="text-[11px] text-white/35">{k}</dt>
                  <dd className="font-mono text-[10px] text-white/50">
                    {JSON.stringify(v)}
                  </dd>
                </div>
              );
            }
            return (
              <div key={k} className="col-span-2">
                <dt className="mb-1 text-[11px] text-white/35">{k}</dt>
                <dd>
                  <NestedFields
                    obj={v as Record<string, unknown>}
                    depth={depth + 1}
                  />
                </dd>
              </div>
            );
          }

          let text: string;
          if (Array.isArray(v)) {
            if (v.length === 0) {
              text = "—";
            } else {
              const visibleItems = v.slice(0, MAX_ARRAY_ITEMS).map(formatScalar);
              const extra = v.length - MAX_ARRAY_ITEMS;
              text = extra > 0
                ? `${visibleItems.join(", ")}, +${extra} more`
                : visibleItems.join(", ");
            }
          } else {
            text = formatScalar(v);
          }

          return (
            <div key={k} className="flex items-baseline justify-between gap-3 text-[11px]">
              <dt className="shrink-0 text-white/35">{k}</dt>
              <dd className="min-w-0 truncate font-mono text-white/70" title={text}>
                {text}
              </dd>
            </div>
          );
        })}
      </dl>
      {truncatedKeysCount > 0 ? (
        <p className="text-[10px] italic text-white/30">
          +{truncatedKeysCount} more keys…
        </p>
      ) : null}
    </div>
  );
}

/**
 * One object-valued metric/extra (nested mixer state, raw payloads, …), shown
 * as real UI rows via `NestedFields` rather than pretty-printed JSON.
 */
export function NestedMetric({
  k,
  v,
}: {
  k: string;
  v: Record<string, unknown>;
}) {
  return (
    <div className="text-[11px]">
      <dt className="mb-1.5 text-white/35">{k}</dt>
      <dd>
        <NestedFields obj={v} />
      </dd>
    </div>
  );
}
