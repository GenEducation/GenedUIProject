"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, History } from "lucide-react";

import { STUDENT_COLORS } from "../theme/colors";
import { HERO_TIDE, type TideTrack } from "../theme/heroTide";

/* ═══ TOKENS ═══ — sourced from STUDENT_COLORS (see theme/colors.ts) */
const C = {
  primary: STUDENT_COLORS.tutor,
  text: STUDENT_COLORS.text,
  textMid: STUDENT_COLORS.textMid,
  textMuted: STUDENT_COLORS.textMuted,
  card: STUDENT_COLORS.card,
};

/** The card's own gradient; the rendered scene is composited onto exactly this, so poster, video and card agree. */
const SKY = "linear-gradient(180deg, #F4F8E6 0%, #E3EEC4 100%)";
/** A wash of the card's colour behind the text, so it reads over the scene. */
const WASH = "linear-gradient(90deg, rgba(244,248,230,0.96) 0%, rgba(244,248,230,0.88) 46%, rgba(244,248,230,0) 100%)";
/** The title: a deeper forest green than body text, with a soft paper halo so it lifts off the scene. */
const TITLE_INK = "rgb(16,58,12)";
const HALO = "0 1px 0 rgba(255,255,255,0.7), 0 0 14px rgba(244,248,230,0.95), 0 0 2px rgba(244,248,230,0.9)";
const FILL = "#8DB000";
const REVEAL = "opacity .45s ease-out, transform .7s cubic-bezier(.3,1.5,.5,1)";

/**
 * The tide plays once per page load: a reload plays it again, coming back to the dashboard within the app doesn't.
 * Module state resets on a reload; on the server it stays false (effects never run there), so the first client
 * render matches the server's.
 */
let introPlayed = false;

/**
 * The shape the dashboard hands in — a recent-chat row already decorated with
 * `vis` and a rounded `mastery` by StudentHome. Kept structural rather than
 * importing the store type so the card stays easy to render in isolation.
 */
export interface ContinueLearningSession {
  title: string;
  mastery: number;
  vis: { label: string; color: string };
}

interface ContinueLearningCardProps {
  session: ContinueLearningSession;
  /** Grade + board line, e.g. "Grade 8 CBSE". Omitted when unknown. */
  gradeLabel?: string;
  /** When it was last studied, e.g. "2h ago", after the eyebrow. */
  lastStudied?: string;
  /** A chapter finished once and open again (reviewing sections, or started over). */
  revisiting?: boolean;
  onStart: () => void;
  style?: React.CSSProperties;
}

type Phase = "waiting" | "playing" | "static";
const PARTS = 5; // chip, eyebrow, title, progress, button: the order they sit in, top to bottom

/**
 * Dashboard hero for the chapter the student is part-way through. The whole card is one rendered scene: a noria
 * on a river (see heroTide.ts). On the first load of the page a tide rolls in from the right, turns the wheel and
 * fills the bucket, and the chapter's chip, title, progress and button surface as the wave's crest passes them.
 *
 * Delivery: the still of the last frame shows at once (the card is never blank); the video loads in the
 * background and plays only if it's ready within HERO_TIDE.waitForVideo, otherwise the text simply shows over
 * the still. Reduced motion and Save-Data skip the video entirely.
 */
