"use client";

/**
 * The keys a keyboard doesn't have, for the answer box's calculator: roots, powers, π, logs, trig, factorial and
 * percent. Each key types its symbol where the cursor is (a function opens its bracket), and the answer box
 * works the result out as usual.
 */
const KEYS: { label: string; insert: string; name: string }[] = [
  { label: "(", insert: "(", name: "open bracket" },
  { label: ")", insert: ")", name: "close bracket" },
  { label: "x²", insert: "²", name: "squared" },
  { label: "xʸ", insert: "^", name: "to the power of" },
  { label: "√", insert: "√", name: "square root" },
  { label: "∛", insert: "∛", name: "cube root" },
  { label: "π", insert: "π", name: "pi" },
  { label: "n!", insert: "!", name: "factorial" },
  { label: "%", insert: "%", name: "percent" },
  { label: "×", insert: "×", name: "times" },
  { label: "÷", insert: "÷", name: "divided by" },
  { label: "log", insert: "log(", name: "log, base 10" },
  { label: "ln", insert: "ln(", name: "natural log" },
  { label: "sin", insert: "sin(", name: "sine" },
  { label: "cos", insert: "cos(", name: "cosine" },
  { label: "tan", insert: "tan(", name: "tangent" },
];

export function CalculatorKeys({ id, onKey }: { id: string; onKey: (insert: string) => void }) {
  return (
    <div id={id} role="group" aria-label="Calculator keys" className="mt-3">
      {/* Two rows of eight: sixteen keys in one row squeeze to nothing in a card this narrow. */}
      <div className="grid grid-cols-8 gap-1.5">
        {KEYS.map((key) => (
          // eslint-disable-next-line no-restricted-syntax -- a calculator key: a compact sketch tile, not an action button.
          <button
            key={key.label}
            type="button"
            aria-label={key.name}
            title={key.name}
            // Keep the focus (and the cursor position) in the answer box.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onKey(key.insert)}
            className="lesson-sketch-sm lesson-hand grid h-9 place-items-center text-[17px] leading-none transition-colors hover:bg-[var(--ls-primary-soft)] active:bg-[var(--ls-accent)]"
          >
            {key.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11.5px] text-[var(--ls-ink-faint)]">Angles are in degrees · log is base 10</p>
    </div>
  );
}
