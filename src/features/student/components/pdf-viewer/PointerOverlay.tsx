"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Rect } from "./pointerGeometry";

interface PointerOverlayProps {
  /** Target rect in the scroll-content container's coordinate space. */
  rect: Rect | null;
  label?: string;
  visible: boolean;
}

const ACCENT = "var(--tutor)";

// Fingertip position inside the hand SVG's viewBox. The hand is offset by this
// amount so the fingertip lands exactly on the anchor point.
const TIP_X = 9;
const TIP_Y = 8;
// Hand SVG width — used to mirror the hand about its centre.
const HAND_W = 48;

/**
 * The animated virtual teaching pointer: a highlight box over the target plus a
 * pointing hand that glides between targets. Driven entirely by `rect`, which is
 * resolved from the AI's pointer spec by usePointerResolver. Renders nothing
 * interactive — it sits above the PDF pages with pointer-events disabled.
 */
export function PointerOverlay({ rect, label, visible }: PointerOverlayProps) {
  const hasBox = !!rect && rect.width > 1 && rect.height > 1;
  // Anchor the fingertip at the target's top-left. The hand reaches in from the
  // left margin (mirrored) so its body sits beside the text, never over it.
  const anchorX = rect ? rect.x : 0;
  const anchorY = rect ? rect.y : 0;

  return (
    <AnimatePresence>
      {visible && rect && (
        <>
          {hasBox && (
            <motion.div
              key="ptr-box"
              data-testid="pointer-highlight"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              style={{
                position: "absolute",
                left: rect.x - 4,
                top: rect.y - 3,
                width: rect.width + 8,
                height: rect.height + 6,
                borderRadius: 6,
                border: `2px solid ${ACCENT}`,
                background: "rgba(91,77,199,0.12)",
                boxShadow: "0 4px 18px rgba(91,77,199,0.28)",
                pointerEvents: "none",
                zIndex: 30,
              }}
            >
              {/* Pulsing ring to draw the eye */}
              <motion.span
                aria-hidden
                animate={{ opacity: [0.55, 0, 0.55], scale: [1, 1.06, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  inset: -3,
                  borderRadius: 8,
                  border: `2px solid ${ACCENT}`,
                }}
              />
            </motion.div>
          )}

          {label && (
            <motion.div
              key="ptr-label"
              data-testid="pointer-label"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0, x: rect.x }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.22 }}
              style={{
                position: "absolute",
                left: 0,
                top: rect.y - 30,
                zIndex: 32,
                maxWidth: 260,
                padding: "4px 10px",
                borderRadius: 8,
                background: ACCENT,
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "var(--font-body)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                boxShadow: "0 6px 16px rgba(91,77,199,0.35)",
                pointerEvents: "none",
              }}
            >
              {label}
            </motion.div>
          )}

          {/* Pointing hand — glides to the anchor, with a gentle idle bob. */}
          <motion.div
            key="ptr-hand"
            data-testid="pointer-hand"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1, x: anchorX, y: anchorY }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{
              x: { type: "spring", stiffness: 220, damping: 24 },
              y: { type: "spring", stiffness: 220, damping: 24 },
              opacity: { duration: 0.2 },
              scale: { type: "spring", stiffness: 300, damping: 20 },
            }}
            style={{ position: "absolute", left: 0, top: 0, zIndex: 31, pointerEvents: "none" }}
          >
            <motion.div
              animate={{ x: [0, 3, 0], y: [0, -3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Mirror horizontally so the hand comes in from the left margin —
                  fingertip on the target's edge, body (fist) off to the left.
                  scaleX(-1) flips about the SVG centre, so the mirrored fingertip
                  lands at (HAND_W - TIP_X); translate brings it back to (0,0). */}
              <div
                style={{
                  transform: `translate(${TIP_X - HAND_W}px, ${-TIP_Y}px) scaleX(-1)`,
                }}
              >
                <HandSvg />
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** A friendly pointing hand (points up-left), fingertip at (TIP_X, TIP_Y). */
function HandSvg() {
  return (
    <svg width={48} height={52} viewBox="0 0 48 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ptr-skin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE2C4" />
          <stop offset="1" stopColor="#F2B98A" />
        </linearGradient>
        <filter id="ptr-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor="#1f2937" floodOpacity="0.35" />
        </filter>
      </defs>

      <g filter="url(#ptr-shadow)">
        {/* Dark outline layer (inflated copies behind the skin layer). */}
        <g stroke="#27324a" strokeWidth={3} strokeLinecap="round" fill="#27324a">
          <line x1={TIP_X} y1={TIP_Y} x2={24} y2={27} strokeWidth={13} />
          <line x1={18} y1={29} x2={9} y2={35} strokeWidth={11} />
          <rect x={15} y={22} width={25} height={25} rx={12.5} />
          <rect x={20} y={41} width={19} height={11} rx={5.5} fill={ACCENT} stroke={ACCENT} />
        </g>
        {/* Skin layer. */}
        <g strokeLinecap="round">
          <line x1={TIP_X} y1={TIP_Y} x2={24} y2={27} stroke="url(#ptr-skin)" strokeWidth={11} />
          <line x1={18} y1={29} x2={9} y2={35} stroke="url(#ptr-skin)" strokeWidth={9} />
          <rect x={16} y={23} width={23} height={23} rx={11.5} fill="url(#ptr-skin)" />
          {/* Brand cuff / sleeve at the wrist. */}
          <rect x={21} y={42} width={17} height={9} rx={4.5} fill={ACCENT} />
        </g>
      </g>
    </svg>
  );
}
