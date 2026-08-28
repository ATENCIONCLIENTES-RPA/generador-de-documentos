import { useEffect, useState } from 'react';

/**
 * Debounces a value by `delay` ms (default 300).
 * Used for search input to avoid filtering on every keystroke.
 */
export function useDebouncedSearch<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

export default useDebouncedSearch;
