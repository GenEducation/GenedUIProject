"use client";

// The lesson's voice bar: status, mirrored waveform around the mic, End.
// Phase timings are passed in so a scene can script one turn of talk.

import { Mic, PhoneOff } from "lucide-react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import type { Progress, Range } from "../primitives";
import { TUTOR } from "../filmScript";

const BARS = 13;

export interface VoiceScript {
  /** Child speaking (mic glows citron, bars jump). */
  hearing: Range;
  /** Tutor answering (bars turn citron). */
  speaking: Range;
  /** What the bar shows it heard, while hearing. */
  heard: string;
}

function phase(v: number, s: VoiceScript): { label: string; dot: string; level: number } {
  if (v < s.hearing[0] - 0.05) return { label: "Listening…", dot: "#075E63", level: 0.12 };
  if (v < s.hearing[1]) return { label: "Hearing you", dot: "#B8D63F", level: 0.85 };
  if (v < s.speaking[0]) return { label: `${TUTOR.name} is thinking…`, dot: "#5FA8A3", level: 0.06 };
  if (v < s.speaking[1]) return { label: `${TUTOR.name} is speaking`, dot: "#B8D63F", level: 0.6 };
  return { label: "Listening…", dot: "#075E63", level: 0.12 };
}

export function VoiceBar({ p, script }: { p: Progress; script: VoiceScript }) {
  const label = useTransform(p, (v) => phase(v, script).label);
  const dot = useTransform(p, (v) => phase(v, script).dot);
  const barColor = useTransform<number, string>(p, (v) =>
    v >= script.speaking[0] && v < script.speaking[1] ? "#B8D63F" : "#075E63"
  );
  const micRing = useTransform(p, (v) =>
    v >= script.hearing[0] && v < script.hearing[1] ? "0 0 0 0.3em rgba(217,242,121,0.9)" : "0 0 0 0em rgba(217,242,121,0)"
  );
  const heard = useTransform(
    p,
    [script.hearing[0], script.hearing[0] + 0.03, script.speaking[0], script.speaking[0] + 0.03],
    [0, 1, 1, 0]
  );
  return (
    <div className="gc-vbar">
      <motion.p className="gc-vbar-heard" style={{ opacity: heard }}>
        “{script.heard}”
      </motion.p>
      <div className="gc-vbar-row">
        <span className="gc-vbar-status">
          <motion.i style={{ backgroundColor: dot }} />
          <motion.span>{label}</motion.span>
        </span>
        <div className="gc-vbar-fan gc-vbar-fan-l">
          {Array.from({ length: BARS }, (_, i) => (
            <VBar key={i} p={p} i={i} color={barColor} script={script} />
          ))}
        </div>
        <motion.span className="gc-vbar-mic" style={{ boxShadow: micRing }}>
          <Mic size="1em" strokeWidth={2.2} aria-hidden />
        </motion.span>
        <div className="gc-vbar-fan">
          {Array.from({ length: BARS }, (_, i) => (
            <VBar key={i} p={p} i={i} color={barColor} script={script} />
          ))}
        </div>
        <span className="gc-vbar-end">
          <PhoneOff size="1em" strokeWidth={2.2} aria-hidden /> End
        </span>
      </div>
    </div>
  );
}

function VBar({ p, i, color, script }: { p: Progress; i: number; color: MotionValue<string>; script: VoiceScript }) {
  const scaleY = useTransform(p, (v) => {
    const wobble = Math.abs(Math.sin(v * 160 + i * 0.9) * Math.cos(v * 63 + i * 1.7));
    // Rounded so server and client render the same first frame.
    return Math.round((0.08 + phase(v, script).level * wobble * (1 - i / (BARS * 1.4))) * 1000) / 1000;
  });
  return <motion.i style={{ scaleY, backgroundColor: color }} />;
}
