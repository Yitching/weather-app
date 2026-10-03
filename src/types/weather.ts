/** What the user typed into the search form. */
export interface SearchFormValues {
  city: string;
  country: string;
}

/** A validated location ready to be sent to the weather API. */
export interface LocationQuery {
  /** City name, may be empty when the user searches by country only. */
  city: string;
  /** ISO 3166-1 alpha-2 country code (e.g. "SG"), or empty when not provided. */
  countryCode: string;
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
}

/** One row in the persisted search history. */
export interface SearchHistoryEntry {
  /** Stable id derived from the location, so the same place is never listed twice. */
  id: string;
  city: string;
  countryCode: string;
  /** ISO timestamp of the latest search for this location. */
  searchedAt: string;
}

/** A place suggested while the user types a city name. */
export interface CitySuggestion {
  /** Unique per place: name + state + country. */
  id: string;
  city: string;
  /** State / province, e.g. "Johor". Empty when the API has none. */
  state: string;
  countryCode: string;
}

/** A country suggested while the user types in the Country field. */
export interface CountryOption {
  code: string;
  name: string;
}
