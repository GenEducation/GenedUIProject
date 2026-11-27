"use client";

import { useEffect, useRef, useState } from "react";
import type { MomentArtSrc } from "@/features/student/theme/momentArt";

/** A beat before the move, so the pop-up's own entrance lands first. */
const DELAY_MS = 150;

/**
 * Rendered motion: steps once through a strip of frames (background-position, stepped), then holds the last one.
 *
 * Driven from here with the Web Animations API rather than a stylesheet rule, so it plays wherever the component
 * renders, and its resting state is the last frame: if the animation can't run, or under reduced motion, you see the
 * finished picture, never a frozen first frame. It starts only once the strip has decoded, so it never begins
 * half-loaded; until then the box stays empty, and if the strip fails to load it shows the still.
 */
export function MomentSprite({ art }: { art: MomentArtSrc }) {
  const sprite = art.sprite!;
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let live = true;
    const img = new Image();
    const ready = () => live && setState("ready");
    const failed = () => live && setState("failed");
    img.src = sprite.src;
    // decode() where there is one (it also waits for the pixels); plain load events elsewhere.
    if (typeof img.decode === "function") img.decode().then(ready, failed);
    else {
      img.onload = ready;
      img.onerror = failed;
    }
    return () => {
      live = false;
    };
  }, [sprite.src]);

  useEffect(() => {
    const el = ref.current;
    if (state !== "ready" || !el || typeof el.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const anim = el.animate([{ backgroundPosition: "0% 0" }, { backgroundPosition: "100% 0" }], {
      duration: (sprite.frames / sprite.fps) * 1000,
      delay: DELAY_MS,
      easing: `steps(${sprite.frames}, jump-none)`,
      fill: "backwards",
    });
    return () => anim.cancel();
  }, [state, sprite.frames, sprite.fps]);

  if (state === "failed") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={art.src} alt="" width={art.width} height={art.height} draggable={false} className="h-full w-full object-contain" />;
  }
  return (
    <div
      ref={ref}
      className="h-full w-full"
      style={{
        backgroundImage: state === "ready" ? `url(${sprite.src})` : undefined,
        backgroundSize: `${sprite.frames * 100}% 100%`,
        backgroundPosition: "100% 0",
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
