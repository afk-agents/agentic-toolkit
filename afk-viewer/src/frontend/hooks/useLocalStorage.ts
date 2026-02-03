import { useState, useCallback, useEffect } from "react";

/**
 * Get a stored value from localStorage with type safety.
 * Returns the fallback if the key doesn't exist or the stored value is invalid JSON.
 */
export function getStoredValue<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return fallback;
    }
    return JSON.parse(item) as T;
  } catch {
    // Return fallback if JSON parsing fails
    return fallback;
  }
}

/**
 * Store a value in localStorage as JSON.
 */
export function setStoredValue<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * React hook for persisting state to localStorage.
 * Reads initial value from localStorage (or uses default) and
 * persists updates automatically.
 *
 * @param key - The localStorage key to use
 * @param initialValue - The initial/default value if nothing is stored
 * @returns A tuple of [currentValue, setValue] similar to useState
 *
 * @example
 * ```tsx
 * const [pinnedProjects, setPinnedProjects] = useLocalStorage<string[]>(
 *   'pinnedProjects',
 *   []
 * );
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize state with stored value or initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    return getStoredValue(key, initialValue);
  });

  // Create a setter that also persists to localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;
        // Persist to localStorage
        try {
          localStorage.setItem(key, JSON.stringify(newValue));
        } catch (error) {
          console.error(`Failed to save to localStorage key "${key}":`, error);
        }
        return newValue;
      });
    },
    [key]
  );

  // Sync with other tabs/windows via storage event
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue) as T);
        } catch {
          // Ignore invalid JSON from other sources
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}

export default useLocalStorage;
