import { useEffect, useState } from 'react';

/** State that persists to localStorage (used for theme + preferences). */
export function useLocalStorage<T>(
  key: string,
  initial: T,
  options: { preferInitial?: boolean } = {},
) {
  const [value, setValue] = useState<T>(() => {
    if (options.preferInitial) return initial;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      const serialized = JSON.stringify(value);
      if (localStorage.getItem(key) !== serialized) {
        localStorage.setItem(key, serialized);
      }
    } catch {
      /* storage unavailable — ignore */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
