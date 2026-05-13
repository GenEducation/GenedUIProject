"use client";

import React from "react";
import { motion, Transition } from "framer-motion";
import { Head, Body, LeftArm, RightArm, LeftLeg, RightLeg } from "./CharacterParts";

const Laptop = () => (
  <svg width="60" height="40" viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Screen */}
    <rect x="5" y="2" width="50" height="32" rx="3" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
    <rect x="8" y="5" width="44" height="26" fill="#38bdf8" opacity="0.1" />
    <rect x="15" y="10" width="30" height="2" rx="1" fill="#38bdf8" opacity="0.2" />
    <rect x="15" y="15" width="20" height="2" rx="1" fill="#38bdf8" opacity="0.2" />
    {/* Keyboard Base */}
    <path d="M 2 34 L 58 34 L 62 40 L -2 40 Z" fill="#475569" stroke="#0f172a" strokeWidth="2" />
    <rect x="10" y="36" width="40" height="2" rx="1" fill="#0f172a" opacity="0.3" />
  </svg>
);

export const TypingStudentCharacter = () => {
  const typingCycle: Transition = {
    repeat: Infinity,
    duration: 0.15,
    ease: "linear",
  };

  const breathingCycle: Transition = {
    repeat: Infinity,
    duration: 2,
    ease: "easeInOut",
  };

  return (
    <div className="relative w-[120px] h-[150px] flex flex-col items-center justify-end pb-[10px]">
      {/* Subtle Ground Shadow */}
      <motion.div
        animate={{ scaleX: [1, 1.05, 1], opacity: [0.4, 0.5, 0.4] }}
        transition={breathingCycle}
        className="absolute bottom-2 w-20 h-[6px] bg-black/20 rounded-[100%] blur-[3px]"
      />

      {/* Main Rig */}
      <motion.div
        animate={{ y: [0, -2, 0] }}
        transition={breathingCycle}
        className="relative"
      >
        {/* Sitting Legs (Back) */}
        <div className="absolute left-[15px] top-[40px] origin-top rotate-90 z-0 scale-y-75">
          <RightLeg />
        </div>
        <div className="absolute left-[-15px] top-[40px] origin-top -rotate-90 z-0 scale-y-75">
          <LeftLeg />
        </div>

        {/* Body (Sitting) */}
        <div className="relative z-10 translate-y-2">
          <Body />
        </div>

        {/* Head (Looking down slightly) */}
        <motion.div
          className="absolute left-[-10px] -top-[35px] z-20"
          animate={{ rotate: [5, 7, 5] }}
          transition={breathingCycle}
        >
          <Head />
        </motion.div>

        {/* Arms and Laptop Container */}
        <div className="absolute left-[-30px] top-[15px] z-30 w-[100px] h-[60px]">
          {/* Typing Left Arm */}
          <motion.div
            className="absolute left-[5px] top-0 origin-right"
            animate={{ 
              rotate: [0, -5, 0, -3, 0],
              y: [0, -1, 0, -2, 0]
            }}
            transition={typingCycle}
          >
            <div className="scale-75 rotate-45">
              <LeftArm />
            </div>
          </motion.div>

          {/* Typing Right Arm */}
          <motion.div
            className="absolute right-[5px] top-0 origin-left"
            animate={{ 
              rotate: [0, 5, 0, 3, 0],
              y: [0, -2, 0, -1, 0]
            }}
            transition={{ ...typingCycle, delay: 0.07 }}
          >
            <div className="scale-75 -rotate-45">
              <RightArm />
            </div>
          </motion.div>

          {/* Laptop (Rendered on top to occlude arms) */}
          <div className="absolute left-[20px] top-[15px]">
            <Laptop />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
