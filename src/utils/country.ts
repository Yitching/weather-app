import { countries, type TCountryCode } from 'countries-list';

/**
 * Turns the country part of a search ("Osaka, Japan") — a full name such as
 * "Singapore", a common alias such as "UK", or an ISO code such as "SG" — into
 * the ISO 3166-1 alpha-2 code expected by the OpenWeather API.
 *
 * Country names come from the browser's built-in `Intl.DisplayNames`, so no
 * country list has to be bundled or maintained by hand.
 */

const regionNames = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });

/** Region codes that Intl knows about but which are not countries. */
const NON_COUNTRY_CODES = new Set(['EU', 'EZ', 'UN', 'QO', 'XA', 'XB', 'ZZ']);

/** Everyday names that differ from the official English region names. */
const COUNTRY_ALIASES: Record<string, string> = {
  usa: 'US',
  america: 'US',
  'united states of america': 'US',
  uk: 'GB',
  britain: 'GB',
  'great britain': 'GB',
  england: 'GB',
  korea: 'KR',
  'republic of korea': 'KR',
  uae: 'AE',
  'czech republic': 'CZ',
  holland: 'NL',
};

/** Lower-cases, trims, removes accents and collapses spaces: " Côte  d'Ivoire " → "cote d'ivoire". */
export function normaliseName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // "ô" → "o"
    .replace(/[\u2018\u2019]/g, "'") // curly → straight apostrophe
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Returns the canonical code ("UK" → "GB"), or null if `code` is not a known country. */
function toCanonicalCountryCode(code: string): string | null {
  const upperCode = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upperCode) || NON_COUNTRY_CODES.has(upperCode)) return null;
  if (!regionNames.of(upperCode)) return null;
  return new Intl.Locale(`und-${upperCode}`).region ?? null;
}

/** Name variants a user might type, e.g. "Myanmar (Burma)" → also "Myanmar". */
function getNameVariants(officialName: string): string[] {
  const withoutBrackets = officialName.replace(/\s*\(.*\)/, '');
  const withoutSar = officialName.replace(/\s+SAR China$/, '');
  const withAnd = officialName.replace(/&/g, 'and');
  return [officialName, withoutBrackets, withoutSar, withAnd];
}

let nameToCodeCache: Map<string, string> | null = null;

/** Builds (once) a lookup of every country's normalised names and aliases → ISO code. */
function getNameToCodeMap(): Map<string, string> {
  if (nameToCodeCache) return nameToCodeCache;

  const map = new Map<string, string>();
  const A = 'A'.charCodeAt(0);
  for (let first = 0; first < 26; first++) {
    for (let second = 0; second < 26; second++) {
      const code = String.fromCharCode(A + first, A + second);
      // Skip deprecated aliases (e.g. "UK"); the canonical code is added on its own turn.
      if (toCanonicalCountryCode(code) !== code) continue;
      const name = regionNames.of(code);
      if (!name) continue;
      for (const variant of getNameVariants(name)) {
        map.set(normaliseName(variant), code);
      }
    }
  }
  for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) {
    map.set(alias, code);
  }

  nameToCodeCache = map;
  return map;
}

/**
 * Resolves a country name or alias ("Japan", "UK"), but not a bare ISO code, to an
 * ISO alpha-2 code. Used when the text could also be a city ("JP" is not a country
 * search; "UK" is).
 */
export function resolveCountryName(input: string): string | null {
  return getNameToCodeMap().get(normaliseName(input)) ?? null;
}

/**
 * Resolves a country name, alias or ISO code to an ISO alpha-2 code.
 * @returns the code (e.g. "SG"), or null when the input is not a recognised country.
 */
export function resolveCountryCode(input: string): string | null {
  const normalised = normaliseName(input);
  if (!normalised) return null;

  const byName = getNameToCodeMap().get(normalised);
  if (byName) return byName;

  return normalised.length === 2 ? toCanonicalCountryCode(normalised) : null;
}

/**
 * The country's capital in English ("JP" → "Tokyo"), used when someone searches
 * for a whole country. From the open-source `countries-list` package, so no
 * capitals are maintained here. Null when there is none (e.g. Antarctica).
 */
export function getCapital(countryCode: string): string | null {
  return countries[countryCode.toUpperCase() as TCountryCode]?.capital || null;
}

/** "SG" → "Singapore". Falls back to the code itself if it is unknown. */
export function getCountryName(countryCode: string): string {
  return regionNames.of(countryCode.toUpperCase()) ?? countryCode;
}
