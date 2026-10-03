/** A point on the map, as used by OpenWeather. */
export interface Coordinates {
  lat: number;
  lon: number;
}

/** A validated location ready to be sent to the weather API. */
export interface LocationQuery {
  /** City name (required). */
  city: string;
  /** ISO 3166-1 alpha-2 country code (e.g. "SG"), or empty when not provided. */
  countryCode: string;
  /**
   * The exact place, when already known (a picked suggestion or a history entry).
   * Without it, the city is looked up by name.
   */
  coordinates?: Coordinates;
  /**
   * Set when a whole country was searched ("Japan"), to the name typed: `city` is
   * then the country's capital. If OpenWeather doesn't know the capital (e.g. Hong
   * Kong's "City of Victoria"), the country's own name is tried as a place instead.
   */
  countryName?: string;
}

/** Weather data shaped for the UI (decoupled from the raw API response). */
export interface WeatherReport {
  city: string;
  countryCode: string;
  /** Weather group, e.g. "Clouds". */
  condition: string;
  /** Detailed description, e.g. "scattered clouds". */
  description: string;
  /** OpenWeather icon code, e.g. "03d". */
  iconCode: string;
  /** Temperatures in °C. */
  temperature: number;
  temperatureMin: number;
  temperatureMax: number;
  /** Relative humidity in %. */
  humidity: number;
  /** ISO timestamp of when the user retrieved this report. */
  retrievedAt: string;
  /** Where the weather was taken, so "search again" finds the same place. Not set in demo mode. */
  coordinates?: Coordinates;
}

/** One row in the persisted search history. */
export interface SearchHistoryEntry {
  /** Stable id derived from the location, so the same place is never listed twice. */
  id: string;
  city: string;
  countryCode: string;
  /** ISO timestamp of the latest search for this location. */
  searchedAt: string;
  /** Missing for entries saved by older versions of the app and in demo mode. */
  coordinates?: Coordinates;
}

/** A place suggested while the user types a city name. */
export interface CitySuggestion {
  /** Unique per place: name + state + country. */
  id: string;
  city: string;
  /** State / province, e.g. "Johor". Empty when the API has none. */
  state: string;
  countryCode: string;
  /** Picking the suggestion searches this exact point. Not set in demo mode. */
  coordinates?: Coordinates;
  /** Shown instead of the state, e.g. "Capital of Japan" when "Japan" was typed. */
  note?: string;
}
