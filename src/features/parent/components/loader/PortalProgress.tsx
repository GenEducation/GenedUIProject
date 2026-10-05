"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * In-portal loading: sections that are fetching register themselves with
 * `usePortalBusy(flag)`, and a thin progress line under the top bar shows
 * while any of them are. No full-screen interruptions once inside the portal.
 */

const RegisterContext = createContext<(() => () => void) | null>(null);
const CountContext = createContext(0);

export function PortalBusyProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const register = useCallback(() => {
    setCount((c) => c + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setCount((c) => c - 1);
    };
  }, []);
  return (
    <RegisterContext.Provider value={register}>
      <CountContext.Provider value={count}>{children}</CountContext.Provider>
    </RegisterContext.Provider>
  );
}

/** Marks the calling section as loading while `busy` is true. No-op outside the portal. */
export function usePortalBusy(busy: boolean) {
  const register = useContext(RegisterContext);
  useEffect(() => {
    if (!busy || !register) return;
    return register();
  }, [busy, register]);
}

const SHOW_AFTER_MS = 150;

/** The 2px mint→citron line under the portal's top bar. */
export function PortalProgressBar() {
  const count = useContext(CountContext);
  const [phase, setPhase] = useState<"idle" | "active" | "done">("idle");

  useEffect(() => {
    if (count > 0) {
      if (phase === "active") return;
      // Don't flash for loads that finish almost at once.
      const t = setTimeout(() => setPhase("active"), phase === "done" ? 0 : SHOW_AFTER_MS);
      return () => clearTimeout(t);
    }
    if (phase === "active") {
      setPhase("done");
      return;
    }
    if (phase === "done") {
      const t = setTimeout(() => setPhase("idle"), 450);
      return () => clearTimeout(t);
    }
  }, [count, phase]);

  const style = useMemo<React.CSSProperties>(() => {
    if (phase === "active") return { width: "78%", opacity: 1, transition: "width 2.4s cubic-bezier(0.1,0.7,0.2,1), opacity 0.2s" };
    if (phase === "done") return { width: "100%", opacity: 0, transition: "width 0.25s ease-out, opacity 0.3s 0.15s" };
    return { width: "0%", opacity: 0, transition: "none" };
  }, [phase]);

  return (
    <div
      role="progressbar"
      aria-label="Loading"
      aria-hidden={phase === "idle"}
      aria-busy={phase === "active"}
      className="pointer-events-none relative h-[2px] w-full overflow-hidden"
    >
      <div className="relative h-full overflow-hidden rounded-full bg-[linear-gradient(90deg,#16A36B,#9FE3C4,#C9E15A)]" style={style}>
        <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.85),transparent)] motion-safe:animate-[shimmer_1.2s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}
