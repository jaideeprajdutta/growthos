"use client";

import { useEffect, useRef, useState } from "react";

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches with `fetcher` and reports `{ data, loading, error }`.
 * Pass a stable `key` that changes when new data is needed (e.g. companyId);
 * the latest `fetcher` is read through a ref that is updated in an effect.
 */
export function useApi<T>(fetcher: (() => Promise<T>) | null, key: string): UseApiResult<T> {
  const [result, setResult] = useState<{ key: string; done: boolean; data: T | null; error: string | null }>({
    key,
    done: false,
    data: null,
    error: null,
  });
  const fetcherRef = useRef<(() => Promise<T>) | null>(null);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let cancelled = false;
    const run = fetcherRef.current;
    if (!run) return;
    run()
      .then((data) => {
        if (!cancelled) setResult({ key, done: true, data, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setResult({ key, done: true, data: null, error: err?.message ?? "Request failed." });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (result.key !== key) {
    return { data: null, loading: true, error: null };
  }
  return { data: result.data, loading: !result.done, error: result.error };
}
