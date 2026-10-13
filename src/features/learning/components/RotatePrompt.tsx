"use client";

/**
 * Shown on a phone held upright: the lesson is built for side-by-side
 * whiteboard + chat, which needs landscape. Browsers can't rotate the phone
 * for us (iOS never allows it), so we ask — and offer a way to carry on in
 * portrait for students who can't rotate (e.g. rotation lock).
 */
export function RotatePrompt({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 pb-16 text-center">
      <div aria-hidden className="grid h-36 w-36 place-items-center rounded-full bg-[var(--ls-soft)]">
        <svg className="lesson-rotate-phone" width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="20" y="6" width="24" height="52" rx="5.5" fill="#fff" stroke="#075E63" strokeWidth="3" />
          <rect x="24" y="13" width="16" height="34" rx="2" fill="#D9F279" />
          <circle cx="32" cy="52" r="1.8" fill="#075E63" />
        </svg>
      </div>

      <div className="max-w-[30ch]">
        <h2 className="lesson-display text-[24px] font-semibold leading-tight text-[var(--ls-ink)]">
          Turn your phone sideways
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--ls-ink-mid)]">
          Your whiteboard and chat sit side by side when the phone is in landscape.
        </p>
      </div>

      {/* eslint-disable-next-line no-restricted-syntax -- a quiet text link, not a primary action. */}
      <button
        type="button"
        onClick={onContinue}
        className="text-[14px] font-semibold text-[var(--ls-primary)] underline decoration-[var(--ls-primary)]/30 underline-offset-4 hover:decoration-[var(--ls-primary)]"
      >
        Continue in portrait
      </button>
    </div>
  );
}
