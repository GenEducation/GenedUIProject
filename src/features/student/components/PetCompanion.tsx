"use client";

import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { happy, mad, unsure, love, shy, surprised } from "blobatar/expression";
import type { Expression } from "blobatar";
import { useGaze } from "@blobatar/react/gaze";
import { useReducedMotion } from "framer-motion";
import { Settings2 } from "lucide-react";
import { StudentBlobatar } from "./StudentBlobatar";
import { PetTunerModal } from "./PetTunerModal";
import { PetEmotionLabel } from "./PetOverlayBadge";
import { PetFaceAccents } from "./PetFaceAccents";
import { usePetExpression } from "../hooks/usePetExpression";
import { usePetLocomotion, type LocoPhase } from "../hooks/usePetLocomotion";
import { useTutorLevelVar } from "../hooks/useVoiceLevels";
import {
  PET_EMOTIONS,
  cheerPose,
  encouragingPose,
  excitedPose,
  type PetEmotion,
} from "../theme/petExpressions";
import { resolveMove, wanderPick, PHYSICS } from "../utils/petLocomotion";
import { useTestStore } from "../store/useTestStore";
import {
  detectShake,
  createMood,
  onPat,
  onShake,
  onMove,
  SHAKE_WINDOW_MS,
  IRRITATED_MS,
  SHY_HOVER_MS,
  type PetMood,
  type ShakeSample,
} from "../utils/petGestures";
import { usePetStore, PET_MARGIN, type PetPosition } from "../store/usePetStore";
import { useHydrated } from "@/hooks/useHydrated";
import { GAZE } from "../theme/blobatar";

/**
 * The desk pet — an opt-in creature that floats above the student app and can
 * be dragged anywhere on screen.
 *
 * Mounted once in `app/student/layout.tsx`, beside the other global overlays,
 * for the reason those carry: it outlives any one route and must not remount
 * on navigation.
 *
 * Three things here are load-bearing rather than incidental:
 *
 *  1. The full-viewport wrapper is `pointer-events: none`, and only the
 *     creature itself takes pointer events back. Without that split, a fixed
 *     layer covering the viewport swallows every click in the app.
 *  2. Position is clamped into the viewport on mount and on resize. A pet
 *     dragged to the right edge of a 27" monitor is otherwise simply gone when
 *     the same student opens a laptop.
 *  3. `zIndex` sits above page content but below the modal layer, so the pet
 *     can never float over a dialog.
 */

/** Below the modal layer (1000) and the app's z-[19999]/z-[20000] tiers. */
const PET_Z = 900;
/** Movement under this is a click, not a drag. */
const DRAG_THRESHOLD = 4;

/**
 * A second click inside this window is a double-tap, not two pats.
 *
 * The pat is therefore *deferred* by this long rather than fired on the first
 * release — otherwise every dismissal would flash a happy pat on its way out.
 */
const DOUBLE_TAP_MS = 320;

interface PetCompanionProps {
  /**
   * Blocking flows suppress the pet: a draggable toy during a mandatory
   * placement test is a distraction, and onboarding already shows its own
   * creature inside the modal.
   */
  suppressed?: boolean;
}

