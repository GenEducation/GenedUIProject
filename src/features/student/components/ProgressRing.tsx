/** A small circular progress gauge in a subject colour (0–100). */
export function ProgressRing({ percent, size = 40, stroke = 3.5, color }: { percent: number; size?: number; stroke?: number; color: string }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ * (1 - percent / 100);
  // A round cap on a near-empty arc renders as a dot floating off the track
  // rather than "barely started" — square the cap below ~6% so a low value
  // still reads as a short flat sliver sitting on the track.
  const cap = percent > 0 && percent < 6 ? "butt" : "round";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color + "18"} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap={cap}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }} />
    </svg>
  );
}