export function ContinueLearningCard({
  session,
  gradeLabel,
  lastStudied,
  revisiting = false,
  onStart,
  style,
}: ContinueLearningCardProps) {
  const percent = Math.max(0, Math.min(100, session.mastery));
  const chip = [session.vis.label, gradeLabel].filter(Boolean).join(" · ");

  // Whether this card is the page load's first (decided once per instance, so StrictMode's second effect run in
  // development, or any re-run, sees the same answer instead of skipping the intro and leaving the text hidden).
  const [first] = useState(() => !introPlayed);
  const [phase, setPhase] = useState<Phase>(() => (first ? "waiting" : "static"));
  const [shown, setShown] = useState<boolean[]>(() => Array(PARTS).fill(false));
  const [video, setVideo] = useState<{ webm: string; mp4: string } | null>(null);
  const [ambient, setAmbient] = useState(false); // playing behind text that's already showing (the video was slow)
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const partRefs = useRef<(HTMLElement | null)[]>([]);
  const trackRef = useRef<TideTrack | null>(null);
  const startedAt = useRef(0);

  // Decide whether to play, and start loading the video in the background.
  useEffect(() => {
    introPlayed = true;
    if (!first) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    // Decided in a task after the first paint (the browser-only checks can't run during render).
    let grace = 0;
    const start = window.setTimeout(() => {
      if (reduce || saveData) { setPhase("static"); return; }
      startedAt.current = performance.now();
      setVideo(window.matchMedia("(min-width: 640px)").matches ? HERO_TIDE.video.lg : HERO_TIDE.video.sm);
      fetch(HERO_TIDE.track)
        .then((r) => (r.ok ? r.json() : null))
        .then((t: TideTrack | null) => { trackRef.current = t; })
        .catch(() => {});
      grace = window.setTimeout(() => {
        if (phaseRef.current === "waiting") setPhase("static");
      }, HERO_TIDE.waitForVideo);
    }, 0);
    // Fail-safe: whatever happens to the video, the text is never hidden for more than 2.5s.
    const failsafe = window.setTimeout(() => {
      if (phaseRef.current === "waiting") setPhase("static");
    }, 2500);
    return () => { window.clearTimeout(start); window.clearTimeout(grace); window.clearTimeout(failsafe); };
  }, [first]);

  // Once it can play through: play, and bring the text up as the crest passes (or as ambient motion if the text is
  // already showing because the video was slow).
  const onReady = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.paused) return;
    const late = phaseRef.current === "static";
    if (late && performance.now() - startedAt.current > 2500) return; // too late to be worth moving the card
    v.play().then(() => (late ? setAmbient(true) : setPhase("playing"))).catch(() => setPhase("static"));
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const card = cardRef.current, v = videoRef.current;
    if (!card || !v) return;
    const box = card.getBoundingClientRect();
    const centres = partRefs.current.map((el) => {
      if (!el) return 0;
      const b = el.getBoundingClientRect();
      return b.left - box.left + b.width / 2;
    });
    // The frame is shown object-fit: cover, positioned at focusX: map a frame x (0..1) to card px.
    const k = Math.max(box.width / HERO_TIDE.width, box.height / HERO_TIDE.height);
    const dispW = HERO_TIDE.width * k;
    const offX = (box.width - dispW) * HERO_TIDE.focusX;
    const stacked = box.width < 640;
    let raf = 0, rang = false;
    const done = Array(PARTS).fill(false) as boolean[];
    const tick = () => {
      const t = v.currentTime;
      const track = trackRef.current;
      let changed = false;
      for (let i = 0; i < PARTS; i++) {
        if (done[i]) continue;
        let reveal: boolean;
        if (stacked || !track) reveal = t > 0.7 + i * 0.12; // phones: the scene is a strip above the text
        else {
          const f = Math.min(track.frames - 1, Math.max(0, Math.floor(t * track.fps)));
          reveal = offX + track.crest[f] * dispW < centres[i];
        }
        if (reveal) { done[i] = true; changed = true; }
      }
      if (changed) setShown([...done]);
      if (!rang && t >= HERO_TIDE.bucketFullAt) {
        rang = true;
        ringRef.current?.animate(
          [{ boxShadow: "0 0 0 0 rgba(166,207,8,0.75)" }, { boxShadow: "0 0 0 16px rgba(166,207,8,0)" }],
          { duration: 900, iterations: 2, easing: "ease-out" },
        );
      }
      if (!v.ended) raf = requestAnimationFrame(tick);
      else setShown(Array(PARTS).fill(true));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const part = (i: number): React.CSSProperties =>
    phase === "static" || shown[i]
      ? { opacity: 1, transform: "none", transition: REVEAL }
      : { opacity: 0, transform: "translateY(14px)", transition: REVEAL };
  const setPart = (i: number) => (el: HTMLElement | null) => { partRefs.current[i] = el; };
  const barFull = phase === "static" || shown[3];
  const objectPosition = `${HERO_TIDE.focusX * 100}% 50%`;

  return (
    <div className="relative mb-8 mt-2" style={style}>
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-[26px] flex flex-col sm:block"
        style={{ background: SKY, minHeight: "clamp(280px, 27vw, 390px)" }}
      >
        {/* The scene: a strip above the text on phones, the whole card from sm up. */}
        <div aria-hidden="true" className="relative h-[190px] sm:absolute sm:inset-0 sm:h-auto pointer-events-none select-none">
          <picture>
            <source media="(max-width: 639px)" srcSet={HERO_TIDE.poster.sm} />
            <img src={HERO_TIDE.poster.lg} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition }} />
          </picture>
          {video && (
            <video
              ref={videoRef}
              muted
              playsInline
              preload="auto"
              onCanPlayThrough={onReady}
              onError={() => setPhase("static")}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition, opacity: phase === "playing" || ambient ? 1 : 0, transition: "opacity .25s" }}
            >
              <source src={video.webm} type="video/webm" />
              <source src={video.mp4} type="video/mp4" />
            </video>
          )}
          <div className="hidden sm:block absolute inset-y-0 left-0 w-[60%]" style={{ background: WASH }} />
        </div>

        <div className="relative z-[1] sm:max-w-[54%]" style={{ padding: "clamp(20px, 2.8vw, 40px)" }}>
          {/* Subject chip */}
          <span
            ref={setPart(0)}
            className="inline-flex items-center gap-1.5 rounded-full font-bold"
            style={{ background: C.card, color: session.vis.color, padding: "4px 12px", fontSize: "clamp(11px, 1vw, 12px)", ...part(0) }}
          >
            <span aria-hidden className="rounded-[3px]" style={{ width: 8, height: 8, background: session.vis.color }} />
            {chip}
          </span>

          {/* Eyebrow */}
          <div
            ref={setPart(1)}
            className="flex items-center gap-2 font-bold uppercase mt-3"
            style={{ color: C.textMid, letterSpacing: "0.1em", fontSize: "clamp(10px, 0.9vw, 11px)", textShadow: HALO, ...part(1) }}
          >
            <History size={14} strokeWidth={2} aria-hidden />
            <span>{revisiting ? "Revisiting a finished chapter" : "Pick up where you left off"}</span>
            {lastStudied && (
              <span className="font-semibold normal-case tracking-normal" style={{ opacity: 0.8 }}>
                · {lastStudied}
              </span>
            )}
          </div>

          <h2
            ref={setPart(2)}
            className="m-0 mt-2 font-extrabold"
            style={{
              color: TITLE_INK,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(24px, 3.4vw, 40px)",
              lineHeight: 1.05,
              textWrap: "balance",
              textShadow: HALO,
              ...part(2),
            }}
          >
            {session.title}
          </h2>

          {/* Progress: fills as the wave passes it */}
          <div ref={setPart(3)} className="mt-5" style={{ maxWidth: 420, ...part(3) }}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="font-bold" style={{ color: C.textMid, fontSize: "clamp(11px, 1vw, 12px)" }}>
                Progress
              </span>
              <span className="font-bold" style={{ color: C.textMid, fontSize: "clamp(11px, 1vw, 12px)" }}>
                {percent}% complete
              </span>
            </div>
            <div
              className="rounded-full overflow-hidden w-full"
              style={{ height: 10, background: "rgba(255,255,255,0.9)", boxShadow: "inset 0 1px 2px rgba(29,99,21,0.08)" }}
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${session.title} progress`}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${barFull ? percent : 0}%`,
                  background: FILL,
                  transition: "width 0.9s cubic-bezier(0.22,1,0.36,1) .15s",
                }}
              />
            </div>
          </div>

          {/* CTA: a deep-green pill with a lime "open book" badge; on hover the badge grows and the pill lifts */}
          <button
            ref={setPart(4)}
            type="button"
            onClick={onStart}
            className="group/cta relative mt-6 inline-flex items-center rounded-full border-none cursor-pointer font-bold outline-none focus-visible:ring-4 focus-visible:ring-[rgba(166,207,8,0.55)]"
            style={{
              background: "linear-gradient(180deg, #2E8228 0%, #22661F 100%)",
              color: "#FFFFFF",
              gap: 12,
              padding: "6px clamp(20px, 2.2vw, 26px) 6px 6px",
              fontSize: "clamp(14px, 1.35vw, 16px)",
              fontFamily: "var(--font-body)",
              letterSpacing: "0.01em",
              boxShadow: "0 10px 22px rgba(34,102,31,0.30), inset 0 1px 0 rgba(255,255,255,0.18)",
              ...part(4),
              transition: `${REVEAL}, box-shadow 0.2s`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 14px 28px rgba(34,102,31,0.36), inset 0 1px 0 rgba(255,255,255,0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 10px 22px rgba(34,102,31,0.30), inset 0 1px 0 rgba(255,255,255,0.18)";
            }}
          >
            {/* the ripple when the bucket fills */}
            <span ref={ringRef} aria-hidden className="pointer-events-none absolute inset-0 rounded-full" />
            <span
              aria-hidden
              className="grid place-items-center rounded-full transition-transform duration-300 group-hover/cta:scale-110 group-hover/cta:-rotate-6"
              style={{ width: "clamp(34px, 3vw, 40px)", height: "clamp(34px, 3vw, 40px)", background: "#A6CF08", color: "#1D6315", boxShadow: "inset 0 -2px 0 rgba(29,99,21,0.18)" }}
            >
              <BookOpen size={18} strokeWidth={2.4} />
            </span>
            <span>Continue Learning</span>
          </button>
        </div>
      </div>
    </div>
  );
}
