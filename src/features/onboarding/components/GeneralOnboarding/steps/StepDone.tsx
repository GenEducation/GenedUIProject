"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { SageAvatar } from "../SageAvatar";
import { SageBubble } from "../SageBubble";
import { Confetti } from "../Confetti";

interface StepDoneProps {
  name: string;
  age?: number;
  isSubmitting: boolean;
  onFinish: () => void;
}

export function StepDone({ name, age, isSubmitting, onFinish }: StepDoneProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="text-center">
      {showConfetti && <Confetti />}

      <span
        className="text-[56px] block"
        style={{
          animation:
            "sparkPop 0.6s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        🎉
      </span>

      <h2
        className="mt-3.5 mb-2"
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "30px",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "#0B2447",
        }}
      >
        You&apos;re all set, {name}!
      </h2>

      <p
        className="mb-6"
        style={{
          fontSize: "15px",
          lineHeight: 1.55,
          color: "rgba(11,36,71,0.6)",
        }}
      >
        Sage has tuned your space just for you. Let&apos;s start learning.
      </p>

      {/* App preview card */}
      <div
        className="relative overflow-hidden text-left text-white mb-6"
        style={{
          background: "#0B2447",
          borderRadius: "20px",
          padding: "20px",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
            <Image
              src="/Favicon1.jpg"
              alt="Sage"
              width={28}
              height={28}
              className="object-cover w-full h-full"
            />
          </div>
          <div>
            <div className="text-[13px] font-bold">
              {name}
              {age ? `, age ${age}` : ""}
            </div>
            <div
              className="text-[10px] uppercase tracking-widest"
              style={{ opacity: 0.6 }}
            >
              Learning profile ready
            </div>
          </div>
        </div>

        <div
          className="h-1.5 rounded-[3px] overflow-hidden"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="h-full rounded-[3px]"
            style={{
              background: "linear-gradient(90deg, #1DB87B, #34D399)",
              animation: "barGrow 1.2s 0.6s cubic-bezier(.22,1,.36,1) both",
            }}
          />
        </div>
        <div
          className="mt-1.5 text-[11px] tracking-wide"
          style={{ opacity: 0.5 }}
        >
          XP · lesson 1 of ∞
        </div>
      </div>

      {/* Sage final message */}
      <div className="flex items-start gap-3 mb-5 text-left">
        <SageAvatar />
        <div className="flex flex-col gap-2 flex-1 pt-0.5">
          <SageBubble
            text={`Ready when you are, **${name}**. This is going to be great! ✨`}
            delay={800}
          />
        </div>
      </div>

      <button
        onClick={onFinish}
        disabled={isSubmitting}
        className="w-full py-4 rounded-[16px] border-none font-bold text-[16px] cursor-pointer flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:enabled:-translate-y-px"
        style={{
          background: "#1DB87B",
          color: "#062417",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
        onMouseEnter={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.background = "#34D399";
            e.currentTarget.style.boxShadow = "0 8px 24px -8px #1DB87B";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#1DB87B";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {isSubmitting ? "Saving..." : "Let's start learning →"}
      </button>
    </div>
  );
}
