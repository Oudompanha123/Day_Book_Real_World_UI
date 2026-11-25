"use client";

import { useEffect, useState, type DependencyList } from "react";

/** Loads data when deps change. Keeps the previous data while reloading, so lists don't flicker. */
export function useData<T>(load: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<{ data: T | null; error: unknown; loading: boolean }>({
    data: null, error: null, loading: true,
  });

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    load().then(
      (data) => { if (live) setState({ data, error: null, loading: false }); },
      (error) => { if (live) setState((s) => ({ data: s.data, error, loading: false })); },
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
