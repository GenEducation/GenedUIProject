"use client";

import { motion, useTransform } from "framer-motion";
import { Reveal, Stream, TutorMark, Typed, type Progress, type CameraKey } from "../primitives";
import { Composer, LearnerTurn, LessonShell, Turn } from "./LessonShell";
import { BoardTitle, Filmstrip, GridFigure } from "./boardFigures";

// Push in on the message box while the question is typed, the reply as it
// streams, then the whiteboard as the tutor draws; settle back at the end.
const CAMERA: CameraKey[] = [
  { at: 0.02, s: 1, x: 0.5, y: 0.5 },
  { at: 0.08, s: 1.7, x: 0.89, y: 0.88 },
  { at: 0.22, s: 1.7, x: 0.89, y: 0.88 },
  { at: 0.3, s: 1.35, x: 0.86, y: 0.32 },
  { at: 0.36, s: 1.35, x: 0.86, y: 0.32 },
  { at: 0.44, s: 1.45, x: 0.3, y: 0.5 },
  { at: 0.84, s: 1.45, x: 0.3, y: 0.5 },
  { at: 0.96, s: 1, x: 0.5, y: 0.5 },
];

export const QUESTION = "Why is 25% the same as a quarter?";
const SEND_AT = 0.22;

/** The child types a question; the tutor answers in chat and draws it on the board. */
export function SceneAsk({ p }: { p: Progress }) {
  const typedOpacity = useTransform(p, [SEND_AT, SEND_AT + 0.01], [1, 0]);
  const placeholder = useTransform(p, [0.03, 0.04, SEND_AT, SEND_AT + 0.02], [1, 0, 0, 1]);
  const send = useTransform(p, [SEND_AT - 0.02, SEND_AT, SEND_AT + 0.03], [1, 0.82, 1]);
  const sendOn = useTransform(p, [0.04, 0.05, SEND_AT, SEND_AT + 0.01], [0.4, 1, 1, 0.4]);
  const focus = useTransform(p, [0.01, 0.03, SEND_AT, SEND_AT + 0.03], [0, 1, 1, 0]);
  const typing = useTransform(p, [0.26, 0.27, 0.3, 0.31], [0, 1, 1, 0]);
  return (
    <LessonShell
      p={p}
      done={1}
      clock={[734, 760]}
      camera={CAMERA}
      board={
        <>
          <BoardTitle p={p} at={[0.36, 0.44]} text="Percent as a fraction" />
          <div className="gc-l-camera">
            <GridFigure p={p} at={[0.42, 0.52]} fillAt={[0.5, 0.68]} style={{ left: "2.4em", top: "5em" }} />
          </div>
          <Reveal p={p} at={[0.42, 0.46]} y={0}>
            <Filmstrip p={p} count={1} />
          </Reveal>
        </>
      }
      chat={
        <>
          <Reveal p={p} at={[SEND_AT, SEND_AT + 0.04]} y={0.8}>
            <LearnerTurn time="12:56">{QUESTION}</LearnerTurn>
          </Reveal>
          <motion.div className="gc-l-typing" style={{ opacity: typing }}>
            <i />
            <i />
            <i />
          </motion.div>
          <Reveal p={p} at={[0.3, 0.33]} y={0.6}>
            <Turn>
              <TutorMark />
              <p className="gc-l-bubble">
                <Stream
                  p={p}
                  at={[0.31, 0.54]}
                  text="Great question! **Percent** means **out of 100.** Watch the board — I'll shade 25 of the 100 squares."
                />
              </p>
            </Turn>
          </Reveal>
        </>
      }
      footer={
        <div className="gc-l-composer-live">
          <motion.span className="gc-l-composer-ring" style={{ opacity: focus }} />
          <Composer
            active
            sendStyle={{ scale: send, opacity: sendOn }}
            text={
              <span className="gc-l-composer-typed">
                <motion.span className="gc-l-composer-ph" style={{ opacity: placeholder }}>
                  Type a message…
                </motion.span>
                <motion.span style={{ opacity: typedOpacity }}>
                  <Typed p={p} at={[0.04, 0.19]} text={QUESTION} />
                  <motion.i className="gc-l-typecaret" style={{ opacity: focus }} />
                </motion.span>
              </span>
            }
          />
        </div>
      }
    />
  );
}
