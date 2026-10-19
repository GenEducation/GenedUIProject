"use client";

import { useId, useLayoutEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { _layout } from "blobatar";
import { usePetStore } from "../store/usePetStore";
import { useBuddySeed } from "../hooks/useBuddySeed";
import { useHydrated } from "@/hooks/useHydrated";
import { resolveTraits } from "../theme/blobatar";
import type { PetAccent } from "../theme/petExpressions";
import { accentMarks, restAnchors, type AccentMark, type MarkShape } from "../utils/petAccents";

/**
 * This student's creature at rest — eyes, face ellipse, head top — resolved
 * exactly as `StudentBlobatar` resolves it (`useBuddySeed`, stored `petTraits`
 * once hydrated, through `resolveTraits`). Two different answers would put
 * the marks on somebody else's face.
 */
function useCreatureAnchors() {
  const seed = useBuddySeed();
  const petTraits = usePetStore((s) => s.petTraits);
  const hydrated = useHydrated();
  const traits = resolveTraits(hydrated ? petTraits : null);
  // `resolveTraits` returns a fresh object every call; key the layout on its content.
  const traitsKey = JSON.stringify(traits);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on traitsKey, see above
  return useMemo(() => restAnchors(_layout(seed, { traits })), [seed, traitsKey]);
}

/**
 * The marks blobatar will not draw — blush, star glints, laugh lines, a "?",
 * a shine — drawn *inside* the student's own creature.
 *
 * Not an overlay. An SVG stacked on top only shares the creature's outer box,
 * so it misses everything that happens inside it: the eyes morphing into a
 * pose, glancing, chasing the cursor, and the face bobbing and lifting. A
 * blush drawn that way sits where the eyes *will* be, not where they are.
 *
 * So the marks are portalled into blobatar's own groups: eye marks into
 * `.mo-eyes` (which glances), body marks into `.mo-bob` (which bobs, breathes
 * and lifts with the pose). Each eye mark then re-applies its eye's own pose
 * and gaze offsets from the same inherited `--mo-*` variables the eye reads
 * (`.pet-mark-eye` in `globals.css`), so it tracks its eye frame for frame —
 * including through a morph, which is a transition on those very variables.
 *
 * `host` is any element containing the blobatar `<svg>`. Blobatar writes its
 * inner markup as HTML; if it ever rewrites it, the observer finds the new
 * groups and the portals follow. The creature is resolved exactly as
 * `StudentBlobatar` resolves it, or the marks would be placed on somebody
 * else's face. Decorative: the whole pet layer is `aria-hidden`.
 */
export function PetFaceAccents({ accent, host }: { accent: PetAccent; host: HTMLElement | null }) {
  const anchors = useCreatureAnchors();
  const marks = useMemo(() => accentMarks(anchors, accent), [anchors, accent]);
  const clipId = `pet-sheen-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const targets = useBlobatarGroups(host);
  if (!targets) return null;

  const eyeMarks = marks.filter((m): m is Extract<AccentMark, { follow: "eye" }> => m.follow === "eye");
  const bodyMarks = marks.filter((m) => m.follow === "body");

  return (
    <>
      {eyeMarks.length > 0 &&
        createPortal(
          // Keyed on the accent so a new emotion replays its marks' entrance.
          <g key={accent} className="pet-marks" aria-hidden="true">
            {eyeMarks.map((m, i) => {
              const eye = anchors.eyes[m.eye];
              return (
                <g
                  key={i}
                  className="pet-mark-eye"
                  transform={`translate(${eye.cx} ${eye.cy})`}
                  style={{ "--pg-wrap": eye.wrap } as CSSProperties}
                >
                  <g
                    className="pet-mark-offset"
                    style={{ "--pg-ox": m.ox * eye.rx, "--pg-oy": m.oy * eye.ry } as CSSProperties}
                  >
                    <Shape shape={m.shape} clipId={clipId} />
                  </g>
                </g>
              );
            })}
          </g>,
          targets.eyes,
        )}
      {bodyMarks.length > 0 &&
        createPortal(
          <g key={accent} className="pet-marks" aria-hidden="true">
            {bodyMarks.map((m, i) => <Shape key={i} shape={m.shape} clipId={clipId} />)}
          </g>,
          targets.bob,
        )}
    </>
  );
}

/** Blobatar's animated groups inside `host`, kept current if it rewrites its markup. */
function useBlobatarGroups(host: HTMLElement | null) {
  const [targets, setTargets] = useState<{ bob: Element; eyes: Element } | null>(null);
  useLayoutEffect(() => {
    if (!host) return;
    const find = () => {
      const bob = host.querySelector(".mo-bob");
      const eyes = host.querySelector(".mo-eyes");
      setTargets((prev) =>
        prev?.bob === bob && prev?.eyes === eyes ? prev : bob && eyes ? { bob, eyes } : null,
      );
    };
    find();
    const observer = new MutationObserver(find);
    observer.observe(host, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [host]);
  return host ? targets : null;
}

function Shape({ shape: s, clipId }: { shape: MarkShape; clipId: string }) {
  switch (s.tag) {
    case "ellipse":
      return <ellipse className={s.className} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={s.fill} opacity={s.opacity} />;
    case "path":
      return (
        <path
          className={s.className}
          d={s.d}
          fill={s.fill}
          stroke={s.stroke}
          strokeWidth={s.strokeWidth}
          strokeLinecap="round"
        />
      );
    case "text":
      return (
        <text
          className={s.className}
          x={s.x}
          y={s.y}
          fontSize={s.size}
          fontWeight={800}
          fontFamily="var(--font-display), system-ui, sans-serif"
          textAnchor="middle"
          fill={s.fill}
          stroke={s.stroke}
          strokeWidth={2.5}
          paintOrder="stroke"
        >
          {s.text}
        </text>
      );
    case "sheen": {
      const f = s.face;
      return (
        <>
          <clipPath id={clipId}>
            <ellipse cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} />
          </clipPath>
          <g clipPath={`url(#${clipId})`}>
            <g transform={`rotate(25 ${f.cx} ${f.cy})`}>
              <rect
                className={s.className}
                x={f.cx - 4}
                y={f.cy - f.ry * 1.6}
                width={7}
                height={f.ry * 3.2}
                fill="#FFFFFF"
              />
            </g>
          </g>
        </>
      );
    }
  }
}
