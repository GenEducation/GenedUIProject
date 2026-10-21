"use client";

import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LOGO_BOX, LogoToss } from "@/features/parent/components/loader/LogoToss";
import { ParentLoaderBackdrop } from "@/features/parent/components/loader/ParentLoader";

/**
 * The full-screen "one moment" screen for a route that isn't ready yet (checking a sign-in, deciding where to
 * send a returning user): the GenEd loader's soft backdrop and the logo assembling itself (the cap toss). It
 * replaces the old pulsing-logo-and-spinner screen everywhere. It waits a beat before appearing, so a check that
 * finishes quickly never flashes it; until then only the backdrop shows.
 */
export function BrandLoadingScreen({ appearDelayMs = 250, label = "Loading" }: { appearDelayMs?: number; label?: string }) {
  const reduceMotion = !!useReducedMotion();
  const [shown, setShown] = useState(appearDelayMs <= 0);

  useEffect(() => {
    if (appearDelayMs <= 0) return;
    const t = setTimeout(() => setShown(true), appearDelayMs);
    return () => clearTimeout(t);
  }, [appearDelayMs]);

  return (
    <div role="status" aria-label={label} aria-busy="true" className="relative flex h-screen w-full items-center justify-center overflow-hidden">
      <ParentLoaderBackdrop animated={!reduceMotion} />
      {shown && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.3 }}
          className="relative"
          style={{ width: "min(260px, 70vw)", aspectRatio: `${LOGO_BOX.width} / ${LOGO_BOX.height}` }}
        >
          <LogoToss reduceMotion={reduceMotion} />
        </motion.div>
      )}
    </div>
  );
}
