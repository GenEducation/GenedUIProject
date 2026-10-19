/**
 * The tutor's face on the lesson screen, drawn from the GenEd logo: the
 * mortarboard in deep ocean on a soft-mint disc, with the logo's citron
 * sparkle hanging from its tassel. The sparkle twinkles while the tutor is
 * talking. No mascot, no pet.
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
      <circle cx="20" cy="20" r="19.5" fill="#DCEBE7" />
      <circle cx="20" cy="20" r="19" fill="none" stroke="#FFFFFF" strokeWidth="1" />
      {/* Board of the cap: a flat rhombus. */}
      <path d="M7 15.2 L20 9.5 L33 15.2 L20 20.8 Z" fill="#075E63" />
      {/* Crown under the board. */}
      <path d="M12.6 18.4 V24.3 C12.6 26.6 16 28.3 20 28.3 C24 28.3 27.4 26.6 27.4 24.3 V18.4 L20 21.6 Z" fill="#075E63" />
      <path d="M12.6 18.4 L20 21.6 L27.4 18.4" fill="none" stroke="#0B7378" strokeWidth="0.8" />
      {/* Tassel cord and the citron sparkle. */}
      <path d="M9.4 16.3 V24.4" stroke="#075E63" strokeWidth="1.2" strokeLinecap="round" />
      <path
        className={active ? "lesson-twinkle" : undefined}
        d="M9.4 24.2 C9.9 26.4 10.4 26.9 12.6 27.4 C10.4 27.9 9.9 28.4 9.4 30.6 C8.9 28.4 8.4 27.9 6.2 27.4 C8.4 26.9 8.9 26.4 9.4 24.2 Z"
        fill="#D9F279"
        stroke="#B8D63F"
        strokeWidth="0.5"
      />
    </svg>
  );
}
