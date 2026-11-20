/**
 * The tutor's mark on the lesson screen: the "z" from the Zoovi logo (the
 * favicon's artwork) on a white disc ringed in soft citron. While the tutor is
 * talking the mark breathes gently. No face, no mascot, no pet.
 */
export function TutorMark({ size = 36, active = false, className = "" }: { size?: number; active?: boolean; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden
      className={`shrink-0 ${className}`}
    >
      <circle cx="20" cy="20" r="19.5" fill="#FFFFFF" />
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="#E8F0CC" strokeWidth="2" />
      <image
        className={active ? "lesson-breathe" : undefined}
        href="/brand/zoovi-mark.png"
        x="7"
        y="7"
        width="26"
        height="26"
      />
    </svg>
  );
}