export function PetCompanion({ suppressed = false }: PetCompanionProps) {
  const petEnabled = usePetStore((s) => s.petEnabled);
  const petPosition = usePetStore((s) => s.petPosition);
  const setPetPosition = usePetStore((s) => s.setPetPosition);
  const setPetEnabled = usePetStore((s) => s.setPetEnabled);
  // Student-set, so every measurement below reads it rather than a constant:
  // the clamp, the resting corner and the gear's offset all depend on it.
  const petSize = usePetStore((s) => s.petSize);

  const emotion = usePetExpression();
  const spec = PET_EMOTIONS[emotion];
  const petWander = usePetStore((s) => s.petWander);
  const burstId = usePetStore((s) => s.petBurst?.id ?? null);
  const burstEmotion = usePetStore((s) => s.petBurst?.emotion ?? null);
  const testInProgress = useTestStore((s) => !!s.currentTest && !s.testResult);
  const reducedMotion = useReducedMotion() ?? false;
  /** A gesture's reaction, which outranks the ambient pose while it holds. */
  const [reactionPose, setReactionPose] = useState<Expression | null>(null);
  const petTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Escalation state: how recently it was patted, shaken, shuffled about. */
  const mood = useRef<PetMood>(createMood());
  /** Pointer samples for the current drag, used to spot a shake. */
  const shakeSamples = useRef<ShakeSample[]>([]);
  /** Set when a drag turned into a shake, so the drop is not also "moved". */
  const shookThisDrag = useRef(false);

  // The pet watches the cursor wherever it goes on the page. This is the one
  // motion layer that needs JS, and it is what makes the thing read as alive
  // rather than as a sticker.
  const { ref: gazeRef, remeasure } = useGaze({ ...GAZE, lookAt: "pointer" });

  // Live position while a drag is in flight; `null` the rest of the time, when
  // the position is derived from the store instead.
  const [dragPos, setDragPos] = useState<PetPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const [tunerOpen, setTunerOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const shyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragState = useRef<{ dx: number; dy: number; ox: number; oy: number; moved: number } | null>(null);

  // Both stores read `localStorage` when they initialize, before hydration, so
  // without this gate the client's first render would show a pet the server
  // did not render at all.
  const hydrated = useHydrated();

  // Re-derive the position when the viewport changes size. A counter rather
  // than stored coordinates: the clamp below is the single source of truth, so
  // a resize only needs to make it run again.
  const [, onViewportChange] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const onResize = () => {
      onViewportChange();
      remeasure();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [remeasure]);

  const clamp = useCallback((p: PetPosition): PetPosition => {
    const maxX = Math.max(PET_MARGIN, window.innerWidth - petSize - PET_MARGIN);
    const maxY = Math.max(PET_MARGIN, window.innerHeight - petSize - PET_MARGIN);
    return {
      x: Math.min(Math.max(p.x, PET_MARGIN), maxX),
      y: Math.min(Math.max(p.y, PET_MARGIN), maxY),
    };
  }, [petSize]);

  /** Bottom-right, clear of the notification bell and the sidebar. */
  const defaultPosition = useCallback(
    (): PetPosition => ({
      x: window.innerWidth - petSize - 32,
      y: window.innerHeight - petSize - 32,
    }),
    [petSize],
  );

  // Derived, not stored: a saved position is clamped into the *current*
  // viewport on every render, so a pet dragged to the edge of a large monitor
  // is still reachable on a laptop instead of being stranded off-screen.
  const pos: PetPosition | null = !hydrated
    ? null
    : (dragPos ?? clamp(petPosition ?? defaultPosition()));

  useEffect(() => {
    return () => {
      if (petTimer.current) clearTimeout(petTimer.current);
      if (tapTimer.current) clearTimeout(tapTimer.current);
      if (shyTimer.current) clearTimeout(shyTimer.current);
    };
  }, []);

  // ── Movement ──────────────────────────────────────────────────────────────

  const {
    moverRef, bodyRef, cssMoveRef, shadowRef, fxRef,
    play, goTo, reset: resetLoco, burst, phase, moving,
  } = usePetLocomotion({ home: pos, size: petSize, reducedMotion });
  /** What the creature wears right now; the face marks are laid on the same pose. */
  const face = reactionPose ?? faceFor(emotion, phase);
  // Primitives, because `pos` is a fresh object every render.
  const homeX = pos?.x ?? null;
  const homeY = pos?.y ?? null;
  // Read inside timers without re-arming them on every trip.
  const movingRef = useRef(moving);
  const [loopEl, setLoopEl] = useState<HTMLDivElement | null>(null);
  useTutorLevelVar(loopEl, emotion === "speaking");
  const typing = useTyping();

  /**
   * Whether crossing the screen would get in the way right now. The emotion
   * still plays — `resolveMove` swaps a travelling move for its in-place
   * version — but the pet stays put while the student is working.
   */
  const travelSuppressed = useCallback(
    () =>
      typing ||
      testInProgress ||
      dragging ||
      hovered ||
      emotion === "listening" ||
      emotion === "speaking" ||
      isModalOpen(),
    [typing, testInProgress, dragging, hovered, emotion],
  );

  /** Play an emotion's move, then its follow-up once the first has had its moment. */
  const followUp = useRef<ReturnType<typeof setTimeout> | null>(null);
  const performEmotion = useCallback(
    (e: PetEmotion) => {
      const s = PET_EMOTIONS[e];
      const suppressed = travelSuppressed();
      const first = resolveMove(s.move, s.inPlace, suppressed);
      if (followUp.current) clearTimeout(followUp.current);
      if (first) play(first);
      // Particles are this emotion's own, whatever the move degraded to: a
      // Cheer mid-test still sparkles, it just does not cross the screen.
      if (s.particles && !reducedMotion) burst(s.particles.kind, s.particles.count);
      if (s.then) {
        const second = resolveMove(s.then, undefined, suppressed);
        if (second) {
          followUp.current = setTimeout(() => play(second), first && PHYSICS.has(first) ? 750 : 450);
        }
      }
    },
    [play, burst, reducedMotion, travelSuppressed],
  );

  // Perform on every new emotion, and again when the same burst fires twice
  // (two correct answers in a row are two hops, not one).
  const performedBurst = useRef<number | null>(null);
  const performedEmotion = useRef<PetEmotion | null>(null);
  const hasHome = homeX !== null;
  useEffect(() => {
    if (!hasHome) return;
    const repeatBurst = burstId !== null && burstId !== performedBurst.current && burstEmotion === emotion;
    if (emotion === performedEmotion.current && !repeatBurst) return;
    performedEmotion.current = emotion;
    if (burstEmotion === emotion) performedBurst.current = burstId;
    performEmotion(emotion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emotion, burstId, hasHome]);

  useEffect(() => () => {
    if (followUp.current) clearTimeout(followUp.current);
  }, []);

  // Thinking paces while it lasts, unless pacing would be in the way.
  useEffect(() => {
    if (emotion !== "thinking" || reducedMotion) return;
    const id = window.setInterval(() => {
      if (!travelSuppressed() && !movingRef.current) play("pace");
    }, 4200);
    return () => window.clearInterval(id);
  }, [emotion, reducedMotion, travelSuppressed, play]);

  // Wander, if the student turned it on: small excursions around home while idle.
  useEffect(() => {
    if (!petWander || emotion !== "idle" || reducedMotion || homeX === null || homeY === null) return;
    let t: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t = setTimeout(() => {
        if (!travelSuppressed() && !movingRef.current) {
          const pick = wanderPick(
            { minX: 16 - homeX, maxX: window.innerWidth - petSize - 16 - homeX, maxRise: homeY - 16 },
            Math.random,
            (x) => overlapsAvoidZone(homeX + x, homeY, petSize),
          );
          if (pick.target !== undefined && (pick.move === "walk" || pick.move === "run")) {
            goTo(pick.target, pick.move);
          } else {
            play(pick.move);
          }
        }
        schedule();
      }, 4000 + Math.random() * 4000);
    };
    schedule();
    return () => clearTimeout(t);
  }, [petWander, emotion, reducedMotion, homeX, homeY, petSize, travelSuppressed, play, goTo]);

  useEffect(() => {
    movingRef.current = moving;
    // The gaze driver caches the creature's box; re-read it once a trip ends.
    if (!moving) remeasure();
  }, [moving, remeasure]);

  /** Hold a pose for a while, then hand the buddy back to its ambient mood. */
  const fireReaction = (pose: Expression, holdMs: number) => {
    if (petTimer.current) clearTimeout(petTimer.current);
    setReactionPose(pose);
    petTimer.current = setTimeout(() => setReactionPose(null), holdMs);
  };

  /**
   * Looking at the buddy without touching it makes it bashful.
   *
   * Deliberately not while dragging: picking it up should not make it shy
   * mid-carry, and the gear badge shares this same `hovered` state.
   */
  useEffect(() => {
    if (shyTimer.current) clearTimeout(shyTimer.current);
    if (!hovered || dragging) return;
    shyTimer.current = setTimeout(() => fireReaction(shy, SHY_HOVER_MS), SHY_HOVER_MS);
    return () => {
      if (shyTimer.current) clearTimeout(shyTimer.current);
    };
  }, [hovered, dragging]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pos) return;
    // Picked up mid-trip: it comes home first, so the drag starts under the cursor.
    resetLoco();
    shakeSamples.current = [];
    shookThisDrag.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      dx: e.clientX - pos.x,
      dy: e.clientY - pos.y,
      // Origin of the gesture, so distance is measured from where the pointer
      // went down rather than from a `pos` that a re-render has already moved.
      ox: e.clientX,
      oy: e.clientY,
      moved: 0,
    };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragState.current;
    if (!d) return;
    const next = clamp({ x: e.clientX - d.dx, y: e.clientY - d.dy });
    d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.ox, e.clientY - d.oy));
    setDragPos(next);

    // Shaking is answered mid-drag, not on release: the reaction has to land
    // while the student is still shaking or the cause is lost.
    const now = Date.now();
    shakeSamples.current = [
      ...shakeSamples.current.filter((sm) => now - sm.t <= SHAKE_WINDOW_MS),
      { x: e.clientX, y: e.clientY, t: now },
    ];
    if (detectShake(shakeSamples.current, now)) {
      const r = onShake(mood.current, now);
      mood.current = r.mood;
      shookThisDrag.current = true;
      // Clearing the buffer is the refractory period — without it a held
      // shake would re-fire on every frame.
      shakeSamples.current = [];
      fireReaction(mad, r.holdMs);
    }
    // The gaze driver caches the creature's box; it re-reads on scroll and
    // resize on its own, but a drag moves the box without either.
    remeasure();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragState.current;
    const landed = dragPos;
    dragState.current = null;
    setDragging(false);
    setDragPos(null);
    if (!d) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    // Read once, at the moment the gesture actually ended — both the pat and
    // the move are timed from here, not from whenever a timer later fires.
    // eslint-disable-next-line react-hooks/purity -- a pointer event handler, not render: it only runs from a real gesture, and the escalation windows are meaningless without a wall clock.
    const now = Date.now();

    if (d.moved < DRAG_THRESHOLD) {
      // Barely moved: a tap. Whether it is a pat or a dismissal depends on
      // whether a second one arrives, so resolve it on a timer rather than
      // immediately.
      if (tapTimer.current) {
        // Second tap inside the window — send the buddy away.
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
        dismiss();
        return;
      }
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        const r = onPat(mood.current, now);
        mood.current = r.mood;
        fireReaction(r.reaction === "love" ? love : happy, r.holdMs);
      }, DOUBLE_TAP_MS);
      return;
    }

    // A drag that was a shake does not also count as shuffling it about —
    // otherwise a vigorous shake resolves `mad` → `unsure` back to back, which
    // reads as a glitch rather than as two feelings.
    if (!shookThisDrag.current) {
      const r = onMove(mood.current, now);
      mood.current = r.mood;
      if (r.irritated) fireReaction(unsure, IRRITATED_MS);
    }
    // Hand the landing spot to the store, which persists it; `pos` then reads
    // back out of the store on the next render.
    if (landed) setPetPosition(landed);
  };

  /**
   * Double-tap sends the buddy away.
   *
   * It leaves nothing behind. An earlier version showed a chip saying where to
   * turn it back on, but it outstayed its welcome every time — and the buddy
   * is recoverable from Profile → Settings, which now carries a "Your Buddy"
   * row of its own, so the dismissal does not strand anyone.
   */
  const dismiss = () => {
    if (petTimer.current) clearTimeout(petTimer.current);
    setReactionPose(null);
    setPetEnabled(false);
  };

  if (!petEnabled || suppressed || !pos) return null;

  const leanTowardStudent = pos.x + petSize / 2 < window.innerWidth / 2 ? "6deg" : "-6deg";

  return (
    <div
      // Decorative: everything the pet conveys — who the student is, that the
      // tutor is responding — is already announced by real DOM elsewhere. It
      // stays out of the tab order rather than becoming something keyboard
      // users must pass on every page.
      aria-hidden="true"
      // Only the creature inside takes pointer events back; see the header.
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: PET_Z }}
    >
      <div
        className="hidden md:block"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: petSize,
          height: petSize,
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          // The home box itself takes no pointer: the creature (`mover`) does,
          // wherever it has walked to, and its events bubble up here.
          pointerEvents: "none",
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none",
          // Eased while idle so a clamp glides, instant while dragging so the
          // creature stays under the cursor instead of trailing it.
          transition: dragging ? "none" : "transform 0.25s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* Contact shadow: stays on the ground and shrinks as the pet leaves it. */}
        <div
          ref={shadowRef}
          style={{
            position: "absolute",
            left: petSize * 0.2,
            top: petSize - 8,
            width: petSize * 0.6,
            height: 10,
            borderRadius: "50%",
            background: "radial-gradient(closest-side, rgba(15,23,42,0.22), rgba(15,23,42,0))",
            pointerEvents: "none",
          }}
        />
        {/* Dust and confetti land here, not on the moving creature. */}
        <div ref={fxRef} style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }} />

        <div ref={moverRef} style={{ position: "absolute", inset: 0, pointerEvents: "auto", willChange: "transform" }}>
          <div ref={bodyRef} className="pet-body" style={{ width: "100%", height: "100%" }}>
            <div ref={cssMoveRef} className="pet-css-move" style={{ width: "100%", height: "100%" }}>
              <div
                ref={setLoopEl}
                className={`pet-loop${spec.loop && !reducedMotion ? ` pet-loop-${spec.loop}` : ""}`}
                style={{
                  width: "100%",
                  height: "100%",
                  filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.18))",
                  // Lean toward the middle of the screen, where the student's work is.
                  "--pet-lean": leanTowardStudent,
                } as React.CSSProperties}
              >
                <StudentBlobatar
                  size={petSize}
                  animate="always"
                  expression={face}
                  gazeRef={gazeRef}
                  decorative
                />
                {/* The emotion's own marks (blush, glints, "?"…), on the face
                    it is wearing — not during a gesture reaction, whose face
                    is someone else's. */}
                {!reactionPose && spec.accent && (
                  <PetFaceAccents accent={spec.accent} host={loopEl} />
                )}
              </div>
            </div>
          </div>
          {/* Debugging: the emotion's name instead of its icon badge. To bring
              the icons back, swap this for
              `{!reactionPose && spec.overlay && <PetOverlayBadge overlay={spec.overlay} size={petSize} />}`. */}
          <PetEmotionLabel emotion={emotion} reacting={reactionPose !== null} size={petSize} />
        </div>

        {/* Tune, without leaving the page. Revealed on hover so the pet is a
            creature at rest rather than a widget with chrome bolted on.

            A mouse affordance by design: this whole overlay is `aria-hidden`
            (see above), and both of the things it shortcuts — the customizer
            and the on/off switch — have labelled, keyboard-reachable
            equivalents on the profile page. It shortens a journey; it is not
            the only route to one. */}
        {/* eslint-disable-next-line no-restricted-syntax -- a 26px badge pinned to a dragging creature, deliberately out of the tab order; <Button>'s sizing, focus ring and hover states all fight that. */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            // A tap already in flight would otherwise resolve into a pat
            // behind the open tuner.
            if (tapTimer.current) {
              clearTimeout(tapTimer.current);
              tapTimer.current = null;
            }
            setTunerOpen(true);
          }}
          tabIndex={-1}
          title="Tune your buddy"
          style={{
            position: "absolute",
            right: -4,
            bottom: -4,
            width: 26,
            height: 26,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #fff",
            background: "#fff",
            color: "#4A5568",
            boxShadow: "0 2px 8px rgba(0,0,0,0.22)",
            cursor: "pointer",
            padding: 0,
            opacity: hovered && !dragging ? 1 : 0,
            transform: hovered && !dragging ? "scale(1)" : "scale(0.8)",
            transition: "opacity 0.15s, transform 0.15s",
            pointerEvents: hovered && !dragging ? "auto" : "none",
          }}
        >
          <Settings2 size={13} />
        </button>
      </div>

      {/* Mounted inside the overlay, which is `pointer-events: none`; the
          modal sets its own `auto`, and its z-index (1000) puts it above the
          pet rather than beside it. */}
      <div style={{ pointerEvents: "auto" }}>
        <PetTunerModal
          isOpen={tunerOpen}
          onClose={() => setTunerOpen(false)}
          showPetSettings
        />
      </div>
    </div>
  );
}

