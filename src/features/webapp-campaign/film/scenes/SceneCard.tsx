"use client";

import { motion, useTransform } from "framer-motion";
import { Reveal, useRange, type Progress } from "../primitives";

/**
 * An ad beat between product shots: the film pauses on one short line, set
 * big, the second half in citron, with a soft light sweeping behind it.
 */
function TitleCard({ p, kicker, line, accent }: { p: Progress; kicker: string; line: string; accent: string }) {
  const glow = useRange(p, [0, 0.7]);
  const glowX = useTransform(glow, [0, 1], ["-18%", "18%"]);
  const rule = useRange(p, [0.3, 0.6]);
  return (
    <div className="gc-title-scene gc-card-scene">
      <motion.div className="gc-card-glow" style={{ x: glowX, opacity: glow }} aria-hidden />
      <div className="gc-title-copy">
        <Reveal p={p} at={[0.02, 0.18]} y={0.6}>
          <span className="gc-card-kicker">{kicker}</span>
        </Reveal>
        <Reveal p={p} at={[0.06, 0.26]} y={1}>
          <h2 className="gc-title-xl">{line}</h2>
        </Reveal>
        <Reveal p={p} at={[0.2, 0.42]} y={1}>
          <h2 className="gc-title-xl">
            <em>{accent}</em>
          </h2>
        </Reveal>
        <motion.span className="gc-card-rule" style={{ scaleX: rule }} aria-hidden />
      </div>
    </div>
  );
}

export function SceneCardSee({ p }: { p: Progress }) {
  return <TitleCard p={p} kicker="For parents" line="While they learn," accent="you see every step." />;
}

export function SceneCardKnow({ p }: { p: Progress }) {
  return <TitleCard p={p} kicker="No guesswork" line="Not just marks." accent="What's working — and why." />;
}
