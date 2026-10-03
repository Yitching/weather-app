import { describe, expect, it } from 'vitest';
import { formatLocation, getSuggestionQuery, parseLocationInput, toApiQuery } from './location';

describe('parseLocationInput', () => {
  it.each([
    [' Osaka ', { city: 'Osaka', countryCode: '' }],
    ['Osaka, Japan', { city: 'Osaka', countryCode: 'JP' }],
    ['osaka,jp', { city: 'osaka', countryCode: 'JP' }],
    ['London, UK', { city: 'London', countryCode: 'GB' }],
    ['Tokyo,', { city: 'Tokyo', countryCode: '' }],
    // As filled in from a suggestion that shows a state: the state is ignored.
    ['London, Ontario, Canada', { city: 'London', countryCode: 'CA' }],
  ])('reads "%s"', (text, query) => {
    expect(parseLocationInput(text)).toEqual({ ok: true, query });
  });

  it('keeps a city that shares its name with its country when a country is given', () => {
    expect(parseLocationInput('Singapore, SG')).toEqual({
      ok: true,
      query: { city: 'Singapore', countryCode: 'SG' },
    });
  });

  it.each(['', '   ', ',', ' , '])('asks for a city or country when the text is "%s"', (text) => {
    expect(parseLocationInput(text)).toEqual({
      ok: false,
      error: 'Please enter a city or a country, e.g. "Osaka" or "Japan".',
    });
  });

  it.each([
    ['Japan', { city: 'Tokyo', countryCode: 'JP', countryName: 'Japan' }],
    ['south korea', { city: 'Seoul', countryCode: 'KR', countryName: 'south korea' }],
    ['USA', { city: 'Washington D.C.', countryCode: 'US', countryName: 'USA' }],
    ['UK', { city: 'London', countryCode: 'GB', countryName: 'UK' }],
    ['Singapore', { city: 'Singapore', countryCode: 'SG', countryName: 'Singapore' }],
    ['Japan,', { city: 'Tokyo', countryCode: 'JP', countryName: 'Japan' }],
    [', Japan', { city: 'Tokyo', countryCode: 'JP', countryName: 'Japan' }],
  ])('searches the capital when only a country is given ("%s")', (text, query) => {
    expect(parseLocationInput(text)).toEqual({ ok: true, query });
  });

  it("searches the country's own name when it has no capital", () => {
    expect(parseLocationInput('Antarctica')).toEqual({
      ok: true,
      query: { city: 'Antarctica', countryCode: 'AQ', countryName: 'Antarctica' },
    });
  });

  it('does not treat a 2-letter city as a country code', () => {
    expect(parseLocationInput('Ur')).toEqual({ ok: true, query: { city: 'Ur', countryCode: '' } });
  });

  it('rejects an unknown country with a helpful message', () => {
    const result = parseLocationInput('Paris, Atlantis');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/"Atlantis" is not a recognised country/);
  });

  it('asks for a city when there is none and the country is unknown', () => {
    expect(parseLocationInput(', Atlantis')).toMatchObject({ ok: false, error: /enter a city/ });
  });
});

describe('getSuggestionQuery', () => {
  it.each([
    ['Os', { city: 'Os', countryCode: '' }],
    ['Os, Japan', { city: 'Os', countryCode: 'JP' }],
    // A half-typed country is ignored, so the suggestions don't disappear meanwhile.
    ['Os, Jap', { city: 'Os', countryCode: '' }],
    ['London, Ontario, CA', { city: 'London', countryCode: 'CA' }],
    ['Japan', { city: 'Tokyo', countryCode: 'JP', countryName: 'Japan' }],
  ])('looks up "%s" as %o', (text, query) => {
    expect(getSuggestionQuery(text)).toEqual(query);
  });
});

describe('toApiQuery', () => {
  it('joins city and country code', () => {
    expect(toApiQuery({ city: 'Tokyo', countryCode: 'JP' })).toBe('Tokyo,JP');
  });

  it('uses only the city when no country is given', () => {
    expect(toApiQuery({ city: 'Tokyo', countryCode: '' })).toBe('Tokyo');
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
