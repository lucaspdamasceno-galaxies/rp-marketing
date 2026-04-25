"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";

type State<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

export function useApi<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
): State<T> & { refetch: () => void } {
  const [state, setState] = useState<State<T>>({
    data: null,
    error: null,
    loading: true,
  });
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setState({ data: null, error: null, loading: true });
    fetcherRef
      .current(controller.signal)
      .then((data) => {
        if (cancelled) return;
        setState({ data, error: null, loading: false });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.name === "AbortError") return;
        const message =
          err instanceof ApiError ? err.message : "Erro ao carregar dados";
        setState({ data: null, error: message, loading: false });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { ...state, refetch: () => setTick((t) => t + 1) };
}
