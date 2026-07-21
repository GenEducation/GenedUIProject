"use client";

import { useEffect, useRef, useState } from "react";
import type { PreorderFeature } from "../types";

const FRAME_COUNT = 68;
const FRAME_SRC = (i: number) =>
  `/preorder/frames/frame-${String(i).padStart(3, "0")}.webp`;

// The wake-up animation is spread evenly across the whole feature scroll:
// frames AND the active feature both advance together over [SCRUB_START..SCRUB_END].
// So the device keeps opening continuously as the user scrolls feature 1 → 5
// (~FRAME_COUNT / features frames per feature), rather than a separate rushed
// wake-up stage that then freezes.
const SCRUB_START = 0.03;
const SCRUB_END = 0.99;

interface Props {
  features: PreorderFeature[];
}

export function DeviceScrollScene({ features }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(-1);

  // 0..n-1 = active feature (advances together with the frame scrub)
  const [active, setActive] = useState(0);
  const [scrub, setScrub] = useState(true);
  const [ready, setReady] = useState(false);

  // Decide between the scrub experience and the static fallback.
  useEffect(() => {
    const mq = window.matchMedia(
      "(max-width: 820px), (prefers-reduced-motion: reduce)"
    );
    const apply = () => setScrub(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Preload frames (only when scrubbing).
  useEffect(() => {
    if (!scrub) return;
    let loaded = 0;
    const imgs: HTMLImageElement[] = [];
    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new Image();
      img.src = FRAME_SRC(i);
      img.onload = () => {
        loaded += 1;
        if (i === 1) setReady(true); // first frame is enough to paint
        if (loaded === FRAME_COUNT) drawFrame(FRAME_COUNT - 1);
      };
      imgs.push(img);
    }
    imagesRef.current = imgs;
  }, [scrub]);

  // Draw a frame with "cover" fit + devicePixelRatio scaling.
  const drawFrame = (index: number) => {
    const canvas = canvasRef.current;
    const img = imagesRef.current[index];
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    // Horizontally centered. Vertically biased toward the top of the frame so
    // the device (which sits high in the source) drops into view with headroom
    // and its face never clips the top edge.
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) * 0.2;
    ctx.drawImage(img, dx, dy, dw, dh);
  };

  // Scroll → frame + active feature.
  useEffect(() => {
    if (!scrub) return;

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const track = trackRef.current;
        if (!track) return;
        const rect = track.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const progress = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;

        // Single mapping: frames and feature bands advance together across the
        // scrub range, so each feature gets an equal share of the 68 frames.
        const p = clamp(
          (progress - SCRUB_START) / (SCRUB_END - SCRUB_START),
          0,
          1
        );

        const frame = Math.round(p * (FRAME_COUNT - 1));
        if (frame !== lastFrameRef.current) {
          lastFrameRef.current = frame;
          drawFrame(frame);
        }

        const next = features.length
          ? clamp(Math.floor(p * features.length), 0, features.length - 1)
          : 0;
        setActive((prev) => (prev === next ? prev : next));
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // IMPORTANT: reset so the guard in a freshly-attached onScroll (after this
      // effect re-runs, e.g. when `ready` flips) doesn't block forever.
      rafRef.current = 0;
    };
  }, [scrub, features.length, ready]);

  // ---- Static fallback (mobile / reduced motion) ----
  if (!scrub) {
    return (
      <section className="po-fallback">
        <div className="po-wrap">
          <video
            className="po-fallback-video"
            src="/preorder/device.mp4"
            poster="/preorder/poster.webp"
            muted
            playsInline
            autoPlay
            loop
          />
          <div className="po-fallback-list">
            {features.map((f) => (
              <div className="po-fallback-card" key={f.index}>
                <span className="po-fnum">{f.index}</span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ---- Scrub experience ----
  return (
    <div className="po-stage-scroll" ref={trackRef}>
      <div className="po-stage-sticky">
        <canvas className="po-canvas" ref={canvasRef} aria-hidden="true" />

        {/* Feature overlays */}
        <div className="po-overlay">
          <div className="po-wrap" style={{ position: "relative", width: "100%" }}>
            {features.map((f, i) => (
              <div
                className={`po-feature${active === i ? " is-active" : ""}`}
                key={f.index}
                aria-hidden={active === i ? undefined : true}
              >
                <span className="po-fnum">{f.index}</span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Progress rail */}
        <div className="po-rail" aria-hidden="true">
          {features.map((f, i) => (
            <span key={f.index} className={active === i ? "is-active" : ""} />
          ))}
        </div>
      </div>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
