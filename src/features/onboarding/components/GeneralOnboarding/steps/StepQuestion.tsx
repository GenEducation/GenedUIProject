"use client";

import { useState } from "react";
import { SageAvatar } from "../SageAvatar";
import { SageBubble } from "../SageBubble";

interface StepQuestionProps {
  sageMessage: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  onNext: () => void;
  onBack: () => void;
  showBack: boolean;
}

export function StepQuestion({
  sageMessage,
  placeholder,
  value,
  onChange,
  onNext,
  onBack,
  showBack,
}: StepQuestionProps) {
  const [ready, setReady] = useState(false);

  return (
    <div>
      <div className="flex items-start gap-3 mb-5">
        <SageAvatar />
        <div className="flex flex-col gap-2 flex-1 pt-0.5">
          <SageBubble
            text={sageMessage}
            onDone={() => setTimeout(() => setReady(true), 200)}
          />
        </div>
      </div>

      {ready && (
        <div style={{ animation: "bubbleIn 0.3s ease both" }}>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (value.trim()) onNext();
              }
            }}
            placeholder={placeholder}
            autoFocus
            className="w-full mt-1 outline-none transition-all duration-[180ms]"
            style={{
              minHeight: "140px",
              padding: "14px 18px",
              borderRadius: "14px",
              border: "2px solid rgba(11,36,71,0.10)",
              background: "#FAFBFE",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "16px",
              color: "#0B2447",
              resize: "none",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#1DB87B";
              e.currentTarget.style.boxShadow =
                "0 0 0 4px rgba(29,184,123,0.12)";
              e.currentTarget.style.background = "#fff";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(11,36,71,0.10)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.background = "#FAFBFE";
            }}
          />

          <div className="flex items-center gap-2.5 mt-6">
            {showBack && (
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 py-3 px-4 rounded-[12px] bg-transparent cursor-pointer transition-all duration-[180ms] hover:border-[rgba(11,36,71,0.25)]"
                style={{
                  border: "1.5px solid rgba(11,36,71,0.12)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "rgba(11,36,71,0.55)",
                }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={onNext}
              disabled={!value.trim()}
              className="flex-1 py-3.5 px-5 rounded-[14px] border-none font-bold text-[15px] cursor-pointer flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:-translate-y-px"
              style={{
                background: "#1DB87B",
                color: "#062417",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.background = "#34D399";
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px -8px #1DB87B";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#1DB87B";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Continue →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
