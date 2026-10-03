/**
 * Small, safe wrappers around localStorage. Storage can be unavailable
 * (private mode, quota exceeded) or contain corrupted data, so every access is
 * guarded and falls back gracefully instead of crashing the app.
 */

export function readFromStorage<T>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeToStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is full or blocked: the app keeps working, the value just isn't persisted.
  }
}
