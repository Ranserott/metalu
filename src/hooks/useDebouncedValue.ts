"use client";

import { useEffect, useState } from "react";

/**
 * Returns a debounced version of `value` that only updates after
 * `delayMs` of inactivity. Cancels pending timer on unmount.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 250): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
