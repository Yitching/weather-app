import clearDayImage from '../../assets/clear-day.png';
import clearNightImage from '../../assets/clear-night.png';
import rainImage from '../../assets/cloud.png';
import cloudyImage from '../../assets/cloudy.png';
import mistImage from '../../assets/mist.png';
import partlyCloudyDayImage from '../../assets/partly-cloudy-day.png';
import partlyCloudyNightImage from '../../assets/partly-cloudy-night.png';
import snowImage from '../../assets/snow.png';
import sunShowerImage from '../../assets/sun.png';
import thunderstormImage from '../../assets/thunderstorms.png';

/** The kinds of weather the app draws, from OpenWeather's icon groups. */
export type WeatherKind =
  'clear' | 'partly-cloudy' | 'cloudy' | 'drizzle' | 'rain' | 'thunderstorm' | 'snow' | 'mist';

/** OpenWeather icon group (first two characters of e.g. "03d") → weather kind. */
const KIND_BY_ICON_GROUP: Record<string, WeatherKind> = {
  '01': 'clear',
  '02': 'partly-cloudy',
  '03': 'cloudy',
  '04': 'cloudy',
  '09': 'drizzle',
  '10': 'rain',
  '11': 'thunderstorm',
  '13': 'snow',
  '50': 'mist',
};

export function getWeatherKind(iconCode: string): WeatherKind {
  return KIND_BY_ICON_GROUP[iconCode.slice(0, 2)] ?? 'cloudy';
}

/** OpenWeather icon codes end in "n" at night, e.g. "01n". */
export function isNight(iconCode: string): boolean {
  return iconCode.endsWith('n');
}

/**
 * The app's own illustration for each kind of weather. Kinds without a `night`
 * image use the day one at night too.
 */
const ILLUSTRATIONS: Record<WeatherKind, { day: string; night?: string }> = {
  clear: { day: clearDayImage, night: clearNightImage },
  'partly-cloudy': { day: partlyCloudyDayImage, night: partlyCloudyNightImage },
  cloudy: { day: cloudyImage },
  drizzle: { day: rainImage },
  rain: { day: sunShowerImage, night: rainImage },
  thunderstorm: { day: thunderstormImage },
  snow: { day: snowImage },
  mist: { day: mistImage },
};

/** Picks the illustration for an OpenWeather icon code (e.g. "03d"). */
export function getWeatherIllustration(iconCode: string): string {
  const art = ILLUSTRATIONS[getWeatherKind(iconCode)];
  return (isNight(iconCode) && art.night) || art.day;
}

/**
 * The sky mood for the page background: `night` for any night-time code,
 * except storms which stay `storm`.
 */
export type Sky = 'clear' | 'clouds' | 'rain' | 'storm' | 'snow' | 'mist' | 'night';

const SKY_BY_KIND: Record<WeatherKind, Sky> = {
  clear: 'clear',
  'partly-cloudy': 'clear',
  cloudy: 'clouds',
  drizzle: 'rain',
  rain: 'rain',
  thunderstorm: 'storm',
  snow: 'snow',
  mist: 'mist',
};

export function getSky(iconCode: string): Sky {
  const sky = SKY_BY_KIND[getWeatherKind(iconCode)];
  return isNight(iconCode) && sky !== 'storm' ? 'night' : sky;
}
