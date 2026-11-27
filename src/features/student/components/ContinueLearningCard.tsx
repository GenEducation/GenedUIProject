"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen } from "lucide-react";

import { STUDENT_COLORS } from "../theme/colors";
import { HERO_TIDE, type TideTrack } from "../theme/heroTide";
import { heroScene, type HeroScene } from "../theme/heroScenes";

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
/** The subject scenes' wash: as strong behind the text, gone sooner, so the start of the progress path shows. */
const WASH_SCENE = "linear-gradient(90deg, rgba(244,248,230,0.95) 0%, rgba(244,248,230,0.86) 40%, rgba(244,248,230,0) 66%)";
/** The title: a deeper forest green than body text, with a soft paper halo so it lifts off the scene. */
const TITLE_INK = "rgb(16,58,12)";
const HALO = "0 1px 0 rgba(255,255,255,0.7), 0 0 14px rgba(244,248,230,0.95), 0 0 2px rgba(244,248,230,0.9)";
const FILL = "#8DB000";
const REVEAL = "opacity .45s ease-out, transform .7s cubic-bezier(.3,1.5,.5,1)";

/**
 * The entrance plays on a page load, and again when the student comes back from a lesson (the lesson page calls
 * replayHeroIntro); moving between other pages within the app doesn't replay it. Module state resets on a reload; on
 * the server it stays false (effects never run there), so the first client render matches the server's.
 */
let introPlayed = false;

/** Play the entrance again the next time the dashboard shows (called by the lesson page). */
export function replayHeroIntro() {
  introPlayed = false;
}

/**
 * The entrance videos, downloaded whole before they play (so a slow network never stutters or holds up the card):
 * object URLs by source, kept for the session, so a second visit plays at once.
 */
const downloaded = new Map<string, string>();
const downloading = new Map<string, Promise<string>>();

