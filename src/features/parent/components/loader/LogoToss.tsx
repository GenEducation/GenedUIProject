"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * The Zoovi logo assembling itself (the loader's centrepiece; the name is kept from the GenEd cap toss it replaced).
 * The letters "z o o v" and the stem of the "i" spring up from the baseline one after another, then the lime dot
 * drops onto the "i" and bounces to rest, as on the Zoovi website, where the dot grows into the device.
 *
 * Every piece is the real logo artwork: the letters are /brand/zoovi-logo-nodot.png clipped to each letter's
 * columns, and the dot is /brand/zoovi-logo-dot.png placed where it sits in the logo, so once settled they line up
 * into exactly the logo.
 */

const NODOT = "/brand/zoovi-logo-nodot.png";
const DOT = "/brand/zoovi-logo-dot.png";
const LOGO_W = 1063;
const LOGO_H = 365;
export const LOGO_BOX = { width: LOGO_W, height: LOGO_H };

// Each letter's columns in the logo image (px), measured from its alpha.
const LETTERS: [number, number][] = [[12, 226], [244, 445], [476, 677], [709, 931], [966, 1054]];
// The i's dot: centred at (95.06%, 15.07%) of the logo, 8.47% of its width across (90 x 87 px).
const DOT_BOX = { left: 95.06 - 8.47 / 2, top: 15.07 - (87 / LOGO_H) * 50, width: 8.47, height: (87 / LOGO_H) * 100 };

const STAGGER = 0.11;
const LETTERS_IN = 0.15 + LETTERS.length * STAGGER;
const DOT_AT = LETTERS_IN + 0.15;
/** When the logo has come to rest; the loader holds at least this long, so the logo is always seen assembled. */
export const TOSS_SETTLE_MS = Math.round((DOT_AT + 0.9) * 1000);

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;
const fill: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", userSelect: "none" };

export function LogoToss({ reduceMotion }: { reduceMotion: boolean }) {
  if (reduceMotion) {
    return (
      <div className="relative h-full w-full" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- sized by its container, like the animated pieces */}
        <img src="/brand/zoovi-logo.png" alt="" style={fill} draggable={false} />
      </div>
    );
  }
  return (
    <div className="relative h-full w-full" aria-hidden="true">
      {LETTERS.map(([x0, x1], i) => (
        <motion.img
          key={i}
          src={NODOT}
          alt=""
          draggable={false}
          style={{
            ...fill,
            clipPath: `inset(0 ${pct(LOGO_W - x1 - 1, LOGO_W)} 0 ${pct(x0, LOGO_W)})`,
            transformOrigin: `${pct((x0 + x1) / 2, LOGO_W)} 92%`,
          }}
          initial={{ opacity: 0, y: "18%", scaleY: 0.4, scaleX: 0.85 }}
          animate={{ opacity: 1, y: "0%", scaleY: 1, scaleX: 1 }}
          transition={{
            delay: 0.15 + i * STAGGER,
            opacity: { duration: 0.12, delay: 0.15 + i * STAGGER },
            type: "spring",
            stiffness: 420,
            damping: 14,
            mass: 0.7,
          }}
        />
      ))}
      <motion.img
        src={DOT}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: `${DOT_BOX.left}%`,
          top: `${DOT_BOX.top}%`,
          width: `${DOT_BOX.width}%`,
          height: `${DOT_BOX.height}%`,
          pointerEvents: "none",
        }}
        initial={{ opacity: 0, y: "-320%", rotate: -60 }}
        animate={{ opacity: 1, y: "0%", rotate: 0 }}
        transition={{
          delay: DOT_AT,
          opacity: { duration: 0.1, delay: DOT_AT },
          type: "spring",
          stiffness: 520,
          damping: 11,
          mass: 0.6,
        }}
      />
    </div>
  );
}
