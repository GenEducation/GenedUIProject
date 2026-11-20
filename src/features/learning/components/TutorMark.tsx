/**
 * The tutor's face on the lesson screen: the Zoovi star-and-hat (the
 * favicon's artwork) on a soft-mint disc. While the tutor is talking the
 * mark breathes gently. No mascot, no pet.
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
      <circle cx="20" cy="20" r="19.5" fill="#E8F0CC" />
      <circle cx="20" cy="20" r="19" fill="none" stroke="#FFFFFF" strokeWidth="1" />
      <image
        className={active ? "lesson-breathe" : undefined}
        href="/brand/zoovi-tutor.png"
        x="2"
        y="2"
        width="36"
        height="36"
      />
    </svg>
  );
}
