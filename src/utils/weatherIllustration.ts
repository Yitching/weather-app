import cloudImage from '../../assets/cloud.png';
import sunImage from '../../assets/sun.png';

/** OpenWeather icon groups where the sun shows: clear sky, few clouds, sun showers. */
const SUNNY_ICON_GROUPS = new Set(['01', '02', '10']);

/**
 * Picks the app's own illustration for an OpenWeather icon code (e.g. "03d"):
 * the sun for clear-ish weather, the cloud for everything else.
 */
export function getWeatherIllustration(iconCode: string): string {
  return SUNNY_ICON_GROUPS.has(iconCode.slice(0, 2)) ? sunImage : cloudImage;
}
