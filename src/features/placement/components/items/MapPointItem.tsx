"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { ItemWidgetProps } from "./itemProps";

/**
 * Click a point on a map.
 *
 * The one trap here is coordinate space. `block_spec.width` × `height` is the
 * image's OWN pixel space (21000 × 29700 — the d-maps native units, also the
 * SVG's own `viewBox`), not screen pixels — the image is rendered responsively
 * and will almost never be at 1:1. Every click is therefore scaled back into
 * that space before it is sent, and the stored answer is scaled forward again
 * to draw the marker. Sending raw screen coordinates would mark every answer
 * wrong on a phone and right on a desktop.
 *
 * `block_spec.tolerance` is a radius in that same pixel space — how forgiving
 * the target is, never the target itself. The marker is drawn at that radius
 * (scaled the same way position is) so a student whose click was inside
 * tolerance but looks like a near-miss doesn't try to "fix" a correct answer.
 *
 * `block_spec.image` is a logical name — vendored SVGs live in
 * `public/placement/maps/`. Both authored maps are genuinely served today,
 * two map items per grade (3–9): `india-states-outline` for grades 6, 8 and
 * 9 (Rajasthan/UP, Western Ghats/Jharkhand, Thar Desert), `india-rivers-
 * outline` for grades 7 and 9 (Ganga/Bay of Bengal, the Ganga-Yamuna
 * confluence at Prayagraj, the Godavari's source near Nashik) — grade 9
 * alone uses both.
 *
 * `block_spec.sha256` is the drift guard: `answer_key.point` is only valid
 * against the exact bytes it was plotted on. If the server-sent hash doesn't
 * match the file we vendored, the map degrades to the same "didn't load"
 * fallback as a genuinely missing asset — never render a possibly-wrong
 * image against a graded coordinate space. `VENDORED_MAP_SHA256` is checked
 * against the real files in `mapAssets.integrity.test.ts`.
 */
const MAP_ASSETS: Record<string, string> = {
  "india-rivers-outline": "/placement/maps/india-rivers-outline.svg",
  "india-states-outline": "/placement/maps/india-states-outline.svg",
};

export const VENDORED_MAP_SHA256: Record<string, string> = {
  "india-rivers-outline": "c989ac260d275557e9f7c5d7ff4e973f129ca7abf933e332e1baa87b802c975f",
  "india-states-outline": "ded7c92a2f23fa5ff8fab829c1344f5c128434ca2aa0204bad5b80268d450cc9",
};

/**
 * Screen coordinates → the image's own pixel space.
 *
 * Exported so the conversion can be tested without a layout engine: jsdom
 * reports every getBoundingClientRect as zero, so a click-driven test of this
 * would silently assert nothing.
 */
export function toImageSpace(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  spec: { width: number; height: number },
) {
  return {
    x: Math.round(((clientX - rect.left) / rect.width) * spec.width),
    y: Math.round(((clientY - rect.top) / rect.height) * spec.height),
  };
}

/** A short, human host name for the attribution caption — never a raw URL. */
function sourceHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function MapPointItem({ item, value, onChange, disabled }: ItemWidgetProps) {
  const spec = item.block_spec as {
    image: string;
    width: number;
    height: number;
    tolerance: number;
    source_url: string;
    sha256: string;
  };
  const frameRef = useRef<HTMLDivElement>(null);
  const point = value && "point" in value ? value.point : null;

  const src = MAP_ASSETS[spec.image];
  const hashMatches = VENDORED_MAP_SHA256[spec.image] === spec.sha256;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    onChange({ point: toImageSpace(e.clientX, e.clientY, rect, spec) });
  };

  if (!src || !hashMatches) return <MissingMap onChange={onChange} />;

  const markerRadiusPct = (spec.tolerance / spec.width) * 100;
  const host = sourceHost(spec.source_url);

  return (
    <div className="space-y-2">
      <p
        className="text-[11px] font-black uppercase tracking-widest m-0"
        style={{ color: "var(--pl-ink-faint)" }}
      >
        Tap the map to place your marker
      </p>

      <div
        ref={frameRef}
        onClick={handleClick}
        className={`relative w-full max-w-[420px] rounded-2xl overflow-hidden border-2 ${
          disabled ? "" : "cursor-crosshair"
        }`}
        style={{
          aspectRatio: `${spec.width} / ${spec.height}`,
          background: "var(--pl-card)",
          borderColor: "var(--pl-border)",
        }}
      >
        <Image
          src={src}
          alt={item.prompt}
          fill
          sizes="(max-width: 640px) 100vw, 420px"
          className="object-contain pointer-events-none select-none"
          priority
        />

        {point && (
          <span
            className="absolute rounded-full pointer-events-none"
            style={{
              // Image space → screen, as a percentage so it survives resizes.
              left: `${(point.x / spec.width) * 100}%`,
              top: `${(point.y / spec.height) * 100}%`,
              width: `${markerRadiusPct * 2}%`,
              aspectRatio: "1 / 1",
              transform: "translate(-50%, -50%)",
              background: "var(--pl-accent)",
              border: "3px solid var(--pl-primary)",
              boxShadow: "0 2px 10px rgb(7 94 99 / 0.35)",
            }}
            aria-hidden="true"
          />
        )}
      </div>

      <p className="text-[13px] font-medium m-0" style={{ color: "var(--pl-ink-mid)" }} aria-live="polite">
        {point ? "Marker placed — tap again to move it." : "No marker yet."}
      </p>

      {host && (
        <p className="text-[10px] m-0" style={{ color: "var(--pl-ink-faint)" }}>
          Map data: {host}
        </p>
      )}
    </div>
  );
}

/**
 * The asset is missing, or the server-sent hash doesn't match what we
 * vendored, so the question cannot honestly be asked.
 *
 * It still has to be passable: the form is strictly sequential, and a student
 * stuck part-way through has lost the whole placement. So a throwaway point is
 * seeded to unlock Next, and the copy says plainly that the question is lost
 * rather than implying it was skipped or will be ignored — (0, 0) is outside
 * every tolerance radius and grades as wrong.
 */
function MissingMap({ onChange }: Pick<ItemWidgetProps, "onChange">) {
  useEffect(() => {
    onChange({ point: { x: 0, y: 0 } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <p
      className="text-[14px] font-medium leading-relaxed rounded-xl p-4"
      style={{ background: "var(--pl-surface)", color: "var(--pl-ink-mid)" }}
    >
      This map didn&apos;t load, so this question can&apos;t be answered and will be
      counted as incorrect. Tap Next to carry on — please tell your teacher.
    </p>
  );
}