function downloadVideo(src: string): Promise<string> {
  const ready = downloaded.get(src);
  if (ready) return Promise.resolve(ready);
  let p = downloading.get(src);
  if (!p) {
    p = fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`video ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        downloaded.set(src, url);
        return url;
      })
      .finally(() => downloading.delete(src));
    downloading.set(src, p);
  }
  return p;
}

/** Whether motion is off for this visitor (reduced motion, or Save-Data). Browser only. */
function motionOff(): boolean {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  return reduce || saveData;
}

/** The entrance video for this width (null where there's none: a scene on a phone). Browser only. */
function videoFor(media: HeroMedia): string | null {
  const v = window.matchMedia("(min-width: 640px)").matches ? media.video.lg : media.video.sm;
  return v ? pickSource(v) : null;
}

/** The entrance video, if it's already downloaded (a second visit) and will play. Null on the server. */
function readyVideo(media: HeroMedia): string | null {
  if (typeof window === "undefined" || motionOff()) return null;
  const src = videoFor(media);
  return (src && downloaded.get(src)) || null;
}

/** WebM where the browser plays it (smaller), MP4 otherwise. */
function pickSource(v: { webm: string; mp4: string }): string {
  const probe = document.createElement("video");
  return probe.canPlayType?.("video/webm") ? v.webm : v.mp4;
}

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
  /** The chapter's number in its book, for the eyebrow ("English · Chapter 3"). Omitted when unknown. */
  chapterNumber?: number;
  /** Steps done of the lesson's total, beside the bar ("2 of 19 steps"); the bar alone when unknown. */
  steps?: { done: number; total: number };
  /** A chapter finished once and open again (reviewing sections, or started over): a lime "Revisiting" tag. */
  revisiting?: boolean;
  /** The chapter's subject: English, Mathematics and Science get their own scene (heroScenes.ts), others the tide. */
  subject?: string;
  onStart: () => void;
  style?: React.CSSProperties;
}

/**
 * - loading: the video's first frame shows, with the text, while the video downloads; it plays once it's in;
 * - waiting: the video is already downloaded (a second visit), so the text holds back for the full entrance;
 * - playing: the video plays (the text surfaces as the front passes it, unless it was already showing);
 * - static: the finished still (reduced motion, Save-Data, a scene on a phone, or the video failed).
 */
type Phase = "loading" | "waiting" | "playing" | "static";

/** What the card plays: a subject's scene (heroScenes.ts) or the tide (heroTide.ts), in one shape. */
interface HeroMedia {
  width: number;
  height: number;
  poster: { lg: string; sm: string };
  /** The videos' first frames, shown while they download (none where there's no video). */
  start: { lg: string; sm: string | null };
  video: { lg: { webm: string; mp4: string }; sm: { webm: string; mp4: string } | null };
  track: string;
  focusX: number;
  /** The phone strip's frame and focus (a scene has its own phone framing; the tide reuses its desktop frame). */
  phone: { width: number; height: number; focusX: number };
  waitForVideo: number;
}

function heroMedia(scene: HeroScene | null): HeroMedia {
  if (scene) {
    return { width: scene.width, height: scene.height, poster: scene.poster, start: { lg: scene.start, sm: null }, video: { lg: scene.video, sm: null }, track: scene.track, focusX: scene.focusX, phone: scene.phone, waitForVideo: scene.waitForVideo };
  }
  return {
    width: HERO_TIDE.width,
    height: HERO_TIDE.height,
    poster: HERO_TIDE.poster,
    start: HERO_TIDE.start,
    video: HERO_TIDE.video,
    track: HERO_TIDE.track,
    focusX: HERO_TIDE.focusX,
    phone: { width: HERO_TIDE.width, height: HERO_TIDE.height, focusX: HERO_TIDE.focusX },
    waitForVideo: HERO_TIDE.waitForVideo,
  };
}

/** Where a frame-space crop lands in a box the frame covers (object-fit: cover at focusX, centred vertically). */
function placeCrop(box: { width: number; height: number }, frame: [number, number], crop: [number, number, number, number], focusX: number) {
  const k = Math.max(box.width / frame[0], box.height / frame[1]);
  const offX = (box.width - frame[0] * k) * focusX;
  const offY = (box.height - frame[1] * k) / 2;
  return { left: offX + crop[0] * k, top: offY + crop[1] * k, width: crop[2] * k, height: crop[3] * k };
}
const PARTS = 4; // eyebrow, title, step count, button (the step count sits beside the button)

/**
 * Dashboard hero for the chapter the student is part-way through. The whole card is one rendered scene. English,
 * Mathematics and Science have their own (heroScenes.ts): the subject card's diorama made grand, with a journey in
 * it (the boat's voyage to the lighthouse, the bridge built panel by panel, the constellation drawn star by star)
 * that plays through to its end as the scene comes in, and ripples the button when it gets there. Other subjects get a noria
 * on a river (heroTide.ts): a tide rolls in, turns the wheel and fills the bucket. Either way, on the first load of
 * the page the eyebrow, title, progress and button surface as the scene's front (the beam, the light, the crest)
 * passes them.
 *
 * Delivery: the still of the last frame shows at once (the card is never blank); the video loads in the
 * background and plays only if it's ready within HERO_TIDE.waitForVideo, otherwise the text simply shows over
 * the still. Reduced motion and Save-Data skip the video entirely.
 */
export function ContinueLearningCard({
  session,
  chapterNumber,
  steps,
  revisiting = false,
  subject,
  onStart,
  style,
}: ContinueLearningCardProps) {
  const scene = useMemo(() => heroScene(subject), [subject]);
  const media = useMemo(() => heroMedia(scene), [scene]);
  const percent = Math.max(0, Math.min(100, session.mastery));
  const eyebrow = [session.vis.label, chapterNumber ? `Chapter ${chapterNumber}` : null].filter(Boolean).join(" · ");

  // Whether this card is the page load's first (decided once per instance, so StrictMode's second effect run in
  // development, or any re-run, sees the same answer instead of skipping the intro and leaving the text hidden).
  const [first] = useState(() => !introPlayed);
  // A video already downloaded plays the full entrance at once (text held back); otherwise the first frame and the
  // text show straight away while it downloads. Decided at the first render so the text never flashes up and away.
  // (A reload empties the downloads, so the server's render and the first client render agree.)
  const [preloaded] = useState(() => (first ? readyVideo(media) : null));
  const [phase, setPhase] = useState<Phase>(() => (!first ? "static" : preloaded ? "waiting" : "loading"));
  const [shown, setShown] = useState<boolean[]>(() => Array(PARTS).fill(false));
  const [video, setVideo] = useState<string | null>(null);
  // The text came up before the video played (it was still downloading): it stays up rather than surfacing again.
  const [textEarly, setTextEarly] = useState(first && !preloaded);
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const cardRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const partRefs = useRef<(HTMLElement | null)[]>([]);
  const trackRef = useRef<TideTrack | null>(null);

  // The journey drawn into a subject's scene: it always plays through to its end (the boat reaches the lighthouse,
  // the bridge is built, the constellation drawn), walking from the start on the first load and shown finished
  // otherwise. The student's own progress is the bar's job, not the picture's. Also where the layer sits over the
  // scene (measured from the scene box).
  const target = scene ? scene.progress.states - 1 : 0;
  const [pstate, setPstate] = useState(() => (first ? 0 : target));
  const [box, setBox] = useState<{ width: number; height: number; phone: boolean } | null>(null);
  const walkRaf = useRef(0);
  const walked = useRef(false);

  const ripple = useCallback(() => {
    ringRef.current?.animate(
      [{ boxShadow: "0 0 0 0 rgba(166,207,8,0.75)" }, { boxShadow: "0 0 0 16px rgba(166,207,8,0)" }],
      { duration: 900, iterations: 2, easing: "ease-out" },
    );
  }, []);

  /** Each step of the journey: the whole of it takes about two seconds. */
  const stepTime = 0.11;

  /** The progress state at `t` seconds after the walk began. */
  const stateAt = useCallback((t: number) => (t < 0 ? 0 : Math.min(target, Math.floor(t / stepTime) + 1)), [target, stepTime]);

  // Walk by the clock: when there's no video to follow (phones, or the video came too late).
  const walkByClock = useCallback((delay: number) => {
    if (!scene || walked.current) return;
    walked.current = true;
    const t0 = performance.now() + delay * 1000;
    const tick = () => {
      const st = stateAt((performance.now() - t0) / 1000);
      setPstate(st);
      if (st < target) walkRaf.current = requestAnimationFrame(tick);
      else if (target > 0) ripple();
    };
    walkRaf.current = requestAnimationFrame(tick);
  }, [scene, stateAt, target, ripple]);
  useEffect(() => () => cancelAnimationFrame(walkRaf.current), []);

  // The scene box: the layer's place over it, and which framing shows (the phone strip or the whole card).
  useEffect(() => {
    const el = sceneRef.current;
    if (!scene || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setBox({ width: r.width, height: r.height, phone: window.matchMedia("(max-width: 639px)").matches });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [scene]);

  // Decide whether to play: the first frame shows at once while the video downloads in the background, and the
  // animation plays once it's in. A video already downloaded (a second visit) plays the full entrance straight away.
  useEffect(() => {
    introPlayed = true;
    if (!first) return;
    let alive = true;
    let grace = 0;
    const toStatic = () => {
      if (!alive) return;
      setPhase("static");
      setTextEarly(true);
      walkByClock(0);
    };
    // Decided in a task after the first paint (the browser-only checks can't run during render).
    const start = window.setTimeout(() => {
      if (motionOff()) {
        walked.current = true;
        setPstate(target);
        setPhase("static");
        return;
      }
      const src = videoFor(media);
      if (!src) {
        // A scene on a phone: its own poster, no video; the text comes up and the progress walks by the clock.
        setPhase("static");
        walkByClock(0.35);
        return;
      }
      fetch(media.track)
        .then((r) => (r.ok ? r.json() : null))
        .then((t: TideTrack | null) => { trackRef.current = t; })
        .catch(() => {});
      const ready = preloaded ?? downloaded.get(src);
      if (ready) {
        // Already here: the text holds back for the full entrance, but never longer than waitForVideo.
        setVideo(ready);
        grace = window.setTimeout(() => {
          if (phaseRef.current === "waiting") { setPhase("loading"); setTextEarly(true); }
        }, media.waitForVideo);
        return;
      }
      downloadVideo(src).then((url) => alive && setVideo(url), toStatic);
    }, 0);
    return () => { alive = false; window.clearTimeout(start); window.clearTimeout(grace); };
  }, [first, preloaded, media, target, walkByClock]);

  // Once it can play: play it, from the first frame that's showing.
  const onReady = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.paused || v.ended) return;
    if (phaseRef.current !== "loading" && phaseRef.current !== "waiting") return;
    v.play().then(() => setPhase("playing")).catch(() => { setPhase("static"); setTextEarly(true); walkByClock(0); });
  }, [walkByClock]);

  useEffect(() => {
    if (phase !== "playing") return;
    const card = cardRef.current, v = videoRef.current;
    if (!card || !v) return;
    const rect = card.getBoundingClientRect();
    const centres = partRefs.current.map((el) => {
      if (!el) return 0;
      const b = el.getBoundingClientRect();
      return b.left - rect.left + b.width / 2;
    });
    // The frame is shown object-fit: cover, positioned at focusX: map a frame x (0..1) to card px.
    const k = Math.max(rect.width / media.width, rect.height / media.height);
    const dispW = media.width * k;
    const offX = (rect.width - dispW) * media.focusX;
    const stacked = rect.width < 640;
    let raf = 0, rang = false;
    if (scene) walked.current = true; // the progress follows the video from here
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
      if (scene) {
        // the progress walks up to the student's step; the button ripples when it gets there
        const st = stateAt(t - scene.progressAt);
        setPstate(st);
        if (!rang && t >= scene.progressAt && st >= target) { rang = true; if (target > 0) ripple(); }
      } else if (!rang && t >= HERO_TIDE.bucketFullAt) {
        rang = true;
        ripple();
      }
      if (!v.ended) raf = requestAnimationFrame(tick);
      else {
        setShown(Array(PARTS).fill(true));
        if (scene) setPstate(target);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, media, scene, stateAt, target, ripple]);

  const part = (i: number): React.CSSProperties =>
    phase === "static" || textEarly || shown[i]
      ? { opacity: 1, transform: "none", transition: REVEAL }
      : { opacity: 0, transform: "translateY(14px)", transition: REVEAL };
  const setPart = (i: number) => (el: HTMLElement | null) => { partRefs.current[i] = el; };
  const barFull = phase === "static" || textEarly || shown[3];
  const phone = box?.phone ?? false;
  const objectPosition = `${(phone ? media.phone.focusX : media.focusX) * 100}% 50%`;
  const sprite = scene ? (phone ? scene.progress.sm : scene.progress.lg) : null;
  const layer = scene && sprite && box ? placeCrop(box, sprite.frame, sprite.crop, phone ? media.phone.focusX : media.focusX) : null;
  const spritePos = (st: number) => {
    if (!scene) return "0 0";
    const { cols, rows } = scene.progress;
    return `${cols > 1 ? ((st % cols) / (cols - 1)) * 100 : 0}% ${rows > 1 ? (Math.floor(st / cols) / (rows - 1)) * 100 : 0}%`;
  };

  return (
    <div className="relative mb-8 mt-2" style={style}>
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-[26px] flex flex-col sm:block"
        style={{ background: SKY, minHeight: "clamp(280px, 27vw, 390px)" }}
      >
        {/* The scene: a strip above the text on phones, the whole card from sm up. */}
        <div ref={sceneRef} aria-hidden="true" className="relative h-[190px] sm:absolute sm:inset-0 sm:h-auto pointer-events-none select-none">
          <picture>
            <source media="(max-width: 639px)" srcSet={media.poster.sm} />
            <img src={media.poster.lg} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition }} />
          </picture>
          {/* The video's first frame, over the finished still while the video downloads (and until it plays). */}
          {first && (
            <picture>
              {media.start.sm ? <source media="(max-width: 639px)" srcSet={media.start.sm} /> : <source media="(max-width: 639px)" srcSet={media.poster.sm} />}
              <img
                data-testid="hero-start"
                src={media.start.lg}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition, opacity: phase === "loading" || phase === "waiting" ? 1 : 0, transition: phase === "playing" ? "none" : "opacity .4s" }}
              />
            </picture>
          )}
          {video && (
            <video
              ref={videoRef}
              muted
              playsInline
              preload="auto"
              src={video}
              onCanPlay={onReady}
              onError={() => { setPhase("static"); setTextEarly(true); walkByClock(0); }}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition, opacity: phase === "playing" ? 1 : 0 }}
            />
          )}
          <div className="hidden sm:block absolute inset-y-0 left-0 w-[60%]" style={{ background: scene ? WASH_SCENE : WASH }} />
          {/* The lesson's progress, drawn into the scene: one frame of the sprite per state, over the scene */}
          {scene && sprite && layer && (
            <div
              data-testid="hero-progress"
              data-state={pstate}
              className="absolute"
              style={{
                ...layer,
                backgroundImage: `url(${sprite.src})`,
                backgroundSize: `${scene.progress.cols * 100}% ${scene.progress.rows * 100}%`,
                backgroundPosition: spritePos(pstate),
                backgroundRepeat: "no-repeat",
              }}
            />
          )}
        </div>

        {/* Editorial: the eyebrow and a big title anchored bottom-left, the button with the step count beneath, and the
            progress as a lime strip along the card's bottom edge (on phones, the text sits under the scene strip). */}
        <div
          className="relative z-[1] sm:absolute sm:left-0 sm:bottom-0 sm:max-w-[56%]"
          style={{ padding: "clamp(20px, 2.8vw, 40px) clamp(20px, 2.8vw, 40px) clamp(28px, 3.2vw, 44px)" }}
        >
          {/* Eyebrow: what the chapter is, quietly; a lime tag when it's a revisit (lime always means "you"). */}
          <div
            ref={setPart(0)}
            className="flex flex-wrap items-center gap-2 font-bold uppercase"
            style={{ color: C.textMid, letterSpacing: "0.12em", fontSize: "clamp(11px, 0.95vw, 12px)", textShadow: HALO, ...part(0) }}
          >
            <span>{eyebrow}</span>
            {revisiting && (
              <span
                className="rounded-full normal-case"
                style={{ background: "#A6CF08", color: TITLE_INK, letterSpacing: "0.02em", padding: "2px 10px", textShadow: "none" }}
              >
                Revisiting
              </span>
            )}
          </div>

          <h2
            ref={setPart(1)}
            className="m-0 mt-2 font-extrabold"
            style={{
              color: TITLE_INK,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(30px, 4.4vw, 58px)",
              lineHeight: 1.02,
              textWrap: "balance",
              textShadow: HALO,
              ...part(1),
            }}
          >
            {session.title}
          </h2>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          {/* CTA: a deep-green pill with a lime "open book" badge; on hover the badge grows and the pill lifts */}
          <button
            ref={setPart(3)}
            type="button"
            onClick={onStart}
            className="group/cta relative inline-flex items-center rounded-full border-none cursor-pointer font-bold outline-none focus-visible:ring-4 focus-visible:ring-[rgba(166,207,8,0.55)]"
            style={{
              background: "linear-gradient(180deg, #2E8228 0%, #22661F 100%)",
              color: "#FFFFFF",
              gap: 12,
              padding: "6px clamp(20px, 2.2vw, 26px) 6px 6px",
              fontSize: "clamp(14px, 1.35vw, 16px)",
              fontFamily: "var(--font-body)",
              letterSpacing: "0.01em",
              boxShadow: "0 10px 22px rgba(34,102,31,0.30), inset 0 1px 0 rgba(255,255,255,0.18)",
              ...part(3),
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
            {/* Where the student is: the count beside the button (the strip along the card's edge shows it too) */}
            <span ref={setPart(2)} className="font-bold" style={{ color: C.textMid, fontSize: "clamp(12px, 1.05vw, 14px)", textShadow: HALO, ...part(2) }}>
              {steps && steps.total > 0 ? `${steps.done} of ${steps.total} steps · ${percent}%` : `${percent}% done`}
            </span>
          </div>
        </div>

        {/* Progress: a lime strip along the card's bottom edge, on the renders' stone-sage paper */}
        <div
          className="absolute inset-x-0 bottom-0 z-[1]"
          style={{ height: 7, background: "rgba(228,233,214,0.92)" }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${session.title} progress`}
        >
          <div
            className="h-full"
            style={{
              width: `${barFull ? percent : 0}%`,
              background: FILL,
              borderRadius: "0 4px 4px 0",
              transition: "width 0.9s cubic-bezier(0.22,1,0.36,1) .15s",
            }}
          />
        </div>
      </div>
    </div>
  );
}
