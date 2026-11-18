"use client";

import { useId, useState } from "react";

interface FaqProps {
  items: readonly { q: string; a: string }[];
}

/**
 * The FAQ as a stack of index cards: each question is a card's tab, and the
 * open card rises out of the stack. One open at a time; a plain accessible
 * disclosure underneath (button + aria-expanded/aria-controls).
 */
export function Faq({ items }: FaqProps) {
  const [open, setOpen] = useState(0);
  const base = useId();
  return (
    <ol className="zv-faq">
      {items.map((item, i) => {
        const isOpen = open === i;
        const panelId = `${base}-panel-${i}`;
        const buttonId = `${base}-q-${i}`;
        return (
          <li key={item.q} className={`zv-faq__card${isOpen ? " is-open" : ""}`} style={{ ["--i" as string]: i }}>
            <h3 className="zv-faq__q">
              {/* eslint-disable-next-line no-restricted-syntax -- the Zoovi marketing pages carry their own paper-and-ink button styles, not the app's */}
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? -1 : i)}
              >
                <span className="zv-faq__num" aria-hidden="true">Q{i + 1}</span>
                <span className="zv-faq__text">{item.q}</span>
                <span className="zv-faq__toggle" aria-hidden="true" />
              </button>
            </h3>
            <div className="zv-faq__panel" id={panelId} role="region" aria-labelledby={buttonId} hidden={!isOpen}>
              <p>{item.a}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
