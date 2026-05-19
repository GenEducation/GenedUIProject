"use client";

import { useRef } from "react";

const COLORS = [
  "#1DB87B",
  "#34D399",
  "#FBBF24",
  "#60A5FA",
  "#F472B6",
  "#A78BFA",
  "#FB923C",
];

export function Confetti() {
  const pieces = useRef(
    Array.from({ length: 48 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      dur: 2 + Math.random() * 2,
      color: COLORS[i % 7],
      rot: Math.random() * 360,
      shape: i % 3,
    }))
  ).current;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {pieces.map((p, i) => (
        <div
          key={i}
          className="absolute w-2 h-2"
          style={{
            left: `${p.left}%`,
            top: 0,
            background: p.color,
            borderRadius:
              p.shape === 0 ? "50%" : p.shape === 1 ? "2px" : "0",
            transform: `rotate(${p.rot}deg)`,
            animation: `confFall ${p.dur}s ${p.delay}s linear both`,
          }}
        />
      ))}
    </div>
  );
}
