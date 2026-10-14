"use client";

import { Mic } from "lucide-react";
import { motion, useTransform } from "framer-motion";
import { Reveal, Stream, TutorMark, useRange, easeInOut, type Progress, type CameraKey } from "../primitives";
import { Composer, LearnerTurn, LessonShell, Turn } from "./LessonShell";
import { BarFigure, BoardTitle, Filmstrip, GridFigure } from "./boardFigures";
import { QUESTION } from "./SceneAsk";
import { VoiceBar, type VoiceScript } from "./VoiceBar";

// The voice bar while the child talks and the tutor answers, the board as
// the next figure draws, then the rail as the step ticks off.
const CAMERA: CameraKey[] = [
  { at: 0.02, s: 1, x: 0.5, y: 0.5 },
  { at: 0.08, s: 1.32, x: 0.74, y: 0.72 },
  { at: 0.3, s: 1.32, x: 0.74, y: 0.72 },
  { at: 0.38, s: 1.4, x: 0.33, y: 0.5 },
  { at: 0.66, s: 1.4, x: 0.33, y: 0.5 },
  { at: 0.73, s: 1.45, x: 0.1, y: 0.55 },
  { at: 0.88, s: 1.45, x: 0.1, y: 0.55 },
  { at: 1, s: 1.2, x: 0.3, y: 0.5 },
];

const SCRIPT: VoiceScript = {
  hearing: [0.1, 0.24],
  speaking: [0.3, 0.64],
  heard: "so 25% of 540 is just 135?",
};

/** Switching to Voice: the child asks out loud, the tutor answers and draws the next figure. */
export function SceneSpeak({ p }: { p: Progress }) {
  const composerOut = useTransform(p, [0.02, 0.05], [1, 0]);
  const barIn = useTransform(p, [0.04, 0.07], [0, 1]);
  const pan = useRange(p, [0.34, 0.46], easeInOut);
  const camX = useTransform(pan, (v) => `${v * -15}em`);
  const camY = useTransform(pan, (v) => `${v * -1.5}em`);
  const thinking = useTransform(p, [0.24, 0.25, 0.29, 0.3], [0, 1, 1, 0]);
  return (
    <LessonShell
      p={p}
      done={1}
      advanceAt={[0.76, 0.86]}
      voiceAt={[0.01, 0.05]}
      clock={[760, 790]}
      camera={CAMERA}
      board={
        <>
          <BoardTitle p={p} at={[-1, -0.9]} text="Percent as a fraction" />
          <motion.div className="gc-l-camera" style={{ x: camX, y: camY }}>
            <GridFigure p={p} at={[-1, -0.9]} fillAt={[-0.9, -0.8]} style={{ left: "2.4em", top: "5em" }} />
            <BarFigure p={p} at={[0.42, 0.58]} style={{ left: "19.5em", top: "7.4em" }} />
          </motion.div>
          <Filmstrip p={p} count={2} activeAt={[0.42, 0.46]} />
        </>
      }
      chat={
        <div className="gc-l-turns-end">
          <div className="gc-l-turn-faded">
            <LearnerTurn time="12:56">{QUESTION}</LearnerTurn>
          </div>
          <div className="gc-l-turn-faded">
            <Turn>
              <TutorMark />
              <p className="gc-l-bubble">
                <b>Percent</b> means <b>out of 100.</b> 25 of the 100 squares are shaded — a quarter.
              </p>
            </Turn>
          </div>
          <Reveal p={p} at={[0.23, 0.27]} y={0.8}>
            <LearnerTurn time="12:58">
              <Mic size="1em" strokeWidth={2.2} aria-hidden className="gc-l-bubble-mic" /> So 25% of ₹540 is just ₹135?
            </LearnerTurn>
          </Reveal>
          <motion.div className="gc-l-typing" style={{ opacity: thinking }}>
            <i />
            <i />
            <i />
          </motion.div>
          <Reveal p={p} at={[0.29, 0.32]} y={0.6}>
            <Turn>
              <TutorMark />
              <p className="gc-l-bubble">
                <Stream
                  p={p}
                  at={[0.3, 0.56]}
                  text="**Exactly!** Split ₹540 into 4 equal parts — one part is **₹135.** That's 25%."
                />
              </p>
            </Turn>
          </Reveal>
        </div>
      }
      footer={
        <div className="gc-l-footer-stack">
          <motion.div style={{ opacity: composerOut }} className="gc-l-footer-layer">
            <Composer />
          </motion.div>
          <motion.div style={{ opacity: barIn }} className="gc-l-footer-layer">
            <VoiceBar p={p} script={SCRIPT} />
          </motion.div>
        </div>
      }
    />
  );
}
