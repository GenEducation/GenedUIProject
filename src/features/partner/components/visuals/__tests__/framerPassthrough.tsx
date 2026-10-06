import React from "react";

/**
 * `vi.mock("framer-motion", () => framerPassthrough())`: motion.* render as
 * plain elements and AnimatePresence renders its children at once, so tests
 * don't wait on exit animations between the list and detail screens.
 */
export function framerPassthrough() {
  const cache = new Map<string, React.ComponentType>();
  const ANIMATION_PROPS = ["initial", "animate", "exit", "transition", "whileHover", "whileTap", "layout", "variants"];
  const make = (tag: string) => {
    if (!cache.has(tag)) {
      const C = React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
        const rest = Object.fromEntries(Object.entries(props).filter(([k]) => !ANIMATION_PROPS.includes(k)));
        return React.createElement(tag, { ...rest, ref });
      });
      C.displayName = `motion.${tag}`;
      cache.set(tag, C as unknown as React.ComponentType);
    }
    return cache.get(tag)!;
  };
  return {
    motion: new Proxy({}, { get: (_t, tag: string) => make(tag) }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
}
