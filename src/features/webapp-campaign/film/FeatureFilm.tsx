"use client";

// The campaign film. `FilmFrame` draws every scene for one timeline value
// (0..1); /dev/film-render steps it frame by frame for the frame-render skill,
// which records the MP4s in /public/film. The landing page plays those MP4s
// with `FeatureVideo`: full width, muted, looping, starting as soon as the page
// opens. The whole film is the call to action: clicking it opens the sign-up.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useTransform } from "framer-motion";
import { FILM_SCENES, FILM_SECONDS, SCENE_WINDOWS } from "./filmScript";
import { SCENE_COMPONENTS } from "./scenes";
import type { Progress } from "./primitives";

const FADE = 0.008; // each scene fades in over 2×FADE and out over 2×FADE

function SceneLayer({ progress, index }: { progress: Progress; index: number }) {
  const scene = FILM_SCENES[index];
  const { start, end } = SCENE_WINDOWS[index];
  // Out, then in: the outgoing scene clears before the next one arrives.
  // The first and last scenes also fade at the loop point.
  const edges = [start, start + 2 * FADE, end - 2 * FADE, end];
  const opacity = useTransform(progress, edges, [index === 0 ? 1 : 0, 1, 1, 0]);
  const scale = useTransform(progress, edges, [0.97, 1, 1, 1.02]);
  const visibility = useTransform(opacity, (o) => (o < 0.005 ? "hidden" : "visible"));
  const captionY = useTransform(progress, [start, start + FADE * 4], ["1.5cqw", "0cqw"]);
  const p = useTransform(progress, [start, end], [0, 1]);
  const Scene = SCENE_COMPONENTS[scene.id];

  return (
    <motion.div className={`gc-layer ${scene.eyebrow ? "" : "gc-layer-bare"}`} style={{ opacity, visibility }}>
      {scene.eyebrow && (
        <motion.div className="gc-caption" style={{ y: captionY }}>
          <span className="gc-caption-eyebrow">{scene.eyebrow}</span>
          <h3 className="gc-caption-title">{scene.title}</h3>
        </motion.div>
      )}
      <motion.div className="gc-layer-body" style={{ scale }}>
        <Scene p={p} />
      </motion.div>
    </motion.div>
  );
}

/** Every scene of the film at one point of its timeline. */
export function FilmFrame({ progress, className = "", children }: { progress: Progress; className?: string; children?: ReactNode }) {
  return (
    <section className={`gc-video ${className}`}>
      <div className="gc-video-glow" aria-hidden />
      {FILM_SCENES.map((s, i) => (
        <SceneLayer key={s.id} progress={progress} index={i} />
      ))}
      {children}
    </section>
  );
}

const FILM = {
  wide: { src: "/film/gened-film-16x9.mp4", poster: "/film/gened-film-16x9.jpg" },
  tall: { src: "/film/gened-film-4x5.mp4", poster: "/film/gened-film-4x5.jpg" },
};

/** The rendered film on the landing page: plays muted on a loop while on screen; tap anywhere to join. */
export function FeatureVideo({ onJoin }: { onJoin: () => void }) {
  // Phones get the portrait cut. Chosen after mount, so server and client agree.
  const [film, setFilm] = useState<(typeof FILM)["wide"] | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 700px)");
    const pick = () => setFilm(mq.matches ? FILM.tall : FILM.wide);
    pick();
    mq.addEventListener("change", pick);
    return () => mq.removeEventListener("change", pick);
  }, []);

  // It sits below the hero, so play from the top the first time it comes into view and pause off screen.
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    let seen = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!seen) el.currentTime = 0;
          seen = true;
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [film]);

  return (
    <section className="gc-video gc-video-player" aria-label="How GenEd works: a 35-second demo">
      {film && (
        <video
          key={film.src}
          ref={video}
          className="gc-video-el"
          src={film.src}
          poster={film.poster}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        />
      )}
      {/* eslint-disable-next-line no-restricted-syntax -- full-bleed transparent hit area over the film, not a styled control */}
      <button type="button" className="gc-video-hit" onClick={onJoin} aria-label="Join the free pilot" />
    </section>
  );
}

export { FILM_SECONDS };
