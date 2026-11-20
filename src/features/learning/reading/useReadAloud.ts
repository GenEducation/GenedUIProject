"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { browserReadAloudDeps, ReadAloudSession, type ReadAloudDeps, type ReadAloudState } from "./readAloud";

const IDLE: ReadAloudState = { phase: "idle", heard: "", problem: null };

export interface ReadAloud {
  state: ReadAloudState;
  start: () => void;
  finish: () => void;
  cancel: () => void;
}

/** One read-aloud practice for one part of a passage; leaving the part or the lesson closes the microphone and the socket. */
export function useReadAloud(
  instanceId: string | null,
  passageId: string,
  segment: number,
  deps: ReadAloudDeps = browserReadAloudDeps,
): ReadAloud {
  const [state, setState] = useState<ReadAloudState>(IDLE);
  const session = useRef<ReadAloudSession | null>(null);

  useEffect(() => {
    const mine = new ReadAloudSession(deps, setState);
    session.current = mine;
    return () => {
      mine.cancel();
      session.current = null;
    };
  }, [deps, instanceId, passageId, segment]);

  const start = useCallback(() => {
    if (instanceId) session.current?.start({ instanceId, passageId, segment });
  }, [instanceId, passageId, segment]);

  return { state, start, finish: () => session.current?.finish(), cancel: () => session.current?.cancel() };
}
