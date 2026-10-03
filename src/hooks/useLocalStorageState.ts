import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { readFromStorage, writeToStorage } from '../utils/storage';

/**
 * Like `useState`, but the value is loaded from and saved to localStorage so it
 * survives a page refresh. `isValid` protects against corrupted or outdated data.
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T | (() => T),
  isValid: (value: unknown) => value is T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const fallback = initialValue instanceof Function ? initialValue() : initialValue;
    return readFromStorage(key, fallback, isValid);
  });

  useEffect(() => {
    writeToStorage(key, value);
  }, [key, value]);

  return [value, setValue];
}
