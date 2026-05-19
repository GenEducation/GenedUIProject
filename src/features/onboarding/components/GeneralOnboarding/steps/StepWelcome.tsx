"use client";

import { useState } from "react";
import { SageAvatar } from "../SageAvatar";
import { SageBubble } from "../SageBubble";
interface StepWelcomeProps {
  name: string;
  onNext: () => void;
}

export function StepWelcome({ name, onNext }: StepWelcomeProps) {
  const [showSecond, setShowSecond] = useState(false);

  return (
    <div>
      {/* Sage chat bubbles */}
      <div className="flex items-start gap-3 mb-5">
        <SageAvatar />
        <div className="flex flex-col gap-2 flex-1 pt-0.5">
          <SageBubble
            text={`Hi there, **${name}**! I'm **Sage**, your personal AI tutor. 👋`}
            onDone={() => setTimeout(() => setShowSecond(true), 300)}
          />
          {showSecond && (
            <SageBubble
              text="I'll ask a few quick questions to understand how you learn best. It only takes a couple of minutes!"
            />
          )}
        </div>
      </div>

      {showSecond && (
        <div style={{ animation: "bubbleIn 0.3s ease both" }}>
          <button
            onClick={onNext}
            className="w-full py-4 rounded-[14px] border-none font-bold text-[15px] cursor-pointer flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-px mt-2"
            style={{
              background: "#1DB87B",
              color: "#062417",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#34D399";
              e.currentTarget.style.boxShadow = "0 8px 24px -8px #1DB87B";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#1DB87B";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Let&apos;s get started →
          </button>
        </div>
      )}
    </div>
  );
}