/**
 * The face to wear, given the emotion and where the body is in a move.
 *
 * Most emotions keep their own face throughout. The ambient ones borrow a face
 * from the move instead — a wandering pet looks up as it rises and grins as it
 * lands — and Cheer is wide-eyed on the way up, its "yes!" on the way down.
 */
function faceFor(emotion: PetEmotion, phase: LocoPhase): Expression {
  if (emotion === "idle") {
    if (phase === "rising") return excitedPose;
    if (phase === "falling") return happy;
    if (phase === "running") return encouragingPose;
  }
  if (emotion === "cheer" && phase === "rising") return surprised;
  if (emotion === "cheer") return cheerPose;
  return PET_EMOTIONS[emotion].face;
}

/** Whether a modal dialog is open — the pet never runs about behind one. */
function isModalOpen(): boolean {
  if (typeof document === "undefined") return false;
  return !!document.querySelector('[aria-modal="true"], [role="dialog"]:not([aria-hidden="true"])');
}

/** Whether a pet box at (x, y) would sit on anything marked `data-pet-avoid`. */
function overlapsAvoidZone(x: number, y: number, size: number): boolean {
  if (typeof document === "undefined") return false;
  const zones = document.querySelectorAll<HTMLElement>("[data-pet-avoid]");
  for (const z of zones) {
    const r = z.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (x < r.right && x + size > r.left && y < r.bottom && y + size > r.top) return true;
  }
  return false;
}

/**
 * Whether the student is typing somewhere — tracked from focus, so the pet
 * stays put while a text field has the caret.
 */
function useTyping(): boolean {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const isEditable = (el: Element | null) =>
      !!el &&
      (el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLInputElement && !["button", "checkbox", "radio", "range", "submit"].includes(el.type)) ||
        (el as HTMLElement).isContentEditable);
    const sync = () => setTyping(isEditable(document.activeElement));
    // On focusout the new element is not focused yet; read after it settles.
    const onOut = () => window.setTimeout(sync, 0);
    document.addEventListener("focusin", sync);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", sync);
      document.removeEventListener("focusout", onOut);
    };
  }, []);
  return typing;
}
