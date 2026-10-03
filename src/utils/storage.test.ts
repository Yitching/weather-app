import { describe, expect, it, vi } from 'vitest';
import { readFromStorage, writeToStorage } from './storage';

const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'number');

describe('storage helpers', () => {
  it('writes and reads JSON values', () => {
    writeToStorage('numbers', [1, 2, 3]);
    expect(readFromStorage('numbers', [], isNumberArray)).toEqual([1, 2, 3]);
  });

  it('returns the fallback when nothing is stored', () => {
    expect(readFromStorage('missing', [9], isNumberArray)).toEqual([9]);
  });

  it('returns the fallback for corrupted JSON', () => {
    window.localStorage.setItem('numbers', '{not json');
    expect(readFromStorage('numbers', [], isNumberArray)).toEqual([]);
  });

  it('returns the fallback when stored data has the wrong shape', () => {
    window.localStorage.setItem('numbers', JSON.stringify(['a', 'b']));
    expect(readFromStorage('numbers', [], isNumberArray)).toEqual([]);
  });

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => writeToStorage('numbers', [1])).not.toThrow();
    expect(readFromStorage('numbers', [], isNumberArray)).toEqual([]);
  });
});
