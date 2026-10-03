import { describe, expect, it } from 'vitest';
import { formatLocation, parseLocationInput, toApiQuery } from './location';

describe('parseLocationInput', () => {
  it('accepts a city and a country name', () => {
    expect(parseLocationInput({ city: ' Tokyo ', country: 'Japan' })).toEqual({
      ok: true,
      query: { city: 'Tokyo', countryCode: 'JP' },
    });
  });

  it('accepts a city on its own', () => {
    expect(parseLocationInput({ city: 'Seoul', country: '' })).toEqual({
      ok: true,
      query: { city: 'Seoul', countryCode: '' },
    });
  });

  it('accepts a country on its own', () => {
    expect(parseLocationInput({ city: '', country: 'sg' })).toEqual({
      ok: true,
      query: { city: '', countryCode: 'SG' },
    });
  });

  it('rejects an empty search (including whitespace only)', () => {
    expect(parseLocationInput({ city: '   ', country: ' ' })).toEqual({
      ok: false,
      error: 'Please enter a city or a country.',
    });
  });

  it('rejects an unknown country with a helpful message', () => {
    const result = parseLocationInput({ city: 'Paris', country: 'Atlantis' });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/"Atlantis" is not a recognised country/);
  });
});

describe('toApiQuery', () => {
  it('joins city and country code', () => {
    expect(toApiQuery({ city: 'Tokyo', countryCode: 'JP' })).toBe('Tokyo,JP');
  });

  it('uses only the city when no country is given', () => {
    expect(toApiQuery({ city: 'Tokyo', countryCode: '' })).toBe('Tokyo');
  });

  it('uses the country name for a country-only search', () => {
    expect(toApiQuery({ city: '', countryCode: 'SG' })).toBe('Singapore');
  });
});

describe('formatLocation', () => {
  it('formats "City, CC"', () => {
    expect(formatLocation('Johor', 'MY')).toBe('Johor, MY');
  });

  it('omits a missing country code', () => {
    expect(formatLocation('Johor', '')).toBe('Johor');
  });
});
