import type { CSSProperties } from "react";
import type { MomentArtSrc } from "@/features/student/theme/momentArt";
import { MomentSprite } from "./MomentSprite";

interface MomentArtProps {
  art: MomentArtSrc;
  /** Rendered width in px; height follows the art's aspect ratio. */
  width: number;
  /** Drift gently, like the dashboard's islands (off under reduced motion). */
  float?: boolean;
  /** A soft ellipse shadow under the art; the renders carry none of their own. */
  shadow?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * A decorative moment illustration from `momentArt.ts`. Plain <img>: the files
 * are small fixed-size WebPs, so they're served as is. Layered art stacks its
 * parts over the base, each playing a one-off move as it mounts.
 */
export function MomentArt({ art, width, float = false, shadow = true, className = "", style }: MomentArtProps) {
  const height = Math.round((width * art.height) / art.width);
  return (
    <div
      aria-hidden="true"
      className={`shrink-0 select-none pointer-events-none ${className}`}
      // Width caps at the container, and the box keeps the art's aspect ratio so the shadow stays under it.
      style={{ position: "relative", width, maxWidth: "100%", aspectRatio: `${art.width} / ${art.height}`, ...style }}
    >
      {shadow && (
        <div
          className={`absolute rounded-[50%] ${float ? "island-shadow" : ""}`}
          style={{
            left: "22%",
            right: "22%",
            bottom: "4%",
            height: Math.max(8, Math.round(height * 0.06)),
            background: "rgba(29,99,21,0.14)",
            filter: "blur(5px)",
          }}
        />
      )}
      <div className={`relative h-full w-full ${float ? "island-float" : ""}`}>
        {art.sprite ? (
          <MomentSprite art={art} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art.src} alt="" width={art.width} height={art.height} draggable={false} className="h-full w-full object-contain" />
        )}
        {/* Layered art: each part plays its one move as it mounts (.moment-layer--* in globals.css). */}
        {art.layers?.map((l) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={l.key}
            src={l.src}
            alt=""
            width={art.width}
            height={art.height}
            draggable={false}
            className={`moment-layer moment-layer--${l.key} absolute inset-0 h-full w-full object-contain`}
            style={l.origin ? { transformOrigin: l.origin } : undefined}
          />
        ))}
      </div>
    </div>
  );
}
