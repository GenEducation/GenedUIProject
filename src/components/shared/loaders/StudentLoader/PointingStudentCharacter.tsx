"use client";

import React from "react";
import { Head, Body, LeftArm, RightArm, LeftLeg, RightLeg, Bag } from "./CharacterParts";

interface PointingStudentCharacterProps {
  direction: "up" | "down" | "left" | "right";
  className?: string;
}

export const PointingStudentCharacter: React.FC<PointingStudentCharacterProps> = ({ direction, className = "" }) => {
  // Determine arm rotations based on pointing direction
  let leftArmRotate = -45; // Default resting
  let rightArmRotate = 5;

  switch (direction) {
    case "up":
      leftArmRotate = -140; // Pointing up
      break;
    case "down":
      leftArmRotate = 20; // Pointing down
      break;
    case "left":
      leftArmRotate = -90; // Pointing left (our right)
      break;
    case "right":
      leftArmRotate = -110; // Pointing right/up
      break;
  }

  return (
    <div className={`relative w-[100px] h-[150px] flex flex-col items-center justify-end pb-[10px] ${className}`}>
      {/* Subtle Ground Shadow */}
      <div className="absolute bottom-0 w-12 h-[4px] bg-black/40 rounded-[100%] blur-[2px]" />

      {/* Main Rig */}
      <div className="relative">
        {/* Bag (Hidden behind) */}
        <div className="absolute left-[0px] top-[0px] z-0">
          <Bag />
        </div>

        {/* Right Arm (Resting) */}
        <div 
          className="absolute left-[-10px] top-[10px] origin-top z-0 transition-transform duration-300"
          style={{ transform: `rotate(${rightArmRotate}deg)` }}
        >
          <RightArm />
        </div>

        {/* Left Arm (Pointing) */}
        <div 
          className="absolute left-[10px] top-[10px] origin-top z-0 transition-transform duration-300"
          style={{ transform: `rotate(${leftArmRotate}deg)` }}
        >
          <LeftArm />
        </div>

        {/* Right Leg (Standing) */}
        <div className="absolute left-[13px] top-[50px] origin-top z-0">
          <RightLeg />
        </div>

        {/* Body (Anchor) */}
        <div className="relative z-10">
          <Body />
        </div>

        {/* Head (Facing front) */}
        <div className="absolute left-[-10px] -top-[42px] z-20">
          <Head />
        </div>

        {/* Left Leg (Standing) */}
        <div className="absolute left-[-3px] top-[50px] origin-top z-10">
          <LeftLeg />
        </div>
      </div>
    </div>
  );
};
