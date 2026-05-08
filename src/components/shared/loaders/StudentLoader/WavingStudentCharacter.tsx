"use client";

import React from "react";
import { motion, Transition } from "framer-motion";
import { Head, Body, LeftArm, RightArm, LeftLeg, RightLeg, Bag } from "./CharacterParts";

export const WavingStudentCharacter = () => {
  const bounceCycle: Transition = {
    repeat: Infinity,
    duration: 1.2,
    ease: "easeInOut",
  };

  return (
    <div className="relative w-[100px] h-[150px] flex flex-col items-center justify-end pb-[10px]">
      {/* Subtle Ground Shadow */}
      <motion.div
        animate={{ scaleX: [1, 1.1, 1] }}
        transition={bounceCycle}
        className="absolute bottom-0 w-12 h-[4px] bg-black/40 rounded-[100%] blur-[2px]"
      />

      {/* Main Rig */}
      <motion.div
        className="relative"
        animate={{ y: [0, -4, 0] }}
        transition={bounceCycle}
      >
        {/* Bag (Hidden behind) */}
        <div className="absolute left-[0px] top-[0px] z-0">
          <Bag />
        </div>

        {/* Right Arm (Resting - Our Left) */}
        <motion.div
          className="absolute left-[-10px] top-[10px] origin-top z-0"
          animate={{ rotate: [5, 10, 5] }}
          transition={bounceCycle}
        >
          <RightArm />
        </motion.div>

        {/* Left Arm (Waving - Our Right - Now on Back) */}
        <motion.div
          className="absolute left-[10px] top-[10px] origin-top z-0"
          initial={{ rotate: -15 }}
          animate={{ 
            rotate: [-15, -95, -25, -95, -25, -15],
            x: [0, 1, 0, 1, 0, 0]
          }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            times: [0, 0.2, 0.4, 0.6, 0.8, 1],
            ease: "easeInOut"
          }}
        >
          <LeftArm />
        </motion.div>

        {/* Right Leg (Standing - Our Right) */}
        <motion.div
          className="absolute left-[13px] top-[50px] origin-top z-0"
          animate={{ rotate: [-1, 1, -1] }}
          transition={bounceCycle}
        >
          <RightLeg />
        </motion.div>

        {/* Body (Anchor) */}
        <div className="relative z-10">
          <Body />
        </div>

        {/* Head (Facing front) */}
        <motion.div
          className="absolute left-[-10px] -top-[42px] z-20"
          animate={{ rotate: [-2, 2, -2] }}
          transition={bounceCycle}
        >
          <Head />
        </motion.div>

        {/* Left Leg (Standing - Our Left) */}
        <motion.div
          className="absolute left-[-3px] top-[50px] origin-top z-10"
          animate={{ rotate: [1, -1, 1] }}
          transition={bounceCycle}
        >
          <LeftLeg />
        </motion.div>
      </motion.div>
    </div>
  );
};
