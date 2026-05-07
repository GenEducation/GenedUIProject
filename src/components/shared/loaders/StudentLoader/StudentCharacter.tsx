"use client";

import React from "react";
import { motion, Transition } from "framer-motion";
import { Head, Body, LeftArm, RightArm, LeftLeg, RightLeg, Bag } from "./CharacterParts";

export const StudentCharacter = () => {
  const walkCycle: Transition = {
    repeat: Infinity,
    duration: 0.8,
    ease: "easeInOut",
  };

  return (
    <div className="relative w-[100px] h-[150px] flex flex-col items-center justify-end pb-[10px]">
      {/* Subtle Ground Shadow */}
      <motion.div
        animate={{ scaleX: [1, 0.8, 1] }}
        transition={walkCycle}
        className="absolute bottom-0 w-12 h-[4px] bg-black/40 rounded-[100%] blur-[2px]"
      />

      {/* Main Rig */}
      <motion.div
        className="relative"
      >
        {/* Bag (Back) */}
        <div className="absolute left-[-22px] top-[-8px] z-0">
          <Bag />
        </div>

        {/* Right Arm (Back) */}
        <motion.div
          className="absolute left-[20px] top-[10px] origin-top z-0"
          animate={{ rotate: [-20, 20, -20] }}
          transition={walkCycle}
        >
          <RightArm />
        </motion.div>

        {/* Right Leg (Back) */}
        <motion.div
          className="absolute left-[15px] top-[50px] origin-top z-0"
          animate={{ rotate: [25, -25, 25] }}
          transition={walkCycle}
        >
          <RightLeg />
        </motion.div>

        {/* Body (Anchor) */}
        <div className="relative z-10">
          <Body />
        </div>

        {/* Head */}
        <motion.div
          className="absolute left-[-10px] -top-[42px] z-20"
          animate={{ rotate: [-2, 2, -2] }}
          transition={walkCycle}
        >
          <Head />
        </motion.div>

        {/* Left Leg (Front) */}
        <motion.div
          className="absolute left-[5px] top-[50px] origin-top z-10"
          animate={{ rotate: [-25, 25, -25] }}
          transition={walkCycle}
        >
          <LeftLeg />
        </motion.div>

        {/* Left Arm (Front) */}
        <motion.div
          className="absolute left-[5px] top-[5px] origin-top z-20"
          animate={{ rotate: [20, -20, 20] }}
          transition={walkCycle}
        >
          <LeftArm />
        </motion.div>
      </motion.div>
    </div>
  );
};
