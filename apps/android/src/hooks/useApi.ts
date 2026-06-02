/**
 * Generic data-fetching hook.
 *
 * Wraps any async service call with loading / error / data states
 * and a manual refetch capability. Handles AbortController cleanup on unmount.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi(
 *     () => studentService.fetchStudentStreak(studentId),
 *     [studentId]
 *   );
 */
import { useReducer, useEffect, useCallback, useRef } from "react";

type State<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

type Action<T> =
  | { type: "FETCH" }
  | { type: "SUCCESS"; data: T }
  | { type: "ERROR"; error: Error };

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case "FETCH":   return { status: "loading" };
    case "SUCCESS": return { status: "success", data: action.data };
    case "ERROR":   return { status: "error", error: action.error };
    default:        return state;
  }
}

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useApi<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[] = []
): UseApiResult<T> {
  const [state, dispatch] = useReducer(reducer as (s: State<T>, a: Action<T>) => State<T>, {
    status: "idle",
  });

  // Increment to force a refetch
  const refetchCountRef = useRef(0);
  const [refetchTick, setRefetchTick] = useReducer((n: number) => n + 1, 0);

  const refetch = useCallback(() => {
    refetchCountRef.current += 1;
    setRefetchTick();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    dispatch({ type: "FETCH" });

    fetcher(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          dispatch({ type: "SUCCESS", data });
        }
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) {
          dispatch({ type: "ERROR", error: err });
        }
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refetchTick]);

  return {
    data:    state.status === "success" ? state.data : null,
    loading: state.status === "loading" || state.status === "idle",
    error:   state.status === "error"   ? state.error : null,
    refetch,
  };
}
