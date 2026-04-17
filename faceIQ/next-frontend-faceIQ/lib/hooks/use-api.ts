"use client";

import { useState, useEffect, useCallback } from "react";

interface UseApiOptions<T> {
  initialData?: T;
  dependencies?: unknown[];
  skip?: boolean;
}

interface UseApiResult<T> {
  data: T | undefined;
  error: Error | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const { initialData, dependencies = [], skip = false } = options;
  
  const [data, setData] = useState<T | undefined>(initialData);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(!skip);

  const fetchData = useCallback(async () => {
    if (skip) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [fetcher, skip]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, skip]);

  return { data, error, loading, refetch: fetchData };
}

// Auto-refresh hook for polling data
export function usePollingApi<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const result = useApi(fetcher, options);

  useEffect(() => {
    if (options.skip) return;
    
    const interval = setInterval(() => {
      result.refetch();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs, options.skip, result]);

  return result;
}

