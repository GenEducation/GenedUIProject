"use client";

const STEPS = ["Start", "Take Test", "Complete"] as const;

/**
 * The 3-step "Start → Take Test → Complete" header stepper shown on the
 * intro and complete bookend screens (never mid-test — the item screen has
 * its own continuous progress bar, `PlacementProgressRail`, a separate
 * concept measuring items answered, not form stages).
 *
 * The reference sheet's "active"/"inactive" step circles each bake a
 * literal digit into their artwork ("1" and "2") rather than being reusable
 * blank circles, so extracting per-position crops would be more fragile
 * than just drawing the circle here and rendering the number as real text —
 * accessible, and correct at any position. The one checkmark circle
 * (`step-completed.png`, no digit baked in) genuinely is reusable as
 * extracted, so that one is used verbatim for any step at or before the
 * current one.
 */
export function PlacementStepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center" role="list" aria-label="Onboarding test progress">
      {STEPS.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3;
        const isDone = step < currentStep;
        const isActive = step === currentStep;
        const isLast = i === STEPS.length - 1;

        return (
          <div key={label} className={`flex items-center ${isLast ? "" : "flex-1"}`} role="listitem">
            <div className="flex flex-col items-center gap-1.5">
              {isDone ? (
                // eslint-disable-next-line @next/next/no-img-element -- a small vendored decorative SVG, not a page asset next/image needs to optimize.
                <img src="/placement/icons/step-completed.png" alt="" className="w-7 h-7" aria-hidden="true" />
              ) : (
                <span
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[13px] font-bold"
                  style={{
                    background: isActive ? "var(--pl-primary)" : "var(--pl-surface)",
                    color: isActive ? "var(--pl-canvas)" : "var(--pl-primary)",
                  }}
                >
                  {step}
                </span>
              )}
              <span
                className="text-[12px] font-semibold whitespace-nowrap"
                style={{ color: isDone || isActive ? "var(--pl-ink)" : "var(--pl-ink-faint)" }}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <div
                className="flex-1 h-[2px] mx-2 mb-5"
                style={{ background: isDone ? "var(--pl-primary)" : "var(--pl-surface)" }}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
