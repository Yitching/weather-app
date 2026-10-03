import { describe, expect, it } from 'vitest';
import { getCountryName, normaliseName, resolveCountryCode, resolveCountryName } from './country';

describe('resolveCountryCode', () => {
  it.each([
    ['Singapore', 'SG'],
    ['malaysia', 'MY'],
    ['  JAPAN  ', 'JP'],
    ['South Korea', 'KR'],
    ['United States', 'US'],
    ['Hong Kong', 'HK'],
    ['Myanmar', 'MM'],
    ["Côte d'Ivoire", 'CI'],
    ["cote d'ivoire", 'CI'],
  ])('resolves the country name "%s" to %s', (input, expected) => {
    expect(resolveCountryCode(input)).toBe(expected);
  });

  it.each([
    ['UK', 'GB'],
    ['usa', 'US'],
    ['Korea', 'KR'],
    ['UAE', 'AE'],
  ])('resolves the common alias "%s" to %s', (input, expected) => {
    expect(resolveCountryCode(input)).toBe(expected);
  });

  it.each([
    ['sg', 'SG'],
    ['JP', 'JP'],
    ['my', 'MY'],
  ])('accepts the ISO code "%s"', (input, expected) => {
    expect(resolveCountryCode(input)).toBe(expected);
  });

  it.each(['', '   ', 'Narnia', 'xx', 'ZZ', 'EU', 'Singapore123'])(
    'returns null for the unknown country "%s"',
    (input) => {
      expect(resolveCountryCode(input)).toBeNull();
    },
  );
});

describe('resolveCountryName', () => {
  it('accepts names and aliases, but not bare codes', () => {
    expect(resolveCountryName('South Korea')).toBe('KR');
    expect(resolveCountryName('uk')).toBe('GB');
    expect(resolveCountryName('JP')).toBeNull();
  });
});

describe('getCountryName', () => {
  it('returns the English name for a code', () => {
    expect(getCountryName('SG')).toBe('Singapore');
    expect(getCountryName('jp')).toBe('Japan');
  });

  it('falls back to the code itself when unknown', () => {
    expect(getCountryName('QQ')).toBe('QQ');
  });
});

describe('normaliseName', () => {
  it('trims, lower-cases, removes accents and collapses spaces', () => {
    expect(normaliseName('  Côte   D’Ivoire ')).toBe("cote d'ivoire");
  });
});
