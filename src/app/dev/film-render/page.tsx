"use client";

// Render target for the campaign film (dev only). The frame-render skill opens
// a small wrapper page that iframes this one and drives it over postMessage:
//   ready  → { duration, fps, width, height } once fonts and images are loaded
//   render → sets the film to time t and answers after the frame has painted
// ?format=portrait renders the 4:5 phone cut. Output goes to /public/film.

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMotionValue } from "framer-motion";
import "@/features/webapp-campaign/campaign.css";
import { FONT_VARS } from "@/features/webapp-campaign/fonts";
import { FilmFrame, FILM_SECONDS } from "@/features/webapp-campaign/film/FeatureFilm";

const FPS = 30;

function FilmRender() {
  const portrait = useSearchParams().get("format") === "portrait";
  const width = portrait ? 1080 : 1920;
  const height = portrait ? 1350 : 1080;
  const progress = useMotionValue(0);

  useEffect(() => {
    const paint = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    const onMessage = async (e: MessageEvent) => {
      if (e.data?.type !== "render") return;
      progress.set(Math.min(e.data.t / FILM_SECONDS, 0.99999));
      await paint();
      e.source?.postMessage({ type: "rendered" }, { targetOrigin: "*" });
    };
    window.addEventListener("message", onMessage);
    (async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)));
      await paint();
      window.parent.postMessage({ type: "ready", info: { duration: FILM_SECONDS, fps: FPS, width, height } }, "*");
    })();
    return () => window.removeEventListener("message", onMessage);
  }, [progress, width, height]);

  if (process.env.NODE_ENV === "production") return null;
  return (
    <div className={`gened-campaign ${FONT_VARS} ${portrait ? "gc-portrait" : ""}`} style={{ width, height, minHeight: 0, overflow: "hidden" }}>
      <style>{`nextjs-portal{display:none!important} body{margin:0;background:#072528}`}</style>
      <FilmFrame progress={progress} className="gc-video-render" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <FilmRender />
    </Suspense>
  );
}
