import { describe, expect, it } from 'vitest';
import { getCountryName, normaliseName, resolveCountryCode, searchCountries } from './country';

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

describe('searchCountries', () => {
  const names = (input: string) => searchCountries(input).map((country) => country.name);

  it('returns countries whose name starts with the text', () => {
    expect(names('sing')).toEqual(['Singapore']);
    expect(names('ma')).toEqual(expect.arrayContaining(['Malaysia', 'Madagascar', 'Maldives']));
  });

  it('also matches later words in the name', () => {
    expect(names('korea')).toEqual(['South Korea', 'North Korea']);
  });

  it('puts an exact name, alias or code match first', () => {
    expect(searchCountries('uk')[0]).toEqual({ code: 'GB', name: 'United Kingdom' });
    expect(searchCountries('jp')[0]).toEqual({ code: 'JP', name: 'Japan' });
  });

  it('ignores case and accents', () => {
    expect(names('CÔTE')).toEqual(['Côte d’Ivoire']);
  });

  it('limits the number of results', () => {
    expect(searchCountries('a')).toHaveLength(6);
    expect(searchCountries('a', 3)).toHaveLength(3);
  });

  it('returns nothing for empty or unmatched text', () => {
    expect(searchCountries('  ')).toEqual([]);
    expect(searchCountries('narnia')).toEqual([]);
  });
});
